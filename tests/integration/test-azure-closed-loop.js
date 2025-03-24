require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const { textToSpeech } = require('../../lib/azure-tts-service');
const { speechToText } = require('../../lib/azure-stt-service');

async function testAzureClosedLoop() {
  console.log('===== Testing Azure TTS & STT Closed Loop =====');
  console.log('This test will:');
  console.log('1. Convert text to speech using Azure TTS');
  console.log('2. Save the audio file');
  console.log('3. Convert the audio back to text using Azure STT');
  console.log('4. Compare the original text with the recognized text');
  console.log('=============================================');
  
  const originalText = 'Привет! Это тестовое сообщение для проверки интеграции Azure.';
  const audioFilePath = 'test-azure-closed-loop.mp3';
  
  try {
    console.log(`\nStep 1: Converting text to speech using Azure TTS:`);
    console.log(`Original text: "${originalText}"`);
    
    // Generate speech using Azure TTS
    console.log('\nRequesting audio from Azure TTS API...');
    const audioData = await textToSpeech(originalText, 'ru-RU-SvetlanaNeural', {
      speed: 1.0,
      format: 'audio-24khz-48kbitrate-mono-mp3'
    });
    
    console.log(`Audio generated successfully (${audioData.byteLength} bytes)`);
    
    // Save audio to a file
    console.log(`\nStep 2: Saving audio to ${audioFilePath}`);
    fs.writeFileSync(audioFilePath, Buffer.from(audioData));
    console.log('Audio file saved successfully');
    
    // Wait a moment to ensure file is fully written
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Read the audio file
    console.log('\nStep 3: Converting audio back to text using Azure STT');
    const audioBuffer = fs.readFileSync(audioFilePath);
    
    console.log('Sending audio to Azure STT API...');
    const recognizedText = await speechToText(audioBuffer, 'ru-RU', {
      profanityFilter: false,
      detailed: true
    });
    
    console.log('\nStep 4: Comparing results');
    console.log(`Original text: "${originalText}"`);
    console.log(`Recognized text: "${recognizedText}"`);
    
    // Calculate similarity
    const similarity = calculateSimilarity(originalText.toLowerCase(), recognizedText.toLowerCase());
    console.log(`Text similarity: ${(similarity * 100).toFixed(1)}%`);
    
    if (similarity > 0.7) {
      console.log('\n✅ Test PASSED! The recognized text is sufficiently similar to the original.');
    } else {
      console.log('\n❌ Test FAILED! The recognized text is too different from the original.');
    }
    
  } catch (error) {
    console.error('\n❌ Error during test:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Simple string similarity calculation using Levenshtein distance
function calculateSimilarity(str1, str2) {
  const track = Array(str2.length + 1).fill(null).map(() => 
    Array(str1.length + 1).fill(null));
  
  for (let i = 0; i <= str1.length; i += 1) {
    track[0][i] = i;
  }
  
  for (let j = 0; j <= str2.length; j += 1) {
    track[j][0] = j;
  }
  
  for (let j = 1; j <= str2.length; j += 1) {
    for (let i = 1; i <= str1.length; i += 1) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      track[j][i] = Math.min(
        track[j][i - 1] + 1, // deletion
        track[j - 1][i] + 1, // insertion
        track[j - 1][i - 1] + indicator, // substitution
      );
    }
  }
  
  const distance = track[str2.length][str1.length];
  const maxLength = Math.max(str1.length, str2.length);
  return maxLength === 0 ? 1 : 1 - distance / maxLength;
}

// Run the test
testAzureClosedLoop().catch(console.error); 