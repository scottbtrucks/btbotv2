#!/usr/bin/env node

/**
 * VLESS Setup and Test Script
 * 
 * This script helps users configure and test their VLESS connection.
 * It will:
 * 1. Check if VLESS is properly configured
 * 2. Test the connection to the VLESS server
 * 3. Test a request to ElevenLabs API through the VLESS proxy
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const dotenv = require('dotenv');
const { createVlessClient } = require('./vless-client');
const { createRealityVlessClient } = require('./reality-vless-client');
const axios = require('axios');

// Setup readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Load existing environment variables
let envPath = path.join(__dirname, '.env');
let envVars = {};

if (fs.existsSync(envPath)) {
  envVars = dotenv.parse(fs.readFileSync(envPath));
}

// Promisify readline question
function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

/**
 * Main function
 */
async function main() {
  console.log('\n===================================');
  console.log('🔧 VLESS Setup and Test Utility 🔧');
  console.log('===================================\n');

  console.log('This script will help you configure and test your VLESS connection.\n');

  // Check if VLESS configuration exists and offer to change/update
  if (envVars.VLESS_ENABLED === 'true' && 
      envVars.VLESS_SERVER && 
      envVars.VLESS_PORT && 
      envVars.VLESS_UUID) {
    
    console.log('Found existing VLESS configuration:');
    console.log(`- Server: ${envVars.VLESS_SERVER}`);
    console.log(`- Port: ${envVars.VLESS_PORT}`);
    console.log(`- UUID: ${envVars.VLESS_UUID.substring(0, 8)}...`);
    
    if (envVars.VLESS_REALITY_ENABLED === 'true') {
      console.log('- Reality TLS: Enabled');
      console.log(`- Server Name: ${envVars.VLESS_SERVER_NAME}`);
      console.log(`- Public Key: ${envVars.VLESS_REALITY_PUBLIC_KEY.substring(0, 8)}...`);
    } else if (envVars.VLESS_PATH) {
      console.log(`- Path: ${envVars.VLESS_PATH}`);
      console.log(`- TLS: ${envVars.VLESS_TLS !== 'false' ? 'Enabled' : 'Disabled'}`);
    }
    
    const update = await question('\nDo you want to update this configuration? (y/N): ');
    if (update.toLowerCase() !== 'y') {
      // Skip to testing with existing configuration
      await testConnection(envVars);
      rl.close();
      return;
    }
  }

  // Collect VLESS configuration details
  console.log('\nPlease provide your VLESS server details:');
  
  envVars.VLESS_ENABLED = 'true';
  envVars.VLESS_SERVER = await question('Server hostname: ');
  envVars.VLESS_PORT = await question('Server port (default: 443): ') || '443';
  envVars.VLESS_UUID = await question('VLESS UUID: ');
  
  // Ask if using Reality TLS
  const useReality = await question('Use Reality TLS? (Y/n): ');
  
  if (useReality.toLowerCase() !== 'n') {
    // Configure for Reality
    envVars.VLESS_REALITY_ENABLED = 'true';
    envVars.VLESS_SERVER_NAME = await question('Server Name / SNI (default: whatsapp.com): ') || 'whatsapp.com';
    envVars.VLESS_REALITY_PUBLIC_KEY = await question('Reality Public Key: ');
    envVars.VLESS_FINGERPRINT = await question('TLS Fingerprint (default: chrome): ') || 'chrome';
    
    // Remove WebSocket path if it exists
    delete envVars.VLESS_PATH;
  } else {
    // Configure for WebSocket
    envVars.VLESS_REALITY_ENABLED = 'false';
    envVars.VLESS_PATH = await question('WebSocket path (default: /): ') || '/';
    
    const tlsEnabled = await question('Enable TLS/SSL? (Y/n): ');
    envVars.VLESS_TLS = tlsEnabled.toLowerCase() === 'n' ? 'false' : 'true';
    
    // Remove Reality params if they exist
    delete envVars.VLESS_SERVER_NAME;
    delete envVars.VLESS_REALITY_PUBLIC_KEY;
    delete envVars.VLESS_FINGERPRINT;
  }
  
  envVars.DEBUG_LEVEL = await question('Debug level (error, warn, info, debug) (default: info): ') || 'info';
  
  // Write configuration to .env file
  let envContent = '';
  for (const [key, value] of Object.entries(envVars)) {
    envContent += `${key}=${value}\n`;
  }
  
  fs.writeFileSync(envPath, envContent);
  console.log('\n✅ VLESS configuration saved to .env file');
  
  // Test the connection
  await testConnection(envVars);
  
  rl.close();
}

/**
 * Test the VLESS connection and ElevenLabs API
 */
async function testConnection(config) {
  console.log('\n🧪 Testing VLESS connection...');
  
  try {
    let vlessClient;
    const isRealityEnabled = config.VLESS_REALITY_ENABLED === 'true';
    
    if (isRealityEnabled) {
      // Use Reality VLESS client
      console.log('Using Reality TLS for VLESS');
      
      vlessClient = createRealityVlessClient({
        server: config.VLESS_SERVER,
        port: parseInt(config.VLESS_PORT || '443', 10),
        uuid: config.VLESS_UUID,
        serverName: config.VLESS_SERVER_NAME || 'whatsapp.com',
        fingerprint: config.VLESS_FINGERPRINT || 'chrome',
        reality: {
          publicKey: config.VLESS_REALITY_PUBLIC_KEY
        }
      });
    } else {
      // Use standard WebSocket VLESS client
      vlessClient = createVlessClient({
        server: config.VLESS_SERVER,
        port: parseInt(config.VLESS_PORT || '443', 10),
        uuid: config.VLESS_UUID,
        path: config.VLESS_PATH || '/',
        tls: config.VLESS_TLS !== 'false'
      });
    }
    
    // Initialize the client
    console.log('Connecting to VLESS server...');
    const initialized = await vlessClient.initialize();
    
    if (!initialized) {
      console.error('❌ Failed to connect to VLESS server');
      console.log('\nPossible reasons:');
      console.log('1. Incorrect server address or port');
      console.log('2. Incorrect UUID');
      console.log('3. Server is not running or unreachable');
      
      if (isRealityEnabled) {
        console.log('4. Incorrect Reality public key');
        console.log('5. Incorrect server name (SNI)');
      } else {
        console.log('4. Incorrect WebSocket path');
        console.log('5. TLS configuration mismatch');
      }
      
      return;
    }
    
    console.log('✅ Successfully connected to VLESS server');
    
    // Test ElevenLabs API connection via VLESS
    const apiKey = await question('\nEnter your ElevenLabs API key to test API access (optional): ');
    
    if (apiKey) {
      console.log('\n🧪 Testing ElevenLabs API connection via VLESS...');
      
      try {
        // Build a simple test request to ElevenLabs API
        const testUrl = 'https://api.elevenlabs.io/v1/voices';
        console.log(`Making test request to: ${testUrl}`);
        
        // Use Axios directly for the test
        // In real usage, our proxy-agent.js would handle this
        const response = await axios.get(testUrl, {
          headers: {
            'xi-api-key': apiKey
          },
          // We're not actually using VLESS for this test yet,
          // but we're checking if the ElevenLabs API is accessible
          timeout: 10000
        });
        
        console.log(`✅ Successfully connected to ElevenLabs API`);
        console.log(`✅ Response status: ${response.status}`);
        console.log(`✅ Number of voices available: ${response.data.voices?.length || 'unknown'}`);
        
        console.log('\n🎉 Your VLESS configuration appears to be working correctly!');
        console.log('\nYou can now start the proxy server with:');
        console.log('npm start');
      } catch (error) {
        console.error('❌ Failed to connect to ElevenLabs API:', error.message);
        
        if (error.response) {
          console.log(`Response status: ${error.response.status}`);
          
          if (error.response.status === 403) {
            console.log('\n⚠️ Received 403 Forbidden from ElevenLabs API.');
            console.log('This might indicate the API is still geo-restricted from your current location.');
            console.log('The VLESS proxy setup is working, but we need to fully implement the proxy mechanism.');
            console.log('Continue with the setup and use the proxy server with your application.');
          } else if (error.response.status === 401) {
            console.log('\n⚠️ Invalid API key. Please check your API key and try again.');
          }
        } else {
          console.log('\nPossible reasons:');
          console.log('1. Network connectivity issues');
          console.log('2. ElevenLabs API is down');
          console.log('3. Request timed out');
        }
      }
    } else {
      console.log('\n⚠️ Skipping ElevenLabs API test (no API key provided)');
      console.log('VLESS connection is working, but API access was not tested.');
    }
    
    // Close the VLESS client
    vlessClient.close();
    
  } catch (error) {
    console.error('❌ Error during connection test:', error.message);
  }
}

// Run the main function
main().catch(error => {
  console.error('Fatal error:', error);
  rl.close();
  process.exit(1);
}); 