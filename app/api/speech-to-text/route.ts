import { NextRequest, NextResponse } from 'next/server';
import { speechToText } from '@/lib/azure-stt-service';
import { rateLimit } from '@/lib/rate-limit';

export const runtime = 'edge';
export const maxDuration = 25; // Maximum duration in seconds

// Rate limiter: max 1 request per 300ms per IP
const limiter = rateLimit({
  interval: 300,
  uniqueTokenPerInterval: 200,
});

export async function POST(request: NextRequest) {
  // Apply rate limiting
  try {
    await limiter.check(100, 'STT_API'); // 100 requests per interval
  } catch {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 }
    );
  }

  console.log('STT API request received');

  try {
    // Check if request has the right content type
    const contentType = request.headers.get('Content-Type') || '';
    if (!contentType.includes('audio/') && !contentType.includes('multipart/form-data')) {
      return NextResponse.json(
        { error: 'Invalid content type. Expected audio data.' },
        { status: 400 }
      );
    }

    // Get language parameter if provided (default to Russian)
    const language = request.nextUrl.searchParams.get('language') || 'ru-RU';
    
    // Get the audio data from the request
    const audioData = await request.arrayBuffer();
    
    if (!audioData || audioData.byteLength === 0) {
      return NextResponse.json(
        { error: 'No audio data found in request' },
        { status: 400 }
      );
    }
    
    console.log(`Received audio data (${audioData.byteLength} bytes) for language: ${language}`);

    // Convert speech to text using Azure STT
    const text = await speechToText(audioData, language, {
      profanityFilter: true,
      detailed: false
    });
    
    // Check if we got a transcript
    if (!text || text.trim() === '') {
      return NextResponse.json(
        { 
          error: 'Failed to recognize speech in the audio',
          message: 'No speech could be detected in the provided audio file. Please try again with clearer audio.'
        },
        { status: 422 }
      );
    }

    // Return the recognized text
    return NextResponse.json({
      text,
      language
    });
    
  } catch (error: any) {
    console.error('Error in speech-to-text API:', error);
    
    // Handle specific Azure STT error types
    if (error.name === 'AzureSTTAuthError') {
      return NextResponse.json(
        { 
          error: 'Azure STT authentication failed',
          details: error.message
        },
        { status: 401 }
      );
    }
    
    if (error.name === 'AzureSTTLimitError') {
      return NextResponse.json(
        { 
          error: 'Azure STT service monthly limit reached',
          details: error.message
        },
        { status: 429 }  // 429 Too Many Requests
      );
    }
    
    if (error.name === 'AzureSTTNetworkError') {
      return NextResponse.json(
        { 
          error: 'Network error connecting to Azure STT service',
          details: error.message
        },
        { status: 503 }  // 503 Service Unavailable
      );
    }
    
    // Generic error catch-all
    return NextResponse.json(
      { error: 'Speech-to-text service error', details: error.message },
      { status: 500 }
    );
  }
} 