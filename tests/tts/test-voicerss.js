/**
 * VoiceRSS API Test Script
 * 
 * This script tests the VoiceRSS Text-to-Speech API with your API key
 * The free tier includes:
 * - 350 daily requests
 * - Multiple languages (including Russian)
 * - No credit card required
 */

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const https = require('https');
const { URL } = require('url');

async function testVoiceRSS() {
  console.log('Testing VoiceRSS integration...');
  
  // Check for required environment variables
  const apiKey = process.env.VOICERSS_API_KEY;
  
  if (!apiKey) {
    console.error('Error: VoiceRSS API key not configured.');
    console.error('Please set VOICERSS_API_KEY in your .env.local file.');
    console.error('You can get a free API key at: https://www.voicerss.org/registration.aspx');
    process.exit(1);
  }
  
  try {
    // Generate a Russian test phrase
    const testText = 'Привет! Это тестовое сообщение для проверки интеграции с VoiceRSS. Как вы слышите, голос звучит естественно.';
    console.log(`Converting text to speech: "${testText}"`);
    
    // Build URL for VoiceRSS API
    const url = new URL('https://api.voicerss.org/');
    const params = {
      key: apiKey,
      src: testText,
      hl: 'ru-ru',
      v: 'Female',
      r: '0',
      c: 'mp3',
      f: '44khz_16bit_stereo'
    };
    
    Object.keys(params).forEach(key => 
      url.searchParams.append(key, params[key])
    );
    
    console.log('Requesting audio from VoiceRSS API...');
    
    // Make request and save to file
    const outputFile = 'test-audio-voicerss.mp3';
    
    await new Promise((resolve, reject) => {
      https.get(url.toString(), (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`HTTP error: ${response.statusCode} ${response.statusMessage}`));
          return;
        }
        
        // Check content type
        const contentType = response.headers['content-type'];
        if (!contentType || !contentType.includes('audio/')) {
          // If not audio, it's likely an error message in JSON or text
          let data = '';
          response.on('data', (chunk) => {
            data += chunk;
          });
          response.on('end', () => {
            reject(new Error(`VoiceRSS API error: ${data}`));
          });
          return;
        }
        
        // It's audio, save to file
        const fileStream = fs.createWriteStream(outputFile);
        response.pipe(fileStream);
        
        fileStream.on('finish', () => {
          fileStream.close();
          resolve();
        });
        
        fileStream.on('error', (err) => {
          reject(err);
        });
      }).on('error', (err) => {
        reject(err);
      });
    });
    
    console.log(`Success! Audio saved to ${outputFile}`);
    console.log('Play the file to verify the voice quality and pronunciation.');
    
  } catch (error) {
    console.error('Error during VoiceRSS test:');
    console.error(error.message);
    process.exit(1);
  }
}

testVoiceRSS(); 