/**
 * Azure Text-to-Speech (TTS) Service
 * 
 * This module provides functionality to convert text to speech using the Azure TTS API.
 * 
 * Free tier: 5 hours of standard voice usage per month
 * 
 * Features:
 * - Supports various voices, languages, and audio formats
 * - SSML support for advanced speech synthesis
 * - Custom error handling
 * - Voice retrieval functions
 */

/**
 * Types for internal use
 */
export interface VoiceInfo {
  id: string;
  name: string;
  gender: 'Male' | 'Female';
  languageCode: string;
  languageName: string;
}

// Custom error classes for better error handling
export class AzureTTSAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AzureTTSAuthError';
  }
}

export class AzureTTSLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AzureTTSLimitError';
  }
}

export class AzureTTSNetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AzureTTSNetworkError';
  }
}

/**
 * Get Azure credentials from environment variables
 * @throws {AzureTTSAuthError} If API key is not configured
 */
function getAzureCredentials() {
  const apiKey = process.env.AZURE_TTS_KEY;
  const region = process.env.AZURE_TTS_REGION || 'eastus';
  
  if (!apiKey) {
    throw new AzureTTSAuthError('Azure TTS API key not configured');
  }
  
  const endpoint = process.env.AZURE_TTS_ENDPOINT || 
    `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`;
  
  return { apiKey, endpoint };
}

/**
 * Handle Azure TTS errors
 */
function handleError(errorMessage: string) {
  console.error(`Azure TTS error: ${errorMessage}`);
  
  // Check for authentication errors
  if (
    errorMessage.includes('401') || 
    errorMessage.includes('403') || 
    errorMessage.includes('authentication') || 
    errorMessage.includes('unauthorized') ||
    errorMessage.includes('Access denied') ||
    errorMessage.includes('invalid subscription key')
  ) {
    throw new AzureTTSAuthError('Invalid or expired Azure TTS key');
  }
  
  // Check for quota/limit errors
  if (
    errorMessage.includes('quota') || 
    errorMessage.includes('limit') || 
    errorMessage.includes('429')
  ) {
    throw new AzureTTSLimitError('Monthly limit for Azure TTS exceeded');
  }
  
  // Check for network errors
  if (
    errorMessage.includes('network') || 
    errorMessage.includes('unreachable') || 
    errorMessage.includes('timeout') ||
    errorMessage.includes('ECONNREFUSED') ||
    errorMessage.includes('ETIMEDOUT')
  ) {
    throw new AzureTTSNetworkError('Network error connecting to Azure TTS service');
  }
  
  // Generic error (will be caught and handled by the caller)
  throw new Error(errorMessage);
}

/**
 * Generate audio from text using Azure TTS
 * 
 * @param text - The text to convert to speech
 * @param voice - The voice to use (e.g. 'ru-RU-SvetlanaNeural')
 * @param options - Additional options for the TTS request
 * @returns ArrayBuffer containing the audio data
 */
export async function generateAudioAzure(
  text: string,
  voice: string = 'ru-RU-SvetlanaNeural',
  options: { 
    format?: string
  } = {}
): Promise<ArrayBuffer> {
  const { apiKey, endpoint } = getAzureCredentials();
  
  // Default format (WAV)
  const outputFormat = options.format || 'riff-24khz-16bit-mono-pcm';
  
  try {
    // Build simple SSML (following the Python example)
    const ssml = `
<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="ru-RU">
  <voice name="${voice}">
    ${text}
  </voice>
</speak>`.trim();
    
    console.log(`Azure TTS request SSML length: ${ssml.length} characters`);
    
    // Make the API request
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': apiKey,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': outputFormat,
        'User-Agent': 'BusinessTrucksAssistant'
      },
      body: ssml
    });
    
    // Check for HTTP errors
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      const statusText = response.statusText || 'Unknown status';
      handleError(`Azure TTS API error: ${response.status} ${statusText} - ${errorText}`);
    }
    
    // Get the audio data as ArrayBuffer
    const audioBuffer = await response.arrayBuffer();
    
    if (!audioBuffer || audioBuffer.byteLength === 0) {
      throw new Error('No audio data received from Azure TTS API');
    }
    
    console.log(`Received ${audioBuffer.byteLength} bytes of audio data from Azure TTS`);
    return audioBuffer;
  } catch (error: any) {
    // Pass through custom errors
    if (
      error instanceof AzureTTSAuthError || 
      error instanceof AzureTTSLimitError || 
      error instanceof AzureTTSNetworkError
    ) {
      throw error;
    }
    
    // Handle network errors
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new AzureTTSNetworkError('Network error connecting to Azure TTS API');
    }
    
    // Handle unknown errors
    handleError(error.message || 'Unknown error in Azure TTS service');
    throw error; // This should never be reached due to handleError, but TypeScript needs it
  }
}

/**
 * Convert text to speech using Azure TTS
 * This is the main function to be used by other modules
 */
export async function textToSpeech(
  text: string, 
  voice: string = 'ru-RU-SvetlanaNeural',
  options: { format?: string } = {}
): Promise<ArrayBuffer> {
  return generateAudioAzure(text, voice, options);
}

/**
 * Get voices for a specific language
 */
export function getVoicesForLanguage(languageCode: string): VoiceInfo[] {
  // For now we just return the recommended voices
  // In a real implementation, you would call the Azure API to get all available voices
  if (languageCode.toLowerCase().startsWith('ru')) {
    return RECOMMENDED_RUSSIAN_VOICES;
  }
  return [];
}

/**
 * Get all available voices
 */
export function getAllVoices(): VoiceInfo[] {
  // For now, just return Russian voices
  // In a real implementation, you would call the Azure API to get all available voices
  return RECOMMENDED_RUSSIAN_VOICES;
}

/**
 * List of recommended Russian voices
 */
export const RECOMMENDED_RUSSIAN_VOICES: VoiceInfo[] = [
  {
    id: 'ru-RU-SvetlanaNeural',
    name: 'Светлана',
    gender: 'Female',
    languageCode: 'ru-RU',
    languageName: 'Russian'
  },
  {
    id: 'ru-RU-DmitryNeural',
    name: 'Дмитрий',
    gender: 'Male',
    languageCode: 'ru-RU',
    languageName: 'Russian'
  },
  {
    id: 'ru-RU-DariyaNeural',
    name: 'Дария',
    gender: 'Female',
    languageCode: 'ru-RU',
    languageName: 'Russian'
  }
]; 