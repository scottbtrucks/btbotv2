// Enhanced AI chat API implementation with OpenRouter and Gemini model
import { NextResponse } from "next/server"

export const runtime = "nodejs"
export const maxDuration = 60 // Extend timeout for potentially slow API responses

export async function POST(req: Request) {
  try {
    const { messages } = await req.json()

    // Explicitly use OpenRouter with the Gemini 2.0 model as specified in .env
    const apiKey = process.env.OPENROUTER_API_KEY
    const baseUrl = "https://openrouter.ai/api/v1/chat/completions"
    const modelName = process.env.OPENROUTER_MODEL || "google/gemini-2.0-flash-exp:free"
    
    console.log("Using OpenRouter API with model:", modelName)

    if (!apiKey) {
      console.error("No API key configured for OpenRouter")
      return NextResponse.json(
        { 
          error: "OpenRouter API key not configured", 
          message: "Please set OPENROUTER_API_KEY in your environment variables" 
        },
        { status: 500 }
      )
    }

    // System prompt in Russian for Polina
    const systemPrompt = `
      Ты - Полина, AI-ассистент, созданный для помощи в продажах коммерческого транспорта компании Business Trucks.
      
      Твои задачи:
      - Отвечать на вопросы о коммерческом транспорте компании
      - Помогать клиентам выбрать подходящий транспорт для их нужд
      - Предоставлять информацию о ценах, характеристиках и доступности
      - Записывать клиентов на тест-драйв или консультацию
      
      Всегда отвечай на русском языке. Будь вежливой, профессиональной и полезной.
      Используй деловой, но дружелюбный тон. Предлагай конкретные решения.
      
      Твои ответы должны быть четкими и лаконичными, так как они будут преобразованы в речь.
      Избегай длинных списков и сложных конструкций, которые трудно воспринимать на слух.
    `

    // Combined messages with system prompt
    const apiMessages = [
      { role: "system", content: systemPrompt },
      ...messages
    ]

    try {
      console.log(`Making request to OpenRouter API for model: ${modelName}`)
      
      // AI API request with timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout
      
      // OpenRouter specific headers for attribution
      const response = await fetch(baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
          "HTTP-Referer": "https://business-trucks.com", // For OpenRouter attribution
          "X-Title": "Business Trucks Assistant", // For OpenRouter attribution
        },
        body: JSON.stringify({
          model: modelName,
          messages: apiMessages,
          stream: false, // Change to non-streaming mode
          temperature: 0.7,
          max_tokens: 800,
          top_p: 1,
          frequency_penalty: 0,
          presence_penalty: 0
        }),
        signal: controller.signal
      }).finally(() => clearTimeout(timeoutId))

      // Handle API errors
      if (!response.ok) {
        let errorMessage = ""
        
        try {
          const contentType = response.headers.get("Content-Type") || ""
          if (contentType.includes("application/json")) {
            const errorData = await response.json()
            errorMessage = errorData.error?.message || errorData.message || errorData.error || "Unknown API error"
          } else {
            errorMessage = await response.text().then(text => {
              if (text.includes("<!DOCTYPE html>")) {
                return "Received HTML error page instead of API response"
              }
              return text.substring(0, 200) // Limit error text to first 200 chars
            })
          }
        } catch (parseError) {
          errorMessage = `Error status ${response.status}: ${response.statusText}`
        }
        
        console.error(`OpenRouter API error (${response.status}):`, errorMessage)
        
        return NextResponse.json(
          { 
            error: "Error from OpenRouter API", 
            message: errorMessage || "Failed to generate response",
            status: response.status
          },
          { status: response.status }
        )
      }

      // Process the non-streaming response
      const contentType = response.headers.get("Content-Type") || ""
      if (!contentType.includes("application/json")) {
        console.error("Received non-JSON response:", contentType)
        
        // Try to read the response body
        const bodyText = await response.text()
        if (bodyText.includes("<!DOCTYPE html>")) {
          console.error("Received HTML instead of JSON")
          return NextResponse.json(
            { 
              error: "Invalid response format", 
              message: "OpenRouter returned HTML instead of a proper JSON response"
            },
            { status: 500 }
          )
        }
        
        return NextResponse.json(
          { 
            error: "Invalid response format", 
            message: `OpenRouter returned ${contentType} instead of JSON`
          },
          { status: 500 }
        )
      }

      // Parse the JSON response
      const responseData = await response.json()
      console.log("Received response from OpenRouter:", JSON.stringify(responseData).substring(0, 200) + "...")

      // Extract the AI's response content
      let content = ""
      if (responseData.choices && responseData.choices.length > 0) {
        content = responseData.choices[0].message?.content || ""
      }

      if (!content) {
        console.error("No content in response:", responseData)
        return NextResponse.json(
          { 
            error: "Empty response", 
            message: "OpenRouter returned an empty response"
          },
          { status: 500 }
        )
      }

      // Return the AI's response
      return NextResponse.json({
        role: "assistant",
        content: content
      })
    } catch (fetchError: unknown) {
      console.error("OpenRouter API fetch error:", fetchError)
      
      // Specific handling for network errors
      if (fetchError instanceof Error && fetchError.name === "AbortError") {
        return NextResponse.json(
          { 
            error: "Request timeout", 
            message: "OpenRouter API request timed out after 30 seconds" 
          },
          { status: 504 }
        )
      }
      
      return NextResponse.json(
        { 
          error: "Network error connecting to OpenRouter", 
          message: fetchError instanceof Error ? fetchError.message : "Failed to connect to OpenRouter API",
          details: "Please check your internet connection and the OpenRouter service status"
        },
        { status: 500 }
      )
    }
  } catch (error: unknown) {
    console.error("Error in chat API:", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { 
        error: "Failed to process chat request", 
        message: errorMessage 
      },
      { status: 500 }
    )
  }
}

