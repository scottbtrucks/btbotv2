#!/usr/bin/env node

/**
 * Setup script for Business Trucks AI Assistant
 * 
 * This script helps users set up the project by:
 * 1. Installing dependencies
 * 2. Creating an .env.local file from .env.example if it doesn't exist
 * 3. Guiding the user to configure PlayHT
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  underscore: '\x1b[4m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Print a colored message to the console
function colorLog(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Print a section header
function printHeader(title) {
  console.log('\n' + '='.repeat(80));
  colorLog('bright', `  ${title}`);
  console.log('='.repeat(80));
}

// Ask a question and get user input
function ask(question) {
  return new Promise((resolve) => {
    rl.question(`${question} `, (answer) => {
      resolve(answer);
    });
  });
}

// Main setup function
async function setup() {
  printHeader('Business Trucks AI Assistant - Setup');
  
  colorLog('cyan', '\nThis script will help you set up the Business Trucks AI Assistant.');
  colorLog('cyan', 'It will install dependencies and guide you through configuration.\n');
  
  // Step 1: Install dependencies
  const startInstall = await ask('Would you like to install project dependencies? (y/n)');
  if (startInstall.toLowerCase() === 'y') {
    printHeader('Installing Dependencies');
    
    try {
      colorLog('yellow', 'Installing dependencies...');
      execSync('npm install', { stdio: 'inherit' });
      colorLog('green', '✅ Dependencies installed successfully.');
    } catch (error) {
      colorLog('red', '❌ Error installing dependencies:');
      console.error(error.message);
      colorLog('yellow', 'You may need to run npm install manually.');
    }
  }
  
  // Step 2: Create .env.local file if it doesn't exist
  const envPath = path.join(__dirname, '.env.local');
  const envExamplePath = path.join(__dirname, '.env.example');
  
  if (!fs.existsSync(envPath)) {
    printHeader('Environment Configuration');
    
    colorLog('yellow', 'No .env.local file found. Creating one from .env.example...');
    
    try {
      if (fs.existsSync(envExamplePath)) {
        fs.copyFileSync(envExamplePath, envPath);
        colorLog('green', '✅ Created .env.local file from example.');
      } else {
        colorLog('red', '❌ No .env.example file found. Please create .env.local manually.');
      }
    } catch (error) {
      colorLog('red', '❌ Error creating .env.local file:');
      console.error(error.message);
    }
  }
  
  // Step 3: Guide the user to configure PlayHT
  printHeader('PlayHT Configuration');
  
  colorLog('cyan', 'Play.ht is used for text-to-speech functionality in Russian.');
  colorLog('cyan', 'You need to provide your Play.ht API credentials in .env.local\n');
  
  colorLog('yellow', '1. Create a Play.ht account at https://play.ht/');
  colorLog('yellow', '2. Get your API key and User ID from your Play.ht dashboard');
  colorLog('yellow', '3. Add them to your .env.local file:\n');
  
  colorLog('bright', '   PLAYHT_API_KEY=your_playht_api_key_here');
  colorLog('bright', '   PLAYHT_USER_ID=your_playht_user_id_here');
  
  const configNow = await ask('\nWould you like to enter your Play.ht credentials now? (y/n)');
  
  if (configNow.toLowerCase() === 'y') {
    const apiKey = await ask('Enter your Play.ht API Key:');
    const userId = await ask('Enter your Play.ht User ID:');
    
    try {
      let envContent = '';
      
      // Read existing content if the file exists
      if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf8');
        
        // Replace or add PLAYHT_API_KEY
        if (envContent.includes('PLAYHT_API_KEY=')) {
          envContent = envContent.replace(/PLAYHT_API_KEY=.*/, `PLAYHT_API_KEY=${apiKey}`);
        } else {
          envContent += `\nPLAYHT_API_KEY=${apiKey}`;
        }
        
        // Replace or add PLAYHT_USER_ID
        if (envContent.includes('PLAYHT_USER_ID=')) {
          envContent = envContent.replace(/PLAYHT_USER_ID=.*/, `PLAYHT_USER_ID=${userId}`);
        } else {
          envContent += `\nPLAYHT_USER_ID=${userId}`;
        }
      } else {
        // Create a new file with the credentials
        envContent = `PLAYHT_API_KEY=${apiKey}\nPLAYHT_USER_ID=${userId}\n`;
      }
      
      fs.writeFileSync(envPath, envContent);
      colorLog('green', '✅ Play.ht credentials saved to .env.local');
    } catch (error) {
      colorLog('red', '❌ Error saving Play.ht credentials:');
      console.error(error.message);
      colorLog('yellow', 'Please edit your .env.local file manually.');
    }
  }
  
  // Step 4: Finishing up
  printHeader('Setup Complete');
  
  colorLog('green', 'The setup process is complete!\n');
  colorLog('cyan', 'To start the application, run:');
  colorLog('bright', '  npm run dev\n');
  
  colorLog('cyan', 'Then open http://localhost:3000 in your browser.\n');
  
  colorLog('yellow', 'For more information on configuration and usage, see:');
  colorLog('bright', '  README.md             - General information and setup');
  colorLog('bright', '  docs/AZURE-SERVICES-GUIDE.md - Detailed Azure Speech Services guide');
  colorLog('bright', '  docs/PLAYHT-SETUP-GUIDE.md   - Detailed Play.ht configuration guide\n');
  
  rl.close();
}

// Run the setup
setup().catch(error => {
  colorLog('red', `\n❌ An error occurred during setup:`);
  console.error(error);
  rl.close();
}); 