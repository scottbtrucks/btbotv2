#!/usr/bin/env node

/**
 * Azure Text-to-Speech (TTS) Integration Test
 * 
 * This script tests the Azure Cognitive Services Text-to-Speech API integration
 * by generating a sample audio file from Russian text.
 * 
 * It verifies that:
 * 1. Azure TTS credentials are properly configured
 * 2. The service can generate speech from text
 * 3. The audio output is saved correctly
 * 
 * Requirements:
 * - AZURE_TTS_KEY environment variable must be set in .env.local
 * - AZURE_TTS_REGION environment variable must be set in .env.local
 */

require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const { generateAudioAzure } = require('../../lib/azure-tts-service');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Test parameters
const TEST_TEXT = 'Привет! Это тестовое сообщение для проверки Azure Text-to-Speech.';
const OUTPUT_FILE = 'test-audio-azure.mp3';
const FEMALE_VOICE_ID = 'ru-RU-SvetlanaNeural';
const MALE_VOICE_ID = 'ru-RU-DmitryNeural';

// Helper function to check environment variables
function checkEnvironment() {
  const errors = [];
  
  if (!process.env.AZURE_TTS_KEY) {
    errors.push('AZURE_TTS_KEY is not set in .env.local');
  }
  
  if (!process.env.AZURE_TTS_REGION) {
    errors.push('AZURE_TTS_REGION is not set in .env.local');
  }
  
  if (errors.length > 0) {
    console.error(`${colors.red}Configuration Error:${colors.reset}`);
    errors.forEach(error => console.error(`- ${error}`));
    console.error(`\n${colors.yellow}Please configure these variables in your .env.local file.${colors.reset}`);
    console.error(`${colors.yellow}You can run 'npm run fix-azure' to set them up.${colors.reset}`);
    process.exit(1);
  }
}

// Run the test
async function testAzureTTS() {
  console.log(`${colors.cyan}╔════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.cyan}║       Azure TTS Integration Test           ║${colors.reset}`);
  console.log(`${colors.cyan}╚════════════════════════════════════════════╝${colors.reset}`);
  console.log();
  
  // Check environment variables
  checkEnvironment();
  
  console.log(`${colors.blue}Testing Azure TTS integration...${colors.reset}`);
  console.log(`${colors.blue}▸ API Key:${colors.reset} ${process.env.AZURE_TTS_KEY.substring(0, 5)}...`);
  console.log(`${colors.blue}▸ Region:${colors.reset} ${process.env.AZURE_TTS_REGION}`);
  console.log(`${colors.blue}▸ Voice:${colors.reset} ${FEMALE_VOICE_ID}`);
  console.log(`${colors.blue}▸ Output:${colors.reset} ${OUTPUT_FILE}`);
  console.log();
  
  try {
    console.log(`${colors.yellow}Generating speech from text:${colors.reset} "${TEST_TEXT}"`);
    
    const startTime = Date.now();
    const audioData = await generateAudioAzure({
      text: TEST_TEXT,
      voiceId: FEMALE_VOICE_ID,
    });
    const endTime = Date.now();
    
    // Save the audio file
    fs.writeFileSync(OUTPUT_FILE, audioData);
    const fileStats = fs.statSync(OUTPUT_FILE);
    
    console.log();
    console.log(`${colors.green}✓ Successfully generated speech!${colors.reset}`);
    console.log(`${colors.blue}▸ Time taken:${colors.reset} ${(endTime - startTime) / 1000} seconds`);
    console.log(`${colors.blue}▸ Audio file size:${colors.reset} ${(fileStats.size / 1024).toFixed(1)} KB`);
    console.log(`${colors.blue}▸ Saved to:${colors.reset} ${path.resolve(OUTPUT_FILE)}`);
    
    console.log();
    console.log(`${colors.green}Azure TTS integration test passed!${colors.reset}`);
    
  } catch (error) {
    console.error(`${colors.red}Error testing Azure TTS:${colors.reset} ${error.message}`);
    
    if (error.message.includes('401')) {
      console.error(`${colors.yellow}Authentication error. Please check your Azure TTS key and region.${colors.reset}`);
    } else if (error.message.includes('403')) {
      console.error(`${colors.yellow}Authorization error. Your Azure subscription may have reached its limit.${colors.reset}`);
    } else if (error.message.includes('429')) {
      console.error(`${colors.yellow}Rate limit exceeded. Your Azure subscription has exceeded its quota.${colors.reset}`);
    } else if (error.message.includes('ENOTFOUND') || error.message.includes('ETIMEDOUT')) {
      console.error(`${colors.yellow}Network error. Please check your internet connection.${colors.reset}`);
    }
    
    if (error.response) {
      console.error(`${colors.yellow}Response status:${colors.reset} ${error.response.status}`);
      console.error(`${colors.yellow}Response data:${colors.reset}`, error.response.data);
    }
    
    process.exit(1);
  }
}

// Run the test
testAzureTTS(); 