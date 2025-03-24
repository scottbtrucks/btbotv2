require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const { speechToText } = require('../../lib/azure-stt-service');

async function testAzureSTT() {
  console.log('Testing Azure STT integration...');
  
  try {
    // Try to use a previously generated TTS file, or fall back to a default file
    let audioFile = 'test-audio-azure.mp3';
    if (!fs.existsSync(audioFile)) {
      audioFile = 'test-audio-voicerss.mp3';
      if (!fs.existsSync(audioFile)) {
        console.error('No test audio file found. Please run the TTS test first.');
        return;
      }
    }
    
    console.log(`Using audio file: ${audioFile}`);
    const audioData = fs.readFileSync(audioFile);
    
    console.log('Sending audio to Azure STT API...');
    const result = await speechToText(audioData, { language: 'ru-RU' });
    
    console.log('Speech recognition result:');
    console.log(result);
    console.log('Test completed successfully!');
  } catch (error) {
    console.error('Error testing Azure STT:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testAzureSTT(); 