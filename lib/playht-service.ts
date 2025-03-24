/**
 * PlayHT Text-to-Speech service implementation
 * 
 * Due to typings issues with the PlayHT package, we use a more dynamic approach
 * to access the PlayHT functions.
 */

// Import PlayHT directly
// @ts-ignore
const playht = require('playht');

// Types for our internal use
interface VoiceInfo {
  id: string;
  name: string;
  gender?: string;
  language?: string;
  description?: string;
  previewUrl?: string;
  [key: string]: any;
}

// Error types for better error handling
class PlayHTAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PlayHTAuthError';
  }
}

class PlayHTSubscriptionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PlayHTSubscriptionError';
  }
}

class PlayHTNetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PlayHTNetworkError';
  }
}

/**
 * Initialize PlayHT with credentials from environment variables
 */
function initializePlayHT() {
  if (!process.env.PLAYHT_API_KEY || !process.env.PLAYHT_USER_ID) {
    throw new PlayHTAuthError('PlayHT credentials not configured. Please set PLAYHT_API_KEY and PLAYHT_USER_ID in your environment variables.');
  }
  
  // Initialize the PlayHT SDK
  playht.init({
    apiKey: process.env.PLAYHT_API_KEY, 
    userId: process.env.PLAYHT_USER_ID
  });
}

/**
 * Process PlayHT errors to provide more helpful error messages
 */
function handlePlayHTError(error: any): never {
  const message = error.message || 'Unknown error';
  
  if (message.includes('API access is not available on your current plan')) {
    throw new PlayHTSubscriptionError('Your Play.ht account needs to be upgraded to use the API. Visit https://play.ht/pricing to upgrade to a paid plan.');
  }
  
  if (message.includes('Invalid API key') || message.includes('Authentication failed')) {
    throw new PlayHTAuthError('Invalid Play.ht API credentials. Please check your API key and User ID.');
  }
  
  if (message.includes('Failed to fetch') || message.includes('ENOTFOUND') || message.includes('ECONNREFUSED')) {
    throw new PlayHTNetworkError('Network error connecting to Play.ht services. Please check your internet connection.');
  }
  
  // Re-throw original error if not handled
  throw error;
}

/**
 * Get a list of available voices from PlayHT
 */
export async function getAvailableVoices(filterOptions?: { gender?: string, language?: string }): Promise<VoiceInfo[]> {
  try {
    initializePlayHT();
    
    // Get voices
    const voices = await playht.listVoices();
    
    // Filter if options provided
    if (filterOptions) {
      return voices.filter((voice: VoiceInfo) => {
        let match = true;
        if (filterOptions.gender && voice.gender) {
          match = match && voice.gender.toLowerCase() === filterOptions.gender.toLowerCase();
        }
        if (filterOptions.language && voice.language) {
          match = match && voice.language.toLowerCase().includes(filterOptions.language.toLowerCase());
        }
        return match;
      });
    }
    
    return voices;
  } catch (error) {
    console.error('Error fetching PlayHT voices:', error);
    return handlePlayHTError(error);
  }
}

/**
 * Get Russian female voices specifically (useful for our use case)
 */
export async function getRussianFemaleVoices(): Promise<VoiceInfo[]> {
  return getAvailableVoices({ gender: 'female', language: 'russian' });
}

/**
 * Convert text to speech using PlayHT
 * 
 * @param text The text to convert to speech
 * @param voiceId The voice ID to use (default is a good Russian female voice if set in env)
 * @param options Additional TTS options
 * @returns ArrayBuffer of the audio content
 */
export async function textToSpeech(
  text: string, 
  voiceId?: string,
  options?: {
    speed?: number,
    quality?: 'draft' | 'low' | 'medium' | 'high' | 'premium',
    temperature?: number
  }
): Promise<ArrayBuffer> {
  try {
    initializePlayHT();
    
    // Use provided voice ID or default from environment variables
    const voice = voiceId || process.env.PLAYHT_VOICE_ID || 's3://voice-cloning-zero-shot/d9ff78ba-d016-47f6-b0ef-dd630f59414e/female-cs/manifest.json';
    
    console.log(`Converting text to speech with voice: ${voice}`);
    
    // Use same format as the working test-playht.js
    const audioResponse = await playht.generate({
      text: text,
      voiceId: voice,
      quality: options?.quality || 'draft',
      outputFormat: "mp3",
      temperature: options?.temperature || 0.7,
      speed: options?.speed || 1.0,
    });
    
    console.log(`Audio generated with URL: ${audioResponse.audioUrl}`);
    
    // Fetch the audio data from the URL
    const response = await fetch(audioResponse.audioUrl);
    if (!response.ok) {
      throw new Error(`Failed to download audio: ${response.status} ${response.statusText}`);
    }
    
    // Convert to ArrayBuffer
    const arrayBuffer = await response.arrayBuffer();
    return arrayBuffer;
  } catch (error) {
    console.error('Error generating speech with PlayHT:', error);
    return handlePlayHTError(error);
  }
}

/**
 * Get a list of recommended Russian voices for our application
 */
export const RECOMMENDED_RUSSIAN_VOICES = [
  {
    id: 's3://voice-cloning-zero-shot/d9ff78ba-d016-47f6-b0ef-dd630f59414e/female-cs/manifest.json',
    name: 'Natasha',
    gender: 'female',
    description: 'Clear, professional female Russian voice'
  },
  {
    id: 's3://voice-cloning-zero-shot/8a76116e-2a50-4166-9bb0-0fb43a674373/male-cs/manifest.json',
    name: 'Viktor',
    gender: 'male',
    description: 'Deep, authoritative male Russian voice'
  },
  {
    id: 's3://voice-cloning-zero-shot/7c73835f-c6c9-4b5e-8c91-0aaa63513a73/female-cs/manifest.json',
    name: 'Elena',
    gender: 'female',
    description: 'Warm, friendly female Russian voice'
  }
]; 