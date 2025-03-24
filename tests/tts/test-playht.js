/**
 * PlayHT API Test Script
 * 
 * IMPORTANT: PlayHT requires a paid subscription to use their API.
 * Even with valid API credentials, a free account will return:
 * "API access is not available on your current plan"
 * 
 * Visit https://play.ht/pricing to upgrade to a paid plan.
 */

// Test script for Play.ht integration
require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const playht = require('playht');

async function testPlayHT() {
  console.log('Testing Play.ht integration...');
  
  // Check for required environment variables
  const apiKey = process.env.PLAYHT_API_KEY;
  const userId = process.env.PLAYHT_USER_ID;
  const voiceId = process.env.PLAYHT_VOICE_ID || 's3://voice-cloning-zero-shot/d9ff78ba-d016-47f6-b0ef-dd630f59414e/female-cs/manifest.json';
  
  if (!apiKey || !userId) {
    console.error('Error: Play.ht credentials not configured.');
    console.error('Please set PLAYHT_API_KEY and PLAYHT_USER_ID in your .env.local file.');
    process.exit(1);
  }
  
  try {
    // Initialize Play.ht client
    console.log('Initializing Play.ht client...');
    playht.init({
      apiKey,
      userId,
    });
    
    // Generate a Russian test phrase
    const testText = 'Привет! Это тестовое сообщение для проверки интеграции с Play.ht. Как вы слышите, голос звучит естественно.';
    console.log(`Converting text to speech: "${testText}"`);
    
    // Stream and save to file
    const response = await playht.generate({
      text: testText,
      voiceId,
      quality: 'draft',
      outputFormat: 'mp3',
      temperature: 0.7,
      speed: 1.0,
    });
    
    if (!response || !response.audioUrl) {
      throw new Error('Failed to generate audio or received empty response');
    }
    
    // Fetch the audio from the URL
    console.log('Fetching audio data...');
    const audioResponse = await fetch(response.audioUrl);
    const audioBuffer = await audioResponse.arrayBuffer();
    
    // Save to file
    const outputFile = 'test-audio.mp3';
    fs.writeFileSync(outputFile, Buffer.from(audioBuffer));
    
    console.log(`Success! Audio saved to ${outputFile}`);
    console.log('Play the file to verify the voice quality and pronunciation.');
    
  } catch (error) {
    console.error('Error during Play.ht test:');
    console.error(error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    process.exit(1);
  }
}

testPlayHT(); 