#!/usr/bin/env node

/**
 * Deploy script for ElevenLabs proxy server
 * This script helps deploy the proxy server to various cloud providers
 * 
 * Usage: node deploy.js [provider]
 * Where provider is one of: azure, heroku, vercel, digital-ocean
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Create interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Get provider from command line args or prompt user
const provider = process.argv[2] || '';

// Main function
async function deploy() {
  console.log('🚀 ElevenLabs Proxy Server Deployment Tool');
  console.log('=========================================');
  
  // If no provider specified, prompt for one
  let targetProvider = provider.toLowerCase();
  if (!targetProvider) {
    targetProvider = await new Promise(resolve => {
      rl.question(`
Please select a deployment provider:
1. Azure App Service
2. Heroku
3. Vercel
4. DigitalOcean App Platform
5. Railway

Enter number (1-5): `, answer => {
        const providers = ['azure', 'heroku', 'vercel', 'digital-ocean', 'railway'];
        const idx = parseInt(answer) - 1;
        resolve(providers[idx] || 'azure');
      });
    });
  }
  
  console.log(`\nPreparing to deploy to ${targetProvider}...`);
  
  // Ensure all files are present
  if (!fs.existsSync(path.join(__dirname, 'package.json'))) {
    console.error('❌ Error: package.json not found. Make sure you are in the correct directory.');
    process.exit(1);
  }
  
  if (!fs.existsSync(path.join(__dirname, 'index.js'))) {
    console.error('❌ Error: index.js not found. Make sure you are in the correct directory.');
    process.exit(1);
  }
  
  // Create provider-specific deployment files if needed
  switch(targetProvider) {
    case 'azure':
      await deployToAzure();
      break;
    case 'heroku':
      await deployToHeroku();
      break;
    case 'vercel':
      await deployToVercel();
      break;
    case 'digital-ocean':
      await deployToDigitalOcean();
      break;
    case 'railway':
      await deployToRailway();
      break;
    default:
      console.log('⚠️ Unknown provider. Defaulting to Azure deployment.');
      await deployToAzure();
  }
  
  // Close readline interface
  rl.close();
}

// Azure deployment
async function deployToAzure() {
  console.log('\n📦 Deploying to Azure App Service...');
  
  // Check if Azure CLI is installed
  try {
    await runCommand('az --version');
  } catch (error) {
    console.error('❌ Azure CLI not found. Please install it first: https://docs.microsoft.com/cli/azure/install-azure-cli');
    return;
  }
  
  // Create web.config for Azure if not exists
  if (!fs.existsSync(path.join(__dirname, 'web.config'))) {
    const webConfig = `<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>
    <webSocket enabled="false" />
    <handlers>
      <add name="iisnode" path="index.js" verb="*" modules="iisnode"/>
    </handlers>
    <rewrite>
      <rules>
        <rule name="StaticContent">
          <action type="Rewrite" url="public{REQUEST_URI}"/>
        </rule>
        <rule name="DynamicContent">
          <conditions>
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="True"/>
          </conditions>
          <action type="Rewrite" url="index.js"/>
        </rule>
      </rules>
    </rewrite>
    <httpErrors existingResponse="PassThrough" />
  </system.webServer>
</configuration>`;
    
    fs.writeFileSync(path.join(__dirname, 'web.config'), webConfig);
    console.log('✅ Created web.config for Azure');
  }
  
  // Ask for Azure resource group and app name
  const resourceGroup = await new Promise(resolve => {
    rl.question('Enter Azure Resource Group name: ', answer => {
      resolve(answer || 'elevenlabs-proxy-rg');
    });
  });
  
  const appName = await new Promise(resolve => {
    rl.question('Enter Azure App Service name: ', answer => {
      resolve(answer || 'elevenlabs-proxy');
    });
  });
  
  // Create .deployment file
  const deploymentConfig = `[config]
SCM_DO_BUILD_DURING_DEPLOYMENT=true`;
  
  fs.writeFileSync(path.join(__dirname, '.deployment'), deploymentConfig);
  
  // Deploy commands
  try {
    console.log('📡 Creating Azure resource group...');
    await runCommand(`az group create --name ${resourceGroup} --location eastus`);
    
    console.log('📡 Creating Azure App Service plan...');
    await runCommand(`az appservice plan create --name ${appName}-plan --resource-group ${resourceGroup} --sku B1 --is-linux`);
    
    console.log('📡 Creating Azure Web App...');
    await runCommand(`az webapp create --name ${appName} --resource-group ${resourceGroup} --plan ${appName}-plan --runtime "NODE|18-lts"`);
    
    console.log('📡 Deploying to Azure...');
    await runCommand(`az webapp deployment source config-local-git --name ${appName} --resource-group ${resourceGroup}`);
    
    // Get Git deployment URL and display instructions
    const deployUrl = await runCommandWithOutput(`az webapp deployment list-publishing-profiles --name ${appName} --resource-group ${resourceGroup} --query "[?publishMethod=='MSDeploy'].publishUrl" -o tsv`);
    
    console.log(`
✅ Deployment setup complete!

To complete deployment, run these commands:
1. git init
2. git add .
3. git commit -m "Initial commit"
4. git remote add azure ${deployUrl.trim()}
5. git push azure master

Your proxy server will be available at: https://${appName}.azurewebsites.net
Make sure to update your .env.local file with:
MCP_SERVER_URL=https://${appName}.azurewebsites.net
USE_MCP_PROXY=true
`);
  } catch (error) {
    console.error('❌ Deployment to Azure failed:', error);
  }
}

// Heroku deployment
async function deployToHeroku() {
  console.log('\n📦 Deploying to Heroku...');
  
  // Check if Heroku CLI is installed
  try {
    await runCommand('heroku --version');
  } catch (error) {
    console.error('❌ Heroku CLI not found. Please install it first: https://devcenter.heroku.com/articles/heroku-cli');
    return;
  }
  
  // Create Procfile if not exists
  if (!fs.existsSync(path.join(__dirname, 'Procfile'))) {
    fs.writeFileSync(path.join(__dirname, 'Procfile'), 'web: node index.js');
    console.log('✅ Created Procfile for Heroku');
  }
  
  // Ask for Heroku app name
  const appName = await new Promise(resolve => {
    rl.question('Enter Heroku app name: ', answer => {
      resolve(answer || 'elevenlabs-proxy');
    });
  });
  
  // Deploy commands
  try {
    console.log('📡 Creating Heroku app...');
    await runCommand(`heroku create ${appName}`);
    
    console.log('📡 Deploying to Heroku...');
    await runCommand('git init');
    await runCommand('git add .');
    await runCommand('git commit -m "Initial commit"');
    await runCommand(`git push heroku master`);
    
    console.log(`
✅ Deployment complete!

Your proxy server is now available at: https://${appName}.herokuapp.com
Make sure to update your .env.local file with:
MCP_SERVER_URL=https://${appName}.herokuapp.com
USE_MCP_PROXY=true
`);
  } catch (error) {
    console.error('❌ Deployment to Heroku failed:', error);
  }
}

// Vercel deployment
async function deployToVercel() {
  console.log('\n📦 Deploying to Vercel...');
  
  // Check if Vercel CLI is installed
  try {
    await runCommand('vercel --version');
  } catch (error) {
    console.error('❌ Vercel CLI not found. Please install it first: npm install -g vercel');
    return;
  }
  
  // Create vercel.json if not exists
  if (!fs.existsSync(path.join(__dirname, 'vercel.json'))) {
    const vercelConfig = {
      "version": 2,
      "builds": [
        {
          "src": "index.js",
          "use": "@vercel/node"
        }
      ],
      "routes": [
        {
          "src": "/(.*)",
          "dest": "index.js"
        }
      ]
    };
    
    fs.writeFileSync(path.join(__dirname, 'vercel.json'), JSON.stringify(vercelConfig, null, 2));
    console.log('✅ Created vercel.json');
  }
  
  // Deploy commands
  try {
    console.log('📡 Deploying to Vercel...');
    await runCommand('vercel --prod');
    
    console.log(`
✅ Deployment instructions:
1. After deployment completes, note your Vercel project URL
2. Update your .env.local file with:
MCP_SERVER_URL=https://your-vercel-project-url
USE_MCP_PROXY=true
`);
  } catch (error) {
    console.error('❌ Deployment to Vercel failed:', error);
  }
}

// DigitalOcean deployment
async function deployToDigitalOcean() {
  console.log('\n📦 Deploying to DigitalOcean App Platform...');
  
  // Create app.yaml for DigitalOcean App Platform
  if (!fs.existsSync(path.join(__dirname, '.do/app.yaml'))) {
    // Create .do directory if it doesn't exist
    if (!fs.existsSync(path.join(__dirname, '.do'))) {
      fs.mkdirSync(path.join(__dirname, '.do'));
    }
    
    const doConfig = `name: elevenlabs-proxy
services:
- name: elevenlabs-proxy
  github:
    branch: main
    deploy_on_push: true
    repo: your-username/elevenlabs-proxy
  http_port: 8080
  instance_count: 1
  instance_size_slug: basic-xxs
  routes:
  - path: /
`;
    
    fs.writeFileSync(path.join(__dirname, '.do/app.yaml'), doConfig);
    console.log('✅ Created .do/app.yaml for DigitalOcean App Platform');
    
    console.log(`
📋 Deploy instructions for DigitalOcean App Platform:
1. Push this code to a GitHub repository
2. Go to https://cloud.digitalocean.com/apps/new
3. Connect your GitHub account and select the repository
4. Follow the setup wizard to deploy
5. After deployment, update your .env.local file with:
MCP_SERVER_URL=https://your-do-app-url
USE_MCP_PROXY=true
`);
  }
}

// Railway deployment
async function deployToRailway() {
  console.log('\n📦 Deploying to Railway...');
  
  // Check if Railway CLI is installed
  try {
    await runCommand('railway --version');
  } catch (error) {
    console.error('❌ Railway CLI not found. Please install it first: npm install -g @railway/cli');
    return;
  }
  
  // Deploy commands
  try {
    console.log('📡 Logging in to Railway...');
    await runCommand('railway login');
    
    console.log('📡 Creating new Railway project...');
    await runCommand('railway init');
    
    console.log('📡 Deploying to Railway...');
    await runCommand('railway up');
    
    console.log(`
✅ Deployment instructions:
1. After deployment completes, get your Railway project URL from the dashboard
2. Update your .env.local file with:
MCP_SERVER_URL=https://your-railway-project-url
USE_MCP_PROXY=true
`);
  } catch (error) {
    console.error('❌ Deployment to Railway failed:', error);
  }
}

// Helper function to run shell commands
function runCommand(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Command error: ${stderr}`);
        reject(error);
        return;
      }
      resolve(stdout);
    });
  });
}

// Helper function to run commands and get output
function runCommandWithOutput(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(stdout);
    });
  });
}

// Start deployment process
deploy().catch(err => {
  console.error('Deployment failed:', err);
  process.exit(1);
}); 