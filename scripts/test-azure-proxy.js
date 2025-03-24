#!/usr/bin/env node

/**
 * Test script for Azure TTS Proxy service
 * 
 * This script tests our new Azure TTS proxy implementation
 * to make sure it correctly integrates with the Azure TTS API.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Load environment variables from .env.local if it exists
try {
  const envFile = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8');
  envFile.split('\n').forEach(line => {
    if (line && !line.startsWith('#')) {
      const [key, value] = line.split('=');
      if (key && value) {
        process.env[key.trim()] = value.trim();
      }
    }
  });
  console.log('Loaded environment variables from .env.local');
} catch (error) {
  console.log('Could not load .env.local file, using existing environment variables');
}

// Get Azure credentials
const apiKey = process.env.AZURE_TTS_KEY;
const region = process.env.AZURE_TTS_REGION || 'eastus';
const endpoint = process.env.AZURE_TTS_ENDPOINT || 
  `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`;

if (!apiKey) {
  console.error('Error: AZURE_TTS_KEY not found in environment variables');
  process.exit(1);
}

// Configuration
const outputFormat = 'riff-24khz-16bit-mono-pcm'; // WAV format
const voice = 'ru-RU-SvetlanaNeural';
const text = 'Привет, это тест Azure Text-to-Speech прокси сервиса.';
const outputFile = path.join(process.cwd(), 'azure-tts-proxy-test.wav');

// Build SSML using the exact same format as our proxy service
const ssml = `
<speak version='1.0' xml:lang='ru-RU'>
    <voice name='${voice}'>${text}</voice>
</speak>`.trim();

console.log('Testing Azure TTS Proxy implementation...');
console.log(`Endpoint: ${endpoint}`);
console.log(`Voice: ${voice}`);
console.log(`Format: ${outputFormat}`);
console.log(`Text: ${text}`);

// Make the request to Azure TTS API
const options = {
  method: 'POST',
  headers: {
    'Ocp-Apim-Subscription-Key': apiKey,
    'Content-Type': 'application/ssml+xml',
    'X-Microsoft-OutputFormat': outputFormat,
    'User-Agent': 'BusinessTrucksAssistant'
  }
};

const req = https.request(endpoint, options, (res) => {
  if (res.statusCode !== 200) {
    console.error(`Error: HTTP ${res.statusCode} ${res.statusMessage}`);
    res.on('data', (chunk) => {
      console.error(`Response: ${chunk.toString()}`);
    });
    process.exit(1);
  }

  // Collect response data
  const chunks = [];
  res.on('data', (chunk) => chunks.push(chunk));
  
  res.on('end', () => {
    const audioData = Buffer.concat(chunks);
    console.log(`Received ${audioData.length} bytes of audio data`);
    
    // Save to file
    fs.writeFileSync(outputFile, audioData);
    console.log(`Audio saved to ${outputFile}`);
    console.log('Test completed successfully!');
  });
});

req.on('error', (error) => {
  console.error(`Request error: ${error.message}`);
  process.exit(1);
});

// Send the SSML
req.write(ssml);
req.end();

console.log('Request sent, waiting for response...'); 