#!/usr/bin/env node

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('======================================');
console.log('ElevenLabs MCP Server - Installation');
console.log('======================================\n');

// Check if package.json exists
const packageJsonPath = path.join(__dirname, 'package.json');
if (!fs.existsSync(packageJsonPath)) {
  console.error('Error: package.json not found. Please run this script from the mcp-server directory.');
  process.exit(1);
}

// Install dependencies
console.log('Installing dependencies...');
const installProcess = exec('npm install', { cwd: __dirname });

installProcess.stdout.on('data', (data) => {
  console.log(data.toString());
});

installProcess.stderr.on('data', (data) => {
  console.error(data.toString());
});

installProcess.on('exit', (code) => {
  if (code !== 0) {
    console.error('Error installing dependencies. Please try again or install manually.');
    process.exit(1);
  }
  
  console.log('\n✅ Dependencies installed successfully.');
  
  // Check if .env file exists
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) {
    console.log('\nNo .env file found. Creating from .env.example...');
    try {
      const exampleEnvPath = path.join(__dirname, '.env.example');
      if (fs.existsSync(exampleEnvPath)) {
        fs.copyFileSync(exampleEnvPath, envPath);
        console.log('✅ Created .env file from example.');
      } else {
        console.log('⚠️ No .env.example file found. Creating a basic .env file...');
        fs.writeFileSync(envPath, 'PORT=3002\nVLESS_ENABLED=false\nDEBUG_LEVEL=info\n');
        console.log('✅ Created basic .env file.');
      }
    } catch (err) {
      console.error('Error creating .env file:', err.message);
    }
  }
  
  rl.question('\nWould you like to configure VLESS proxy now? (y/n): ', (answer) => {
    if (answer.toLowerCase() === 'y') {
      console.log('\nLaunching VLESS setup wizard...');
      const setupProcess = exec('node setup-vless.js', { cwd: __dirname });
      
      setupProcess.stdout.on('data', (data) => {
        console.log(data.toString());
      });
      
      setupProcess.stderr.on('data', (data) => {
        console.error(data.toString());
      });
      
      setupProcess.on('exit', (code) => {
        if (code !== 0) {
          console.error('Error running VLESS setup wizard. You can run it manually later using: node setup-vless.js');
        }
        
        finishInstallation();
      });
    } else {
      console.log('\nSkipping VLESS configuration. You can run it later using: node setup-vless.js');
      finishInstallation();
    }
  });
});

function finishInstallation() {
  console.log('\n======================================');
  console.log('Installation complete!');
  console.log('======================================');
  console.log('\nTo start the server:');
  console.log('  npm start');
  console.log('\nTo configure VLESS later:');
  console.log('  node setup-vless.js');
  console.log('\nSee VLESS-SETUP-GUIDE.md for more information on VLESS proxy setup.');
  
  rl.close();
} 