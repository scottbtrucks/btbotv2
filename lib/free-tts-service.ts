/**
 * Free Text-to-Speech Service Implementation
 * 
 * This service uses VOICERSS API which has a free tier (limits apply)
 * Free tier includes:
 * - 350 daily requests
 * - Multiple languages (including Russian)
 * - Multiple voices
 * - No credit card required
 */

// Types for internal use
interface VoiceInfo {
  id: string;
  name: string;
  gender?: string;
  language?: string;
  description?: string;
}

// Error types for better error handling
class FreeTTSAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FreeTTSAuthError';
  }
}

class FreeTTSLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FreeTTSLimitError';
  }
}

class FreeTTSNetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FreeTTSNetworkError';
  }
}

/**
 * Get VoiceRSS API Key from environment or throw error
 */
function getApiKey(): string {
  const apiKey = process.env.VOICERSS_API_KEY;
  if (!apiKey) {
    throw new FreeTTSAuthError('VoiceRSS API key not configured. Please set VOICERSS_API_KEY in your environment variables.');
  }
  return apiKey;
}

/**
 * Process errors to provide helpful error messages
 */
function handleError(error: any): never {
  const message = error.message || 'Unknown error';
  
  if (message.includes('invalid api key') || message.includes('wrong api key')) {
    throw new FreeTTSAuthError('Invalid VoiceRSS API key. Please check your API key.');
  }
  
  if (message.includes('limit') || message.includes('quota')) {
    throw new FreeTTSLimitError('Daily request limit exceeded for VoiceRSS API. The free tier allows 350 requests per day.');
  }
  
  if (message.includes('Failed to fetch') || message.includes('ENOTFOUND') || message.includes('ECONNREFUSED')) {
    throw new FreeTTSNetworkError('Network error connecting to VoiceRSS services. Please check your internet connection.');
  }
  
  // Re-throw original error if not handled
  throw error;
}

/**
 * Convert text to speech using VoiceRSS API
 * 
 * @param text The text to convert to speech
 * @param language Language code (default is Russian)
 * @param voice Voice name (default is female)
 * @param options Additional options like speed
 * @returns ArrayBuffer of the audio content
 */
export async function textToSpeech(
  text: string, 
  language: string = 'ru-ru',
  voice: string = 'Female',
  options?: {
    speed?: number,
    format?: string,
    pitch?: number
  }
): Promise<ArrayBuffer> {
  try {
    const apiKey = getApiKey();
    
    // Adjust parameters for better voice quality
    // Speed: -10 to 10, where negative values are slower, positive are faster
    // For less "grandma-like" sound, use slightly faster speed
    const speed = options?.speed !== undefined ? options.speed : 2; // Slightly faster than default
    
    const format = options?.format || 'mp3';
    
    // Build URL for VoiceRSS API
    const url = new URL('https://api.voicerss.org/');
    const params = {
      key: apiKey,
      src: text,
      hl: language,
      v: voice,
      r: speed.toString(),
      c: format,
      // Use higher quality audio format for better sound
      f: '48khz_16bit_stereo'
    };
    
    Object.keys(params).forEach(key => 
      url.searchParams.append(key, params[key as keyof typeof params])
    );
    
    console.log(`Converting text to speech using VoiceRSS API: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
    
    // Make request to VoiceRSS API
    const response = await fetch(url.toString());
    
    // Check for error responses (VoiceRSS returns errors as audio messages)
    if (!response.ok) {
      throw new Error(`VoiceRSS API error: ${response.status} ${response.statusText}`);
    }
    
    // Check content type to make sure we got audio
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('audio/')) {
      // If not audio, it's likely an error message in JSON or text
      const errorText = await response.text();
      throw new Error(`VoiceRSS API error: ${errorText}`);
    }
    
    // Convert to ArrayBuffer
    const arrayBuffer = await response.arrayBuffer();
    
    // Validate we got actual audio data (VoiceRSS sometimes returns error messages as audio)
    if (!arrayBuffer || arrayBuffer.byteLength === 0) {
      throw new Error('Received empty audio response from VoiceRSS API');
    }
    
    return arrayBuffer;
  } catch (error) {
    console.error('Error generating speech with VoiceRSS:', error);
    return handleError(error);
  }
}

/**
 * List of recommended voice options for Russian language
 */
export const RECOMMENDED_RUSSIAN_VOICES = [
  {
    id: 'ru-ru-Female',
    name: 'Russian Female',
    gender: 'female',
    language: 'ru-ru',
    description: 'Default Russian female voice (improved quality)'
  },
  {
    id: 'ru-ru-Male',
    name: 'Russian Male',
    gender: 'male',
    language: 'ru-ru',
    description: 'Default Russian male voice'
  }
];

/**
 * Get voices available for a language
 */
export function getVoicesForLanguage(language: string = 'ru-ru'): VoiceInfo[] {
  // For VoiceRSS, we have limited voice options available in the free tier
  if (language.startsWith('ru')) {
    return RECOMMENDED_RUSSIAN_VOICES;
  }
  
  // Return empty array for unsupported languages
  return [];
} 