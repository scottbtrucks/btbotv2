# Business Trucks AI Assistant MCP Server

Media Control Panel (MCP) server for handling voice service integrations and geo-restriction bypassing for the Business Trucks AI Assistant.

## Features

- ElevenLabs TTS proxy with geo-restriction bypass
- VLESS protocol support for reliable connectivity
- Automated deployment scripts
- Connection testing utilities
- Environment configuration management

## Prerequisites

- Node.js 18.x or later
- npm 8.x or later
- (Optional) VLESS-compatible hosting provider for geo-restriction bypass

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd mcp-server
```

2. Install dependencies:
```bash
npm install
```

3. Create environment configuration:
```bash
cp .env.example .env
```

4. Edit `.env` file with your credentials:
```env
# ElevenLabs Configuration
ELEVENLABS_API_KEY=your_api_key_here
ELEVENLABS_VOICE_ID=your_voice_id_here

# VLESS Configuration (if using proxy)
VLESS_ADDRESS=your_vless_server_address
VLESS_PORT=443
VLESS_ID=your_vless_uuid
VLESS_ENCRYPTION=none
```

## Usage

### Starting the Server

Development mode:
```bash
npm run dev
```

Production mode:
```bash
npm start
```

### Testing the Connection

```bash
npm run test-connection
```

### Testing TTS Integration

```bash
npm run test-tts
```

## Deployment

### Standard Deployment

1. Build the project:
```bash
npm run build
```

2. Start the server:
```bash
npm start
```

### VLESS Setup (for Geo-restriction Bypass)

1. Run the VLESS setup script:
```bash
npm run setup-vless
```

2. Follow the prompts to configure your VLESS connection

3. Test the VLESS connection:
```bash
npm run test-vless
```

## API Endpoints

### TTS Proxy

POST `/tts`
- Request body:
  ```json
  {
    "text": "Text to convert to speech",
    "voice_id": "optional_voice_id_override"
  }
  ```
- Response: Audio file (MP3)

### Health Check

GET `/health`
- Response: Server status information

## Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| PORT | Server port | No | 3002 |
| ELEVENLABS_API_KEY | ElevenLabs API key | Yes | - |
| ELEVENLABS_VOICE_ID | Default voice ID | No | - |
| USE_VLESS | Enable VLESS proxy | No | false |
| VLESS_ADDRESS | VLESS server address | If USE_VLESS=true | - |
| VLESS_PORT | VLESS server port | If USE_VLESS=true | 443 |
| VLESS_ID | VLESS UUID | If USE_VLESS=true | - |
| VLESS_ENCRYPTION | VLESS encryption type | If USE_VLESS=true | none |

## Directory Structure

```
mcp-server/
├── src/                 # Source code
├── scripts/            # Deployment and setup scripts
├── tests/              # Test files
└── docs/              # Additional documentation
```

## Contributing

Please read [CONTRIBUTING.md](../CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## Security

For reporting security vulnerabilities, please see [SECURITY.md](../SECURITY.md).

## License

This project is licensed under the MIT License - see the [LICENSE](../LICENSE) file for details.