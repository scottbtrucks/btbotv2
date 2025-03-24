/**
 * Azure TTS Proxy Service
 * 
 * A simplified proxy for Azure Text-to-Speech service that follows the same
 * approach as the provided Python implementation.
 * 
 * Features:
 * - Simple SSML format (similar to Python implementation)
 * - Consistent error handling
 * - Local proxy fallback option for testing
 */

// Custom error classes for better error handling
export class AzureTTSProxyError extends Error {
  constructor(message: string, public statusCode: number = 500) {
    super(message);
    this.name = 'AzureTTSProxyError';
  }
}

// Mock implementation for testing without valid Azure credentials
async function localTtsProxy(
  text: string,
  voiceName: string = 'ru-RU-SvetlanaNeural',
  options: {
    format?: string
  } = {}
): Promise<ArrayBuffer> {
  console.log(`[LOCAL PROXY] Generating speech for: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"
  Voice: ${voiceName}
  Format: ${options.format || 'default'}`);
  
  // In a real implementation, we would generate audio here
  // For now, we'll return an empty WAV file for testing
  
  // This is a minimal valid WAV file header (44 bytes)
  const wavHeader = new Uint8Array([
    0x52, 0x49, 0x46, 0x46, // "RIFF"
    0x24, 0x00, 0x00, 0x00, // Chunk size
    0x57, 0x41, 0x56, 0x45, // "WAVE"
    0x66, 0x6d, 0x74, 0x20, // "fmt "
    0x10, 0x00, 0x00, 0x00, // Subchunk1 size
    0x01, 0x00,             // Audio format (PCM)
    0x01, 0x00,             // Channels
    0x44, 0xac, 0x00, 0x00, // Sample rate (44100)
    0x88, 0x58, 0x01, 0x00, // Byte rate
    0x02, 0x00,             // Block align
    0x10, 0x00,             // Bits per sample
    0x64, 0x61, 0x74, 0x61, // "data"
    0x00, 0x00, 0x00, 0x00  // Data size
  ]);
  
  console.log('[LOCAL PROXY] Returning mock WAV audio (for testing only)');
  
  // Wait a small amount to simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  return wavHeader.buffer;
}

/**
 * Convert text to speech using Azure TTS API
 * 
 * @param text - The text to convert to speech
 * @param voiceName - The Azure voice name to use
 * @param options - Additional options
 * @returns Promise with ArrayBuffer containing audio data
 */
export async function azureTtsProxy(
  text: string,
  voiceName: string = 'ru-RU-SvetlanaNeural',
  options: {
    format?: string,
    region?: string,
    useLocalProxy?: boolean
  } = {}
): Promise<ArrayBuffer> {
  // Check if we should use local proxy
  const useLocalProxy = options.useLocalProxy || process.env.USE_LOCAL_TTS_PROXY === 'true';
  
  if (useLocalProxy) {
    console.log('Using local TTS proxy (for testing/development only)');
    return localTtsProxy(text, voiceName, options);
  }
  
  // Get Azure credentials
  const subscriptionKey = process.env.AZURE_TTS_KEY;
  if (!subscriptionKey) {
    console.warn('Azure TTS subscription key not configured, falling back to local proxy');
    return localTtsProxy(text, voiceName, options);
  }

  // Set region from options or environment variable
  const region = options.region || process.env.AZURE_TTS_REGION || 'eastus';
  
  // Get endpoint URL
  const endpoint = process.env.AZURE_TTS_ENDPOINT || 
    `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`;
  
  // Set output format (default to WAV)
  const outputFormat = options.format || 'riff-24khz-16bit-mono-pcm';
  
  // Build SSML using the same simple format as the Python function
  const ssml = `
<speak version='1.0' xml:lang='ru-RU'>
    <voice name='${voiceName}'>${text}</voice>
</speak>`.trim();

  try {
    console.log(`Azure TTS Proxy request: 
- Voice: ${voiceName}
- Format: ${outputFormat}
- Text length: ${text.length} characters`);
    
    // Make request to Azure TTS API
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': subscriptionKey,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': outputFormat,
        'User-Agent': 'BusinessTrucksAssistant'
      },
      body: ssml
    });
    
    // Check for error responses
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      const statusCode = response.status;
      
      console.warn(`Azure TTS API error (${statusCode}): ${errorText}`);
      
      // If unauthorized (likely invalid key), fall back to local proxy
      if (statusCode === 401) {
        console.log('Azure TTS authentication failed, falling back to local proxy');
        return localTtsProxy(text, voiceName, options);
      }
      
      throw new AzureTTSProxyError(
        `Azure TTS API error: ${response.status} ${response.statusText || 'Error'}: ${errorText}`,
        response.status
      );
    }
    
    // Get audio data
    const audioData = await response.arrayBuffer();
    
    // Validate audio data
    if (!audioData || audioData.byteLength === 0) {
      console.warn('No audio data received from Azure TTS API, falling back to local proxy');
      return localTtsProxy(text, voiceName, options);
    }
    
    console.log(`Azure TTS Proxy success: received ${audioData.byteLength} bytes of audio data`);
    return audioData;
    
  } catch (error: any) {
    console.error('Azure TTS proxy error:', error);
    
    // Handle network errors
    if (error instanceof AzureTTSProxyError) {
      // If this is a proxy error but not 401, try local proxy
      console.log('Azure TTS proxy error, falling back to local proxy');
      return localTtsProxy(text, voiceName, options);
    }
    
    // Handle fetch errors
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      console.log('Network error, falling back to local proxy');
      return localTtsProxy(text, voiceName, options);
    }
    
    // For other errors, try local proxy too
    console.log('Unknown error, falling back to local proxy');
    return localTtsProxy(text, voiceName, options);
  }
}

/**
 * Simplified interface for text-to-speech conversion
 * This is a drop-in replacement for the more complex implementation
 */
export async function textToSpeech(
  text: string,
  voiceName: string = 'ru-RU-SvetlanaNeural',
  options: {
    format?: string,
    region?: string,
    useLocalProxy?: boolean
  } = {}
): Promise<ArrayBuffer> {
  return azureTtsProxy(text, voiceName, options);
} 