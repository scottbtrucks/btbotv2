require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const { textToSpeech, RECOMMENDED_RUSSIAN_VOICES } = require('../../lib/azure-tts-service');

/**
 * Generate sample audio files for all Azure Russian voices
 * This helps in comparing voice quality and selecting the best voice
 */
async function testAzureVoices() {
  console.log('===== Testing Azure TTS Russian Voices =====');
  
  // Sample text to convert to speech (includes questions and statements)
  const sampleText = 'Здравствуйте! Меня зовут Полина, я помогу вам с выбором коммерческого транспорта. Какой тип грузовика вас интересует?';
  
  // Create a directory for the samples if it doesn't exist
  const samplesDir = path.join(__dirname, '../../voice-samples');
  if (!fs.existsSync(samplesDir)) {
    fs.mkdirSync(samplesDir, { recursive: true });
    console.log(`Created directory: ${samplesDir}`);
  }
  
  console.log(`\nGenerating samples for ${RECOMMENDED_RUSSIAN_VOICES.length} Russian voices...`);
  console.log(`Sample text: "${sampleText}"`);
  
  // Process each voice
  for (const voice of RECOMMENDED_RUSSIAN_VOICES) {
    try {
      console.log(`\nProcessing voice: ${voice.name} (${voice.id})`);
      
      // Generate audio for this voice
      console.log(`Requesting audio from Azure TTS API...`);
      const audioData = await textToSpeech(sampleText, voice.id, {
        speed: 1.0,
        format: 'audio-24khz-96kbitrate-mono-mp3'
      });
      
      // Save the audio file
      const filename = `${voice.id.replace(/[^\w-]/g, '-')}.mp3`;
      const filePath = path.join(samplesDir, filename);
      fs.writeFileSync(filePath, Buffer.from(audioData));
      
      console.log(`✅ Sample created: ${filename} (${audioData.byteLength} bytes)`);
      
    } catch (error) {
      console.error(`❌ Error generating sample for ${voice.id}:`, error.message);
    }
  }
  
  console.log('\n===== All samples generated =====');
  console.log(`Voice samples saved to: ${samplesDir}`);
  console.log('Listen to the samples to determine which voice sounds best for your application.');
  console.log('Once you decide, update the default voice in your application or .env.local file.');
}

// Run the test
testAzureVoices().catch(console.error); 