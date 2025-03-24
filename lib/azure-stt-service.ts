/**
 * Azure Speech-to-Text Service Implementation
 * 
 * This service uses Microsoft Azure Cognitive Services for speech-to-text
 * Free tier includes:
 * - 5 hours of speech-to-text per month
 * - Multiple languages (including Russian)
 * - No credit card required for free tier
 * - https://azure.microsoft.com/en-us/services/cognitive-services/speech-services/
 */

// Error types for better error handling
export class AzureSTTAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AzureSTTAuthError';
  }
}

export class AzureSTTLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AzureSTTLimitError';
  }
}

export class AzureSTTNetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AzureSTTNetworkError';
  }
}

/**
 * Get Azure STT credentials from environment
 */
function getAzureCredentials() {
  const key = process.env.AZURE_STT_KEY || process.env.AZURE_TTS_KEY; // Fallback to TTS key if STT key not set
  const region = process.env.AZURE_STT_REGION || process.env.AZURE_TTS_REGION || 'eastus';
  
  if (!key) {
    throw new AzureSTTAuthError('Azure Speech-to-Text key not configured. Please set AZURE_STT_KEY in your environment variables.');
  }
  
  return { key, region };
}

/**
 * Process errors to provide helpful error messages
 */
function handleError(error: any): never {
  const message = error.message || 'Unknown error';
  
  if (message.includes('invalid key') || message.includes('unauthorized') || message.includes('401')) {
    throw new AzureSTTAuthError('Invalid Azure Speech key. Please check your API key.');
  }
  
  if (message.includes('limit') || message.includes('quota') || message.includes('429')) {
    throw new AzureSTTLimitError('Monthly usage limit exceeded for Azure Speech API. The free tier allows 5 hours per month.');
  }
  
  if (message.includes('Failed to fetch') || message.includes('ENOTFOUND') || message.includes('ECONNREFUSED')) {
    throw new AzureSTTNetworkError('Network error connecting to Azure Speech services. Please check your internet connection.');
  }
  
  // Re-throw original error if not handled
  throw error;
}

/**
 * Convert speech audio to text using Azure STT API
 * 
 * @param audioData The audio data as ArrayBuffer 
 * @param language Language code (default is Russian)
 * @param options Additional options
 * @returns The transcribed text
 */
export async function speechToText(
  audioData: ArrayBuffer, 
  language: string = 'ru-RU',
  options?: {
    profanityFilter?: boolean,
    detailed?: boolean
  }
): Promise<string> {
  try {
    const { key, region } = getAzureCredentials();
    const profanityFilter = options?.profanityFilter !== undefined ? options.profanityFilter : true;
    const detailed = options?.detailed !== undefined ? options.detailed : false;
    
    // Create form data with audio content
    const formData = new FormData();
    formData.append('audio', new Blob([audioData]));
    
    // Construct URL with parameters
    const url = new URL(`https://${region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1`);
    
    // Add query parameters
    url.searchParams.append('language', language);
    url.searchParams.append('format', detailed ? 'detailed' : 'simple');
    url.searchParams.append('profanity', profanityFilter ? 'masked' : 'raw');
    
    console.log(`Converting speech to text using Azure STT for language: ${language}`);
    
    // Make request to Azure STT API
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': key,
        'Content-Type': 'audio/wav',
        'Accept': 'application/json'
      },
      body: audioData
    });
    
    // Check for error responses
    if (!response.ok) {
      let errorText = `Azure STT API error: ${response.status} ${response.statusText}`;
      
      try {
        // Try to get more error details if available
        const errorData = await response.json();
        if (errorData && errorData.error) {
          errorText += ` - ${errorData.error.message || JSON.stringify(errorData)}`;
        }
      } catch (e) {
        // Ignore error parsing errors
      }
      
      throw new Error(errorText);
    }
    
    // Parse response
    const data = await response.json();
    
    // Extract text from response
    if (detailed) {
      // Handle detailed response format
      if (data && data.NBest && data.NBest.length > 0) {
        return data.NBest[0].Display || data.NBest[0].Lexical || '';
      }
      return '';
    } else {
      // Handle simple response format
      return data && data.DisplayText ? data.DisplayText : '';
    }
    
  } catch (error) {
    console.error('Error recognizing speech with Azure STT:', error);
    return handleError(error);
  }
}

/**
 * Direct browser-based STT integration 
 * For client-side implementation that connects directly to Azure
 * 
 * @param language Language code for recognition
 * @returns Configuration object with token and region
 */
export async function getSTTToken(language: string = 'ru-RU'): Promise<{token: string, region: string}> {
  try {
    const { key, region } = getAzureCredentials();
    
    // Get authorization token
    const tokenResponse = await fetch(`https://${region}.api.cognitive.microsoft.com/sts/v1.0/issueToken`, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': key,
        'Content-Type': 'application/json'
      }
    });
    
    if (!tokenResponse.ok) {
      throw new Error(`Failed to get Azure token: ${tokenResponse.status} ${tokenResponse.statusText}`);
    }
    
    const token = await tokenResponse.text();
    return { token, region };
    
  } catch (error) {
    console.error('Error getting Azure STT token:', error);
    return handleError(error);
  }
} 