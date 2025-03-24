# Azure Speech Services Integration Guide

This guide provides detailed instructions for setting up and using Azure Speech Services for text-to-speech (TTS) and speech-to-text (STT) functionality in the Business Trucks AI Assistant.

## Overview

Azure Speech Services provides high-quality, natural-sounding text-to-speech and accurate speech-to-text capabilities with support for the Russian language. This is the recommended service provider for production use due to its reliability, quality, and reasonable pricing.

Benefits of Azure Speech Services:
- High-quality neural voices in Russian
- Accurate speech-to-text recognition for Russian
- Generous free tier (5 hours of STT and 500,000 characters of TTS per month)
- Reliable service with enterprise-grade SLAs
- Comprehensive error handling and diagnostics

## Creating an Azure Speech Services Account

1. If you don't have an Azure account, create one at [https://azure.microsoft.com/free/](https://azure.microsoft.com/free/).

2. Once logged in to the Azure portal:
   - Click "Create a resource"
   - Search for "Speech Services"
   - Click "Create"

3. In the creation form:
   - Choose your subscription
   - Create or select a resource group
   - Select a region (choose one close to your users for best performance)
   - Name your Speech service instance
   - Select the "Free F0" pricing tier (or Standard S0 for production)
   - Click "Review + create" and then "Create"

4. Once deployment is complete, go to your Speech Services resource and:
   - Navigate to "Keys and Endpoint" from the left menu
   - Copy either "KEY 1" or "KEY 2" (they work interchangeably)
   - Note your "Location/Region" value

## Configuration

### Manual Configuration

Add the following to your `.env.local` file:

```
# Azure Speech Services (TTS & STT)
AZURE_TTS_KEY=your_azure_key_here
AZURE_TTS_REGION=your_region_here  # e.g., eastus, westeurope
AZURE_STT_KEY=your_azure_key_here  # Can be the same as TTS key
AZURE_STT_REGION=your_region_here  # Can be the same as TTS region
USE_AZURE_SERVICES=true
```

Notes:
- You can use the same key for both TTS and STT services
- The region should match where you created your Speech Services resource
- Setting `USE_AZURE_SERVICES=true` will enable Azure for both TTS and STT

### Automatic Configuration

We provide a utility script to help you configure Azure services:

```bash
npm run fix-azure
```

This script will:
1. Check if Azure keys are configured correctly
2. Ensure `USE_AZURE_SERVICES` is set to true
3. Detect and help resolve conflicts with other TTS providers
4. Create a properly configured `.env.local` file if it doesn't exist

## Available Russian Voices

Azure provides several high-quality Russian voices. The most commonly used are:

| Voice Name | Gender | Voice Type | Voice ID |
|------------|--------|------------|----------|
| Svetlana   | Female | Neural     | ru-RU-SvetlanaNeural |
| Dmitry     | Male   | Neural     | ru-RU-DmitryNeural |
| Dariya     | Female | Neural     | ru-RU-DariyaNeural |
| Pavel      | Male   | Neural     | ru-RU-PavelNeural |

These voices are automatically available when using Azure Speech Services; you don't need to configure them separately.

### Comparing Voice Quality

To generate samples for all available Russian voices:

```bash
npm run test-azure-voices
```

This will create audio samples in the `voice-samples` directory. Listen to these samples to determine which voice sounds best for your use case.

## Testing Azure Integration

### Testing Text-to-Speech

1. Make sure your `.env.local` file is configured with Azure credentials
2. Run the TTS test:
   ```bash
   npm run test-azure-tts
   ```
3. If successful, a file named `test-audio-azure.mp3` will be created with Russian speech.

### Testing Speech-to-Text

To test the speech recognition capabilities:

```bash
npm run test-azure-stt
```

This will use an existing audio file to test speech recognition.

### Testing Closed-Loop Integration

To test the complete process (TTS → STT):

```bash
npm run test-azure-integration
```

This test will:
1. Convert sample text to speech with Azure TTS
2. Save the audio file
3. Process the audio file with Azure STT
4. Compare the original text with the recognized text to verify accuracy

## Understanding Azure's Free Tier

Azure's free tier (F0) includes:
- 5 hours of speech-to-text per month
- 500,000 characters of text-to-speech per month (approximately 50,000 words)
- 1 concurrent request

This is generally sufficient for development and testing. For production use with higher traffic, you can upgrade to the Standard (S0) tier which offers pay-as-you-go pricing:
- Speech-to-text: $1 per audio hour
- Text-to-speech (neural voices): $16 per 1M characters

## Error Handling

The application has comprehensive error handling for Azure services, including:

- Authentication errors (invalid key)
- Region errors (incorrect region)
- Service availability issues
- Request limit errors
- Malformed request errors

When errors occur, check the server logs for detailed diagnostic information.

## Troubleshooting

### Common TTS Issues:

1. **Authentication failed**: Verify your Azure key and region in `.env.local`
2. **Region not found**: Ensure the region matches where your Speech Service was created
3. **Monthly limit reached**: If using the free tier, you may have exceeded the 500,000 character limit
4. **Voice not available**: Ensure you're using a valid voice ID for Russian

### Common STT Issues:

1. **Authentication failed**: Verify your Azure key and region in `.env.local`
2. **Region not found**: Ensure the region matches where your Speech Service was created
3. **Monthly limit reached**: If using the free tier, you may have exceeded the 5-hour limit
4. **No speech detected**: Ensure your audio contains clear speech and is not too noisy
5. **Audio format issues**: The service expects audio with clear speech (PCM or MP3 format recommended)

### Configuration Issues

If you're having trouble with your Azure configuration:

1. Run the repair utility: `npm run fix-azure`
2. Follow the prompts to fix common configuration issues
3. Test your configuration with `npm run test-azure-tts`

### Debug API Route

Use the debug API route to verify your Azure configuration:

```
http://localhost:3000/api/debug
```

This will show if Azure services are properly configured and available.

## Advanced Configuration

### Voice Selection Logic

The application automatically selects an appropriate voice based on the requested gender:

- For female voice requests, `ru-RU-SvetlanaNeural` is used by default
- For male voice requests, `ru-RU-DmitryNeural` is used by default

You can modify this behavior in the `text-to-speech/route.ts` file if needed.

### Custom SSML

The service supports Speech Synthesis Markup Language (SSML) for advanced control of speech synthesis, including:

- Adjusting speaking rate and pitch
- Adding pauses and emphasis
- Changing pronunciation

See the `textToSpeech` function in `azure-tts-service.ts` for implementation details.

## Additional Resources

- [Azure Speech Services Documentation](https://docs.microsoft.com/en-us/azure/cognitive-services/speech-service/)
- [Supported Languages](https://docs.microsoft.com/en-us/azure/cognitive-services/speech-service/language-support)
- [Azure Speech Studio](https://speech.microsoft.com/) - A web interface for testing voices and recognition
- [Azure Pricing Calculator](https://azure.microsoft.com/en-us/pricing/calculator/) - Calculate potential costs for higher usage 