const express = require('express');
const cors = require('cors');
const axios = require('axios');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const proxyManager = require('./proxy-agent');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

// Enable CORS and JSON parsing
app.use(cors({
  origin: '*', // In production, you'd restrict this to your application domain
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(bodyParser.json());

// Initialize proxy if VLESS is enabled
async function initializeProxy() {
  if (process.env.VLESS_ENABLED === 'true') {
    console.log('[Server] VLESS proxy enabled, initializing...');
    try {
      const initialized = await proxyManager.initialize();
      if (initialized) {
        console.log('[Server] VLESS proxy initialized successfully');
      } else {
        console.error('[Server] VLESS proxy initialization failed');
      }
    } catch (error) {
      console.error('[Server] VLESS proxy initialization error:', error);
    }
  } else {
    console.log('[Server] VLESS proxy is disabled');
  }
}

// Simple health check endpoint
app.get('/', (req, res) => {
  const vlessStatus = process.env.VLESS_ENABLED === 'true' ? 
    (proxyManager.vlessClient?.isConnected ? 'connected' : 'disconnected') : 
    'disabled';
  
  res.status(200).send({ 
    status: 'ok', 
    message: 'ElevenLabs Proxy Server is running',
    proxy: {
      vless: vlessStatus
    }
  });
});

// Text-to-speech endpoint
app.post('/api/tts', async (req, res) => {
  try {
    // Validate required parameters
    const { text, apiKey } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Missing text parameter' });
    }
    if (!apiKey) {
      return res.status(400).json({ error: 'Missing API key' });
    }

    // Use provided voice ID or default to "Rachel"
    const voiceId = req.body.voiceId || "21m00Tcm4TlvDq8ikWAM";
    
    console.log(`[ElevenLabs Proxy] TTS request received for text: "${text.substring(0, 30)}..." (length: ${text.length})`);
    
    // Determine if we should use VLESS proxy
    const useVlessProxy = process.env.VLESS_ENABLED === 'true' && 
                         proxyManager.vlessClient && 
                         proxyManager.vlessClient.isConnected;
    
    console.log(`[ElevenLabs Proxy] Using VLESS proxy: ${useVlessProxy}`);
    
    let elevenLabsResponse;
    
    if (useVlessProxy) {
      // Make request via VLESS proxy
      console.log('[ElevenLabs Proxy] Making request through VLESS proxy');
      
      // Prepare request data
      const requestData = JSON.stringify({
        text: text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5
        }
      });
      
      // Convert to buffer for transport
      const requestDataBuffer = Buffer.from(requestData);
      
      // Create options for the proxied request
      const requestOptions = {
        protocol: 'https:',
        method: 'POST',
        hostname: 'api.elevenlabs.io',
        port: 443,
        path: `/v1/text-to-speech/${voiceId}/stream`,
        headers: {
          'Accept': 'audio/mpeg',
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Content-Length': requestDataBuffer.length
        },
        body: requestDataBuffer
      };
      
      // Make the request with fallback
      elevenLabsResponse = await proxyManager.makeRequestWithFallback(
        requestOptions,
        async () => {
          // Fallback to direct request if proxy fails
          console.log('[ElevenLabs Proxy] Falling back to direct API request');
          const directResponse = await axios({
            method: 'POST',
            url: `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
            headers: {
              'Accept': 'audio/mpeg',
              'xi-api-key': apiKey,
              'Content-Type': 'application/json'
            },
            data: {
              text: text,
              model_id: 'eleven_multilingual_v2',
              voice_settings: {
                stability: 0.5,
                similarity_boost: 0.5
              }
            },
            responseType: 'arraybuffer'
          });
          
          return {
            statusCode: directResponse.status,
            headers: directResponse.headers,
            body: directResponse.data
          };
        }
      );
    } else {
      // Make direct request to ElevenLabs API
      console.log('[ElevenLabs Proxy] Making direct request to ElevenLabs API');
      
      elevenLabsResponse = await axios({
        method: 'POST',
        url: `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
        headers: {
          'Accept': 'audio/mpeg',
          'xi-api-key': apiKey,
          'Content-Type': 'application/json'
        },
        data: {
          text: text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5
          }
        },
        responseType: 'arraybuffer'
      });
    }
    
    // Handle different response formats between axios and our proxy
    let responseStatus, responseData, responseHeaders;
    
    if (useVlessProxy) {
      // Extract data from our proxy response format
      responseStatus = elevenLabsResponse.statusCode;
      responseData = elevenLabsResponse.body;
      responseHeaders = elevenLabsResponse.headers;
      
      // Validate response data
      if (!responseData || !(responseData instanceof Buffer)) {
        throw new Error('Invalid response data received from proxy');
      }
      
      // Check if the response indicates an error
      if (responseStatus >= 400) {
        let errorMessage = 'Unknown error';
        
        // Try to parse error message if it's JSON or text
        if (responseData.length > 0) {
          try {
            // First try to parse as JSON
            const errorJson = JSON.parse(responseData.toString('utf8'));
            errorMessage = errorJson.detail || errorJson.message || errorJson.error || 'Unknown error';
          } catch (parseError) {
            // If not JSON, treat as text
            errorMessage = responseData.toString('utf8').substring(0, 500);
          }
        }
        
        throw {
          response: {
            status: responseStatus,
            data: errorMessage,
            headers: responseHeaders
          }
        };
      }
      
      // Check for redirect (302) which indicates geo-restriction
      if (responseStatus === 302) {
        const location = responseHeaders['location'] || responseHeaders['Location'];
        throw {
          response: {
            status: 403,
            data: {
              detail: 'Geo-restriction detected. The ElevenLabs API is not available in your region.',
              redirect_location: location
            }
          }
        };
      }
      
      // Check content type to ensure we got audio
      const contentType = responseHeaders['content-type'] || responseHeaders['Content-Type'] || '';
      if (!contentType.includes('audio')) {
        // If we didn't get audio, try to parse the response for error
        console.error('[ElevenLabs Proxy] Received non-audio response:', contentType);
        
        let errorMessage = 'Received non-audio response from ElevenLabs API';
        if (responseData.length > 0) {
          try {
            // Try to parse as JSON
            const responseJson = JSON.parse(responseData.toString('utf8'));
            errorMessage = responseJson.detail || responseJson.message || responseJson.error || errorMessage;
          } catch (parseError) {
            // If not JSON, log a small sample
            const sampleText = responseData.toString('utf8', 0, 200);
            console.error('[ElevenLabs Proxy] Response sample:', sampleText);
          }
        }
        
        throw {
          response: {
            status: responseStatus,
            data: {
              detail: errorMessage
            }
          }
        };
      }
    } else {
      // Extract data from axios response format
      responseStatus = elevenLabsResponse.status;
      responseData = elevenLabsResponse.data;
      responseHeaders = elevenLabsResponse.headers;
    }
    
    // Log the response details
    console.log(`[ElevenLabs Proxy] Response received: ${responseStatus}`);
    console.log(`[ElevenLabs Proxy] Content-Type: ${responseHeaders['content-type'] || 'audio/mpeg'}`);
    console.log(`[ElevenLabs Proxy] Content-Length: ${responseData.length} bytes`);
    
    // Validate response data
    if (!responseData || responseData.length === 0) {
      throw new Error('Empty response received from ElevenLabs API');
    }
    
    // Ensure we always return audio/mpeg content type for better browser compatibility
    const contentType = 'audio/mpeg';
    
    // Set response headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', responseData.length);
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
    
    // Include the original text for clients that can't play audio
    res.setHeader('X-Text-Response', encodeURIComponent(text.substring(0, 100)));
    
    // Send the audio data
    res.send(responseData);
    
    console.log(`[ElevenLabs Proxy] Successfully sent ${responseData.length} bytes of audio data`);
  } catch (error) {
    console.error('[ElevenLabs Proxy] Error:', error.message);
    
    // Different error handling based on the error type
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      const statusCode = error.response.status;
      let errorData = error.response.data;
      
      console.error(`[ElevenLabs Proxy] ElevenLabs API Error: ${statusCode}`);
      
      let errorMessage = 'Unknown ElevenLabs API error';
      
      // Check if the response is binary
      if (errorData instanceof Buffer || errorData instanceof ArrayBuffer) {
        try {
          // Try to convert binary error to string
          errorMessage = new TextDecoder().decode(errorData);
          // Check if it's JSON
          try {
            const jsonError = JSON.parse(errorMessage);
            errorMessage = jsonError.detail || jsonError.message || jsonError.error || errorMessage;
          } catch (jsonError) {
            // Not valid JSON, use as is
          }
        } catch (decodeError) {
          errorMessage = `Binary error response received (${errorData.length} bytes)`;
        }
      } else if (typeof errorData === 'object') {
        // JSON response
        errorMessage = errorData.detail || errorData.message || errorData.error || JSON.stringify(errorData);
      } else if (typeof errorData === 'string') {
        // String response
        errorMessage = errorData;
      }
      
      // Special handling for common status codes
      if (statusCode === 401) {
        return res.status(401).json({ error: 'Invalid ElevenLabs API key' });
      } else if (statusCode === 403 || (typeof errorMessage === 'string' && errorMessage.includes('geo-restriction'))) {
        return res.status(403).json({ 
          error: 'Access denied',
          message: 'Geo-restriction or access limitation from ElevenLabs'
        });
      } else if (statusCode === 429) {
        return res.status(429).json({ 
          error: 'Rate limit exceeded',
          message: 'ElevenLabs API rate limit exceeded. Please try again later.'
        });
      } else {
        return res.status(statusCode).json({ 
          error: `ElevenLabs API error (${statusCode})`,
          message: errorMessage
        });
      }
    } else if (error.request) {
      // The request was made but no response was received
      console.error('[ElevenLabs Proxy] No response received from ElevenLabs API');
      return res.status(504).json({ 
        error: 'Gateway timeout',
        message: 'No response received from ElevenLabs API'
      });
    } else {
      // Something happened in setting up the request
      console.error('[ElevenLabs Proxy] Request setup error:', error.message);
      return res.status(500).json({ 
        error: 'Proxy server error',
        message: error.message
      });
    }
  }
});

// Start the server
app.listen(PORT, async () => {
  console.log(`ElevenLabs Proxy Server running on port ${PORT}`);
  // Initialize proxy after server has started
  await initializeProxy();
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  if (proxyManager) {
    proxyManager.close();
  }
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  if (proxyManager) {
    proxyManager.close();
  }
  process.exit(0);
}); 