import { NextRequest, NextResponse } from 'next/server';
// Import Azure TTS proxy service
import { textToSpeech, AzureTTSProxyError } from '@/lib/azure-tts-proxy';
import { rateLimit } from '@/lib/rate-limit';
import { LRUCache } from 'lru-cache';

export const runtime = "edge";
export const maxDuration = 25; // Maximum duration in seconds

// Set up a cache for audio responses with a max of 100 items
const cache = new LRUCache<string, ArrayBuffer>({
  max: 100, // Store max 100 audio clips
});

// Rate limiter: max 1 request per 300ms per IP
const limiter = rateLimit({
  interval: 300,
  uniqueTokenPerInterval: 200,
});

export async function POST(request: NextRequest) {
  // Apply rate limiting
  try {
    await limiter.check(100, 'TTS_API'); // 100 requests per interval
  } catch {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 }
    );
  }

  console.log('TTS API request received');

  let text: string;
  let voiceId: string | undefined;

  try {
    // Parse request body
    const requestData = await request.json();
    text = requestData.text;
    voiceId = requestData.voiceId;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json(
        { error: 'Text is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    // Create a cache key based on text and voice
    const cacheKey = `${text}-${voiceId || 'default'}`;
    
    // Check if we have this audio cached
    const cachedAudio = cache.get(cacheKey);
    if (cachedAudio) {
      console.log('Returning cached audio response');
      // Return WAV format
      return new NextResponse(cachedAudio, {
        headers: {
          'Content-Type': 'audio/wav', // Use WAV MIME type
          'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
        },
      });
    }

    // Map voice ID to Azure voice format if needed
    // Default: use ru-RU-SvetlanaNeural (female) or ru-RU-DmitryNeural (male)
    let azureVoiceId = 'ru-RU-SvetlanaNeural'; // Default to female Russian voice
    
    if (voiceId) {
      // Handle custom voice mapping from the front-end format (ru-ru-Female/Male)
      // to Azure format (ru-RU-SvetlanaNeural/DmitryNeural)
      if (voiceId.toLowerCase().includes('male')) {
        azureVoiceId = 'ru-RU-DmitryNeural';
      } else if (voiceId.toLowerCase().includes('female')) {
        azureVoiceId = 'ru-RU-SvetlanaNeural';
      } else if (voiceId.includes('ru-RU-')) {
        // If the voice ID is already in Azure format, use it directly
        azureVoiceId = voiceId;
      }
    }

    // Convert text to speech using Azure TTS proxy
    console.log(`Converting text to audio using Azure TTS: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
    console.log(`Using voice: ${azureVoiceId}`);
    
    // Use WAV format (riff-24khz-16bit-mono-pcm)
    const audioContent = await textToSpeech(text, azureVoiceId, {
      format: 'riff-24khz-16bit-mono-pcm',
      // If in development, allow using local proxy
      useLocalProxy: process.env.NODE_ENV === 'development' && process.env.USE_AZURE_SERVICES !== 'true'
    });
    
    // Check if we received audio data
    if (!audioContent || !(audioContent instanceof ArrayBuffer) || audioContent.byteLength === 0) {
      console.error('No audio data received from Azure TTS');
      return NextResponse.json(
        { error: 'Failed to generate audio from text' },
        { status: 500 }
      );
    }

    // Cache the audio for future requests
    cache.set(cacheKey, audioContent);
    
    // Clean up cache if it grows too large (should be handled by LRU automatically, but just in case)
    if (cache.size > 100) {
      console.log('Cleaning up TTS cache');
      const keysToDelete = Array.from(cache.keys()).slice(0, 10);
      keysToDelete.forEach(key => cache.delete(key));
    }

    // Return the audio data with appropriate headers for WAV
    console.log('Returning audio response');
    return new NextResponse(audioContent, {
      headers: {
        'Content-Type': 'audio/wav', // Use WAV MIME type
        'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
      },
    });
  } catch (error: any) {
    console.error('Error in text-to-speech API:', error);
    
    // Handle specific Azure TTS proxy error types
    if (error instanceof AzureTTSProxyError) {
      return NextResponse.json(
        { 
          error: 'Azure TTS service error',
          details: error.message,
          status: error.statusCode
        },
        { status: error.statusCode }
      );
    }
    
    // For network errors (most commonly timeout or connection refused)
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return NextResponse.json(
        { error: 'Network error connecting to Azure TTS service' },
        { status: 503 }
      );
    }

    // Handle timeout errors
    if (error.name === 'TimeoutError' || error.message?.includes('timeout')) {
      return NextResponse.json(
        { error: 'Azure TTS service timed out' },
        { status: 504 }
      );
    }

    // Generic error catch-all
    return NextResponse.json(
      { error: 'Text-to-speech service error', details: error.message },
      { status: 500 }
    );
  }
}

