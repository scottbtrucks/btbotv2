# VLESS VPN Integration Guide

This guide walks you through setting up the VLESS VPN integration with the ElevenLabs Proxy Server to bypass geo-restrictions.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Configuration](#configuration)
   - [Automatic Setup](#automatic-setup)
   - [Manual Configuration](#manual-configuration)
   - [Reality TLS Configuration](#reality-tls-configuration)
4. [Testing](#testing)
5. [Running the Server](#running-the-server)
6. [Troubleshooting](#troubleshooting)
7. [Deployment Options](#deployment-options)

## Prerequisites

Before you begin, you need:

1. Node.js (v14 or higher)
2. npm (v6 or higher)
3. Access to a VLESS server (or credentials to connect to one)
   - The VLESS server must be in a region that can access ElevenLabs API
   - Support for either WebSocket or Reality TLS connections
   - It should ideally have TLS/SSL enabled

## Installation

1. **Install dependencies**

   ```bash
   cd mcp-server
   npm install
   ```

2. **Verify installation**

   Ensure all dependencies were installed correctly:
   
   ```bash
   npm list --depth=0
   ```

   You should see all required packages including `ws`, `uuid`, `dotenv`, etc.

## Configuration

### Automatic Setup

The easiest way to configure the VLESS integration is using our setup script:

```bash
npm run setup-vless
```

This interactive script will:
- Check for existing VLESS configuration
- Prompt you for VLESS server details
- Ask whether to use Reality TLS or WebSocket
- Guide you through the appropriate configuration process
- Test the connection to your VLESS server
- Verify access to ElevenLabs API (optional)
- Save configuration to your `.env` file

### Manual Configuration

If you prefer to configure manually:

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit the `.env` file with your VLESS server details.

#### WebSocket Configuration

For WebSocket-based VLESS:

```
# Server Configuration
PORT=3002

# VLESS VPN Configuration
VLESS_ENABLED=true
VLESS_SERVER=your-vless-server.com
VLESS_PORT=443
VLESS_UUID=your-vless-uuid
VLESS_PATH=/websocket
VLESS_TLS=true
VLESS_REALITY_ENABLED=false

# Debugging
DEBUG_LEVEL=info
```

### Reality TLS Configuration

For Reality TLS-based VLESS (such as the Sing-Box configuration):

```
# Server Configuration
PORT=3002

# VLESS VPN Configuration
VLESS_ENABLED=true
VLESS_SERVER=se23.dedushka.top
VLESS_PORT=443
VLESS_UUID=9f5800b2-9954-4208-b1a8-c50c5094dd3d
VLESS_TLS=true

# Reality TLS Configuration 
VLESS_REALITY_ENABLED=true
VLESS_REALITY_PUBLIC_KEY=3INfJobhplZmQNKjoGIbogOhrarZ0a7J9zVOYIui6Bw
VLESS_SERVER_NAME=whatsapp.com
VLESS_FINGERPRINT=chrome

# Debugging
DEBUG_LEVEL=info
```

## Testing

### Test VLESS Connection

After configuration, you can test your VLESS connection without starting the full server:

```bash
npm run setup-vless
```

Select "N" when asked if you want to update the configuration to proceed to the testing phase.

### Debugging

If you encounter issues, increase the debug level in your `.env` file:

```
DEBUG_LEVEL=debug
```

This will provide more detailed logs when running the server.

## Running the Server

Once configured, start the proxy server:

```bash
npm start
```

The server will:
1. Initialize on port 3002 (or as configured)
2. Connect to your VLESS server
3. Begin proxying requests to ElevenLabs API through the VLESS tunnel

### Verifying Operation

1. Check the health endpoint: http://localhost:3002/
   This should return a JSON response including VLESS status.

2. Test with a simple request to the TTS endpoint:
   ```bash
   curl -X POST http://localhost:3002/api/tts \
     -H "Content-Type: application/json" \
     -d '{
       "text": "Hello world",
       "apiKey": "YOUR_ELEVENLABS_API_KEY"
     }' \
     --output test.mp3
   ```

## Troubleshooting

### Common Issues

1. **Connection Error**: "Failed to connect to VLESS server"
   - Verify server address, port, and UUID
   - Check if the server is online and accessible
   - For Reality TLS: Verify public key and server name are correct
   - For WebSocket: Ensure WebSocket path is correct
   - Verify TLS setting matches server configuration

2. **403 Forbidden**: "Access denied - Geo-restriction"
   - Verify VLESS server is in a region with ElevenLabs access
   - Check your ElevenLabs API key permissions

3. **WebSocket Connection Failed**:
   - Ensure your network allows WebSocket connections
   - Check if a firewall is blocking the connection

4. **Reality TLS Issues**:
   - Confirm the public key is correct 
   - Make sure the server name (SNI) matches what the server expects
   - Verify the TLS fingerprint is supported

### Checking Logs

For detailed troubleshooting:

```bash
DEBUG_LEVEL=debug npm start
```

## Deployment Options

### Local Development

The setup above is ideal for local development. Ensure your application's `.env.local` file has:

```
USE_MCP_PROXY=true
MCP_SERVER_URL=http://localhost:3002
```

### Cloud Deployment

To deploy the proxy server to a cloud provider:

1. Prepare your environment variables:
   - Add VLESS configuration to your cloud provider's environment variables
   - Ensure the chosen provider supports the required connection methods (WebSocket or TCP/TLS)

2. Use the deployment script:
   ```bash
   node deploy.js [provider]
   ```

3. Update your application's `.env.local` with the cloud URL:
   ```
   USE_MCP_PROXY=true
   MCP_SERVER_URL=https://your-cloud-deployment-url
   ```

### Security Considerations

- Never commit your `.env` file with VLESS credentials
- Consider using environment secrets in cloud deployments
- Limit access to your proxy server to trusted clients
- For Reality TLS, keep the public key secure

## Next Steps

1. Explore enhancing the VLESS client for better performance
2. Consider implementing authentication for your proxy server
3. Set up monitoring for your proxy to detect issues 