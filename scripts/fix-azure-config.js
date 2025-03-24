#!/usr/bin/env node

/**
 * Azure Speech Services Configuration Utility
 * 
 * This script helps set up and fix Azure Speech Services configuration
 * for the Business Trucks AI Assistant. It checks the .env.local file
 * and ensures that Azure services are properly configured.
 * 
 * Features:
 * - Checks for Azure API keys in environment
 * - Verifies that USE_AZURE_SERVICES is set correctly
 * - Creates or updates .env.local with proper configuration
 * - Helps diagnose common configuration issues
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { exec } = require('child_process');

// Set up readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Path to .env.local file
const envPath = path.join(process.cwd(), '.env.local');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

// Logo and header
function displayHeader() {
  console.log(`${colors.blue}
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   ${colors.cyan}Azure Speech Services Configuration Helper${colors.blue}           ║
║   ${colors.cyan}for Business Trucks AI Assistant${colors.blue}                     ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝${colors.reset}
`);
}

/**
 * Reads the current .env.local file and parses it into a Map
 * @returns {Promise<Map<string, string>>} Map containing environment variables
 */
async function readEnvFile() {
  const envVars = new Map();

  try {
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      const lines = content.split('\n');

      for (const line of lines) {
        // Skip empty lines and comments
        if (!line.trim() || line.trim().startsWith('#')) continue;

        // Parse key-value pairs
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
          const [, key, value] = match;
          envVars.set(key.trim(), value.trim());
        }
      }
    } else {
      console.log(`${colors.yellow}No .env.local file found. Will create a new one.${colors.reset}`);
    }
  } catch (error) {
    console.error(`${colors.red}Error reading .env.local file:${colors.reset}`, error.message);
  }

  return envVars;
}

/**
 * Writes environment variables to the .env.local file
 * @param {Map<string, string>} envVars Map containing environment variables
 * @returns {Promise<void>}
 */
async function writeEnvFile(envVars) {
  try {
    const content = Array.from(envVars.entries())
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    fs.writeFileSync(envPath, content, 'utf8');
    console.log(`${colors.green}Successfully updated .env.local file.${colors.reset}`);
  } catch (error) {
    console.error(`${colors.red}Error writing .env.local file:${colors.reset}`, error.message);
  }
}

/**
 * Prompts the user for Azure API key and region if not already configured
 * @param {Map<string, string>} envVars Map containing environment variables
 * @returns {Promise<Map<string, string>>} Updated environment variables
 */
async function promptForAzureCredentials(envVars) {
  return new Promise((resolve) => {
    const azureTtsKey = envVars.get('AZURE_TTS_KEY');
    const azureTtsRegion = envVars.get('AZURE_TTS_REGION');
    const azureSttKey = envVars.get('AZURE_STT_KEY');
    const azureSttRegion = envVars.get('AZURE_STT_REGION');

    console.log(`${colors.cyan}Checking Azure Speech Services configuration...${colors.reset}`);

    // Function to prompt for Azure TTS key if not set
    const promptTtsKey = () => {
      if (!azureTtsKey) {
        rl.question(`${colors.yellow}Enter your Azure TTS key (or press Enter to skip): ${colors.reset}`, (answer) => {
          if (answer.trim()) {
            envVars.set('AZURE_TTS_KEY', answer.trim());
          }
          promptTtsRegion();
        });
      } else {
        console.log(`${colors.green}Azure TTS key is already configured.${colors.reset}`);
        promptTtsRegion();
      }
    };

    // Function to prompt for Azure TTS region if not set
    const promptTtsRegion = () => {
      if (!azureTtsRegion) {
        rl.question(`${colors.yellow}Enter your Azure TTS region (e.g., eastus, westeurope): ${colors.reset}`, (answer) => {
          if (answer.trim()) {
            envVars.set('AZURE_TTS_REGION', answer.trim());
          }
          promptSttKey();
        });
      } else {
        console.log(`${colors.green}Azure TTS region is already configured.${colors.reset}`);
        promptSttKey();
      }
    };

    // Function to prompt for Azure STT key if not set
    const promptSttKey = () => {
      if (!azureSttKey) {
        rl.question(`${colors.yellow}Enter your Azure STT key (can be the same as TTS key, or press Enter to skip): ${colors.reset}`, (answer) => {
          if (answer.trim()) {
            envVars.set('AZURE_STT_KEY', answer.trim());
          } else if (envVars.has('AZURE_TTS_KEY')) {
            console.log(`${colors.blue}Using TTS key for STT as well.${colors.reset}`);
            envVars.set('AZURE_STT_KEY', envVars.get('AZURE_TTS_KEY'));
          }
          promptSttRegion();
        });
      } else {
        console.log(`${colors.green}Azure STT key is already configured.${colors.reset}`);
        promptSttRegion();
      }
    };

    // Function to prompt for Azure STT region if not set
    const promptSttRegion = () => {
      if (!azureSttRegion) {
        rl.question(`${colors.yellow}Enter your Azure STT region (can be the same as TTS region): ${colors.reset}`, (answer) => {
          if (answer.trim()) {
            envVars.set('AZURE_STT_REGION', answer.trim());
          } else if (envVars.has('AZURE_TTS_REGION')) {
            console.log(`${colors.blue}Using TTS region for STT as well.${colors.reset}`);
            envVars.set('AZURE_STT_REGION', envVars.get('AZURE_TTS_REGION'));
          }
          finishPrompts();
        });
      } else {
        console.log(`${colors.green}Azure STT region is already configured.${colors.reset}`);
        finishPrompts();
      }
    };

    // Finalize prompts and resolve promise with updated environment variables
    const finishPrompts = () => {
      // Make sure USE_AZURE_SERVICES is set to true if keys are present
      if (
        envVars.has('AZURE_TTS_KEY') || 
        envVars.has('AZURE_STT_KEY')
      ) {
        envVars.set('USE_AZURE_SERVICES', 'true');
        console.log(`${colors.green}Setting USE_AZURE_SERVICES=true to enable Azure services.${colors.reset}`);
      }

      resolve(envVars);
    };

    // Start the prompting sequence
    promptTtsKey();
  });
}

/**
 * Checks for conflicts with other TTS providers and offers to disable them
 * @param {Map<string, string>} envVars Map containing environment variables
 * @returns {Promise<Map<string, string>>} Updated environment variables
 */
async function checkForConflicts(envVars) {
  return new Promise((resolve) => {
    if (envVars.get('USE_AZURE_SERVICES') === 'true') {
      const hasVoiceRssKey = envVars.has('VOICERSS_API_KEY');
      const hasPlayHtKey = envVars.has('PLAYHT_API_KEY');
      const hasElevenLabsKey = envVars.has('ELEVENLABS_API_KEY');
      
      if (hasVoiceRssKey || hasPlayHtKey || hasElevenLabsKey) {
        console.log(`${colors.yellow}
Note: You have other TTS providers configured alongside Azure:${colors.reset}`);
        
        if (hasVoiceRssKey) console.log(`- VoiceRSS (VOICERSS_API_KEY)`);
        if (hasPlayHtKey) console.log(`- Play.ht (PLAYHT_API_KEY)`);
        if (hasElevenLabsKey) console.log(`- ElevenLabs (ELEVENLABS_API_KEY)`);
        
        console.log(`${colors.yellow}
When USE_AZURE_SERVICES=true, Azure will be prioritized over these providers.${colors.reset}`);
        
        rl.question(`${colors.yellow}Would you like to disable these other providers? (y/n): ${colors.reset}`, (answer) => {
          if (answer.toLowerCase() === 'y') {
            if (hasVoiceRssKey) envVars.delete('VOICERSS_API_KEY');
            if (hasPlayHtKey) {
              envVars.delete('PLAYHT_API_KEY');
              envVars.delete('PLAYHT_USER_ID');
              envVars.delete('PLAYHT_VOICE_ID');
            }
            if (hasElevenLabsKey) {
              envVars.delete('ELEVENLABS_API_KEY');
              envVars.delete('ELEVENLABS_VOICE_ID');
              envVars.delete('USE_MCP_PROXY');
              envVars.delete('MCP_SERVER_URL');
            }
            console.log(`${colors.green}Other TTS providers have been disabled.${colors.reset}`);
          }
          resolve(envVars);
        });
      } else {
        resolve(envVars);
      }
    } else {
      resolve(envVars);
    }
  });
}

/**
 * Main function to fix Azure configuration
 */
async function fixAzureConfig() {
  displayHeader();
  
  console.log(`${colors.cyan}This utility will help you configure Azure Speech Services for the Business Trucks AI Assistant.${colors.reset}`);
  console.log(`${colors.cyan}It will check your current configuration and guide you through any necessary changes.${colors.reset}`);
  console.log();

  try {
    // Read current .env.local file
    let envVars = await readEnvFile();
    
    // Prompt for Azure credentials if needed
    envVars = await promptForAzureCredentials(envVars);
    
    // Check for conflicts with other TTS providers
    envVars = await checkForConflicts(envVars);
    
    // Write updated .env.local file
    await writeEnvFile(envVars);
    
    // Check if Azure configuration is complete
    const isConfigComplete = 
      envVars.has('AZURE_TTS_KEY') && 
      envVars.has('AZURE_TTS_REGION') && 
      envVars.has('AZURE_STT_KEY') && 
      envVars.has('AZURE_STT_REGION') && 
      envVars.get('USE_AZURE_SERVICES') === 'true';
    
    console.log();
    if (isConfigComplete) {
      console.log(`${colors.green}✅ Azure Speech Services configuration is complete!${colors.reset}`);
      console.log(`${colors.green}You can now use Azure for both text-to-speech and speech-to-text functionality.${colors.reset}`);
    } else {
      console.log(`${colors.yellow}⚠️ Azure Speech Services configuration is incomplete.${colors.reset}`);
      console.log(`${colors.yellow}Please check the .env.local file and make sure all required variables are set:${colors.reset}`);
      console.log(`- AZURE_TTS_KEY`);
      console.log(`- AZURE_TTS_REGION`);
      console.log(`- AZURE_STT_KEY`);
      console.log(`- AZURE_STT_REGION`);
      console.log(`- USE_AZURE_SERVICES=true`);
    }
    
    console.log();
    console.log(`${colors.cyan}Would you like to test the Azure configuration now?${colors.reset}`);
    rl.question(`${colors.yellow}Run test (y/n): ${colors.reset}`, (answer) => {
      if (answer.toLowerCase() === 'y') {
        console.log(`${colors.blue}Running Azure TTS test...${colors.reset}`);
        exec('npm run test-azure-tts', (error, stdout, stderr) => {
          console.log(stdout);
          if (error) {
            console.error(`${colors.red}Error testing Azure TTS:${colors.reset}`, stderr);
          } else {
            console.log(`${colors.green}Azure TTS test completed successfully!${colors.reset}`);
          }
          rl.close();
        });
      } else {
        rl.close();
      }
    });
  } catch (error) {
    console.error(`${colors.red}Error:${colors.reset}`, error);
    rl.close();
  }
}

// Run the main function
fixAzureConfig(); 