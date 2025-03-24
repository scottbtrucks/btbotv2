#!/usr/bin/env node

const dotenv = require('dotenv');
const axios = require('axios');
const proxyManager = require('./proxy-agent');

// Load environment variables
dotenv.config();

// ANSI color codes for output formatting
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Helper function to print colored messages
function colorLog(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Function to test the VLESS connection
async function testVLESSConnection() {
  colorLog('bright', '====================================');
  colorLog('bright', '  Testing VLESS Proxy Connection');
  colorLog('bright', '====================================');
  
  if (process.env.VLESS_ENABLED !== 'true') {
    colorLog('yellow', '⚠️ VLESS is disabled in your configuration.');
    colorLog('yellow', 'To enable VLESS, set VLESS_ENABLED=true in your .env file.');
    process.exit(1);
  }

  // Determine VLESS type
  const isRealityEnabled = process.env.VLESS_REALITY_ENABLED === 'true';
  const vlessType = isRealityEnabled ? 'Reality TLS' : 'WebSocket';
  
  colorLog('blue', `\nConfiguration: ${vlessType} VLESS`);
  colorLog('blue', `Server: ${process.env.VLESS_SERVER}:${process.env.VLESS_PORT}`);
  colorLog('blue', `UUID: ${process.env.VLESS_UUID.substring(0, 8)}...`);
  
  if (isRealityEnabled) {
    colorLog('blue', `Server Name: ${process.env.VLESS_SERVER_NAME}`);
    colorLog('blue', `Fingerprint: ${process.env.VLESS_FINGERPRINT}`);
    colorLog('blue', `Public Key: ${process.env.VLESS_REALITY_PUBLIC_KEY.substring(0, 8)}...`);
  } else {
    colorLog('blue', `Path: ${process.env.VLESS_PATH}`);
    colorLog('blue', `TLS Enabled: ${process.env.VLESS_TLS}`);
  }
  
  colorLog('cyan', '\nStep 1: Initializing proxy manager...');
  
  try {
    const initialized = await proxyManager.initialize();
    
    if (!initialized) {
      colorLog('red', '❌ Failed to initialize VLESS client');
      process.exit(1);
    }
    
    colorLog('green', '✅ VLESS client initialized successfully');
    
    if (!proxyManager.vlessClient.isConnected) {
      colorLog('red', '❌ VLESS client is not connected');
      process.exit(1);
    }
    
    colorLog('green', '✅ VLESS client is connected');
    
    colorLog('cyan', '\nStep 2: Testing connection to ElevenLabs API...');
    
    // Now test a real request to ElevenLabs to check if we can bypass geo-restrictions
    const testUrl = 'https://api.elevenlabs.io/v1/voices';
    
    colorLog('blue', `Requesting: ${testUrl}`);
    
    const startTime = Date.now();
    let response;
    
    try {
      if (isRealityEnabled) {
        // Test with Reality VLESS client
        const options = {
          protocol: 'https:',
          method: 'GET',
          hostname: 'api.elevenlabs.io',
          port: 443,
          path: '/v1/voices',
          headers: {
            'Accept': 'application/json'
          }
        };
        
        response = await proxyManager.makeProxiedRequest(options);
      } else {
        // Make a simple request to the ElevenLabs API to check connectivity
        const config = proxyManager.createProxiedAxiosConfig();
        response = await axios.get('/v1/voices', config);
      }
      
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      
      if (
        (isRealityEnabled && response.statusCode === 200) || 
        (!isRealityEnabled && response.status === 200)
      ) {
        colorLog('green', `✅ Successfully connected to ElevenLabs API (${duration}s)`);
        colorLog('green', '\n✅ VLESS proxy is working correctly!');
        colorLog('green', '✅ Your server should now be able to bypass geo-restrictions.');
      } else {
        const status = isRealityEnabled ? response.statusCode : response.status;
        colorLog('yellow', `⚠️ Received status code ${status} from ElevenLabs API`);
        colorLog('yellow', '⚠️ The connection works, but there might be other issues.');
      }
    } catch (error) {
      colorLog('red', `❌ Failed to connect to ElevenLabs API: ${error.message}`);
      
      if (error.response) {
        const status = error.response.status;
        
        if (status === 403) {
          colorLog('yellow', '⚠️ Received 403 Forbidden from ElevenLabs API.');
          colorLog('yellow', '⚠️ This suggests your VLESS server IP might also be geo-restricted.');
          colorLog('yellow', '⚠️ Try a different VLESS server in another region.');
        } else {
          colorLog('red', `❌ ElevenLabs API returned status code: ${status}`);
        }
      }
    }
  } catch (error) {
    colorLog('red', `❌ Error during test: ${error.message}`);
  } finally {
    // Close the VLESS client
    if (proxyManager.vlessClient) {
      proxyManager.vlessClient.close();
    }
  }
}

// Run the test
testVLESSConnection().catch(error => {
  colorLog('red', `❌ Unhandled error: ${error.message}`);
  process.exit(1);
}); 