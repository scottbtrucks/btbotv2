import { NextRequest, NextResponse } from "next/server"
import { textToSpeech, AzureTTSProxyError } from "@/lib/azure-tts-proxy"
import { rateLimit } from "@/lib/rate-limit"

export const config = {
  runtime: "edge",
  regions: ["fra1"], // Specify edge regions
  maxDuration: 25, // 25 seconds max duration
}

// Rate limiter: max 1 request per 300ms per IP
const limiter = rateLimit({
  interval: 300,
  uniqueTokenPerInterval: 200,
})

/**
 * Get AI response for voice message
 * @param text The text transcript from voice
 * @returns AI generated text response
 */
async function getAIResponseWithRetry(text: string): Promise<string> {
  // Adding retries for AI service
  let retries = 0;
  const maxRetries = 2;
  const baseDelay = 1000;
  
  while (retries <= maxRetries) {
    try {
      console.log(`Requesting AI response for: "${text}"`);
      const response = await getAIResponse(text);
      console.log(`Got AI response: "${response.substring(0, 50)}${response.length > 50 ? '...' : ''}"`);
      return response;
    } catch (error) {
      retries++;
      console.error(`AI response error (attempt ${retries}/${maxRetries + 1}):`, error);
      
      // If we've reached max retries, throw the error
      if (retries > maxRetries) throw error;
      
      // Wait before retrying (with exponential backoff)
      const delay = baseDelay * Math.pow(2, retries - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // This should never be reached due to the throw in the loop, but TypeScript needs it
  throw new Error('Failed to get AI response after retries');
}

/**
 * Convert text to speech with error handling
 * @param text Text to convert to speech
 * @param voiceId Optional voice ID in format 'language-gender' 
 * @returns ArrayBuffer of audio data
 */
async function convertTextToSpeech(text: string, voiceId?: string): Promise<ArrayBuffer> {
  try {
    console.log(`Converting AI response to speech using Azure TTS: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
    
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
    
    // Using Azure TTS proxy service with WAV format
    const audioContent = await textToSpeech(text, azureVoiceId, {
      format: 'audio-24khz-96kbitrate-mono-mp3',
      // If in development, allow using local proxy
      useLocalProxy: process.env.NODE_ENV === 'development' && process.env.USE_AZURE_SERVICES !== 'true'
    });
    
    if (!audioContent || !(audioContent instanceof ArrayBuffer) || audioContent.byteLength === 0) {
      console.error('No audio data received from Azure TTS service');
      throw new Error('Failed to generate audio from text');
    }
    
    return audioContent;
  } catch (error: any) {
    console.error('Azure TTS conversion error:', error);
    
    // Handle specific errors from Azure TTS proxy service
    if (error instanceof AzureTTSProxyError) {
      throw new Error(`Azure TTS error (${error.statusCode}): ${error.message}`);
    }
    
    // Handle network errors
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Network error connecting to Azure TTS service');
    }
    
    // Re-throw the error
    throw error;
  }
}

// Function to get AI response from OpenRouter API
async function getAIResponse(message: string): Promise<string> {
  try {
    // Get configuration
    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
    const MODEL = process.env.OPENROUTER_MODEL || "anthropic/claude-3-5-sonnet"

    if (!OPENROUTER_API_KEY) {
      throw new Error("OpenRouter API key not configured")
    }

    console.log("Getting AI response with model:", MODEL)
    console.log("User message:", message.substring(0, 50) + "...")

    // Create AbortController for timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 20000) // 20-second timeout

    try {
      // System prompt in Russian
      const systemPrompt = `Вы - Полина, виртуальный ассистент компании Business Trucks, специализирующейся на продаже и обслуживании коммерческого транспорта. 
Ваша цель - помогать клиентам, предоставляя информацию о коммерческих автомобилях, услугах компании и отвечая на вопросы.
Всегда отвечайте на русском языке, даже если вопрос задан на другом языке.
Будьте вежливы, профессиональны и лаконичны в своих ответах.
Не используйте слишком длинные или сложные предложения, говорите простым и понятным языком.
Если вы не знаете ответ на вопрос или вопрос не связан с коммерческим транспортом, вежливо скажите, что вы специализируетесь на темах, связанных с коммерческими автомобилями.`

      // Make request to OpenRouter API
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "HTTP-Referer": "https://business-trucks.vercel.app",
          "X-Title": "Business Trucks Assistant",
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: message },
          ],
          temperature: 0.7,
          max_tokens: 800,
        }),
        signal: controller.signal,
      })
      
      // Clear the timeout
      clearTimeout(timeoutId)

      // Handle response errors
      if (!response.ok) {
        let errorMessage = `Status ${response.status}`
        try {
          const errorData = await response.json()
          errorMessage = errorData.error?.message || errorData.message || errorMessage
        } catch (e) {
          // Ignore JSON parsing errors
        }
        
        console.error(`OpenRouter API error (${response.status}):`, errorMessage)
        throw new Error(`OpenRouter API error: ${errorMessage}`)
      }

      // Parse the response
      const responseData = await response.json()
      console.log("Received response from OpenRouter:", JSON.stringify(responseData).substring(0, 200) + "...")

      // Extract the content
      let content = ""
      if (responseData.choices && responseData.choices.length > 0) {
        content = responseData.choices[0].message?.content || ""
      }

      if (!content) {
        console.error("No content in response:", responseData)
        throw new Error("Empty response from OpenRouter")
      }

      return content
    } catch (error) {
      clearTimeout(timeoutId)
      throw error
    }
  } catch (error: unknown) {
    console.error("Error getting AI response:", error)
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        throw new Error("OpenRouter API request timed out")
      }
      throw error
    }
    throw new Error("Failed to get AI response")
  }
}

export async function POST(request: NextRequest) {
  // Apply rate limiting
  try {
    await limiter.check(100, 'VOICE_API') // 100 requests per interval
  } catch {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 }
    )
  }

  console.log('Process voice API request received')

  try {
    // Parse request body
    const requestData = await request.json()
    const transcript = requestData.message || requestData.transcript
    const voiceId = requestData.voiceId // Get voice ID from request

    if (!transcript || typeof transcript !== 'string' || transcript.trim() === '') {
      return NextResponse.json(
        { error: 'Voice transcript is required and must be a non-empty string' },
        { status: 400 }
      )
    }

    // Get AI response to the transcript
    let aiResponse
    try {
      aiResponse = await getAIResponseWithRetry(transcript.trim())
    } catch (error: any) {
      console.error('Failed to get AI response:', error)
      return NextResponse.json(
        { 
          error: 'Failed to generate AI response',
          details: error.message || 'Unknown error' 
        },
        { status: 502 }
      )
    }

    // Convert AI response to speech using Azure TTS
    let audioContent
    try {
      audioContent = await convertTextToSpeech(aiResponse, voiceId)
    } catch (error: any) {
      console.error('Failed to convert text to speech:', error)
      
      // Check for monthly limit errors
      if (error.message?.includes('monthly limit reached')) {
        return NextResponse.json(
          { 
            error: 'Azure TTS service monthly limit reached',
            details: error.message,
            textResponse: aiResponse // Still return the text response
          },
          { status: 429 }
        )
      }
      
      // For other TTS errors, still return the text response
      return NextResponse.json(
        { 
          error: 'Failed to generate speech',
          details: error.message || 'Unknown error',
          textResponse: aiResponse // Return the text response even if TTS failed
        },
        { status: 500 }
      )
    }

    // Return the audio response with text
    return new NextResponse(audioContent, {
      headers: {
        'Content-Type': 'audio/wav',
        'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
        'X-Text-Response': encodeURIComponent(aiResponse) // Include text response in header
      },
    })
  } catch (error: any) {
    console.error('Process voice API error:', error)
    
    // Generic error handling
    return NextResponse.json(
      { error: 'Failed to process voice request', details: error.message || 'Unknown error' },
      { status: 500 }
    )
  }
}