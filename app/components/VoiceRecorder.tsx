"use client"

import React, { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Mic, Send, StopCircle, Volume2, VolumeX, AlertTriangle } from "lucide-react"
import { toast } from "sonner"

// Message type for conversation history
type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function VoiceRecorder() {
  // Recording states
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [lastResponse, setLastResponse] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null)
  const [ttsError, setTtsError] = useState<string | null>(null)
  
  // Conversation history for context
  const [conversationHistory, setConversationHistory] = useState<Message[]>([])

  // Speech recognition reference
  const recognitionRef = useRef<any>(null)

  // Check if speech recognition is supported
  const isSpeechRecognitionSupported = typeof window !== 'undefined' && 
    (window.SpeechRecognition || window.webkitSpeechRecognition)

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition()
        recognition.continuous = false
        recognition.interimResults = true
        recognition.lang = 'ru-RU' // Russian language
        
        // Handle recognition results
        recognition.onresult = (event: any) => {
          const transcript = Array.from(event.results)
            .map((result: any) => result[0])
            .map((result: any) => result.transcript)
            .join('')
          
          setTranscript(transcript)
        }
        
        // Handle recognition end
        recognition.onend = () => {
          setIsRecording(false)
        }
        
        // Handle recognition errors
        recognition.onerror = (event: any) => {
          console.error('Speech recognition error', event.error)
          setIsRecording(false)
          toast.error("Ошибка распознавания речи: " + event.error)
        }
        
        recognitionRef.current = recognition
      }
    }
    
    // Clean up on unmount
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort()
      }
      
      if (currentAudio) {
        currentAudio.pause()
        currentAudio.src = ""
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Function to start recording
  const startRecording = () => {
    if (!recognitionRef.current) {
      toast.error("Распознавание речи не поддерживается в вашем браузере")
      return
    }
    
    try {
      setTranscript("")
      recognitionRef.current.start()
      setIsRecording(true)
    } catch (error) {
      console.error("Error starting recognition:", error)
      toast.error("Не удалось начать запись голоса")
    }
  }
  
  // Function to stop recording
  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
    setIsRecording(false)
  }

  // Function to send voice transcript to API
  const processVoice = async () => {
    if (!transcript.trim()) {
      toast.error("Пожалуйста, запишите сообщение сначала")
      return
    }
    
    if (isProcessing) return
    
    try {
      setIsProcessing(true)
      // Clear any previous TTS errors
      setTtsError(null)
      
      // Add user message to conversation history
      const userMessage: Message = {
        role: "user",
        content: transcript
      }
      
      setConversationHistory(prev => [...prev, userMessage])
      
      // Call our unified voice processing API
      const response = await fetch('/api/process-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: transcript,
          transcript: transcript, // Support both parameter names
          conversationHistory: conversationHistory
        }),
      })
      
      // Parse error responses
      if (!response.ok) {
        let errorMessage = "Ошибка обработки голоса"
        let responseData: any = {}
        
        try {
          responseData = await response.json()
          errorMessage = responseData.error || responseData.details || errorMessage
          
          // Handle subscription error specifically
          if (response.status === 402 || (responseData.error && responseData.error.includes('subscription'))) {
            setTtsError('Для преобразования текста в речь требуется платная подписка Play.ht. Ответы будут доступны только в текстовом формате.')
            
            // If we have a text response, use it
            if (responseData.textResponse) {
              const assistantMessage: Message = {
                role: "assistant",
                content: responseData.textResponse
              }
              setConversationHistory(prev => [...prev, assistantMessage])
              setLastResponse(responseData.textResponse)
              setTranscript("")
              return // Exit early with the text response
            }
          }
        } catch {
          // If we can't parse JSON, use status text
          errorMessage = `Ошибка ${response.status}: ${response.statusText}`
        }
        
        throw new Error(errorMessage)
      }
      
      // Get text response from header if available
      const textResponse = response.headers.get('X-Text-Response')
      let aiResponseText = textResponse ? decodeURIComponent(textResponse) : ""
      
      // Check content type to determine if we have audio or just text
      const contentType = response.headers.get('Content-Type') || ""
      
      if (contentType.includes('audio')) {
        // Handle audio response
        const audioBlob = await response.blob()
        
        if (!audioBlob || audioBlob.size === 0) {
          throw new Error("Получен пустой аудио-ответ")
        }
        
        // Create audio URL and element
        const audioUrl = URL.createObjectURL(audioBlob)
        const audio = new Audio(audioUrl)
        setCurrentAudio(audio)
        
        // Listen for audio events
        audio.addEventListener("ended", () => {
          URL.revokeObjectURL(audioUrl)
          setIsPlaying(false)
          setCurrentAudio(null)
        })
        
        audio.addEventListener("error", (e) => {
          console.error("Audio playback error:", e)
          URL.revokeObjectURL(audioUrl)
          setIsPlaying(false)
          setCurrentAudio(null)
          toast.error("Ошибка воспроизведения аудио")
        })
        
        // Play the audio
        const playPromise = audio.play()
        if (playPromise !== undefined) {
          setIsPlaying(true)
          playPromise.catch(err => {
            console.error("Audio play failed:", err)
            setIsPlaying(false)
            toast.error("Не удалось воспроизвести аудио (возможно, блокировка автовоспроизведения)")
          })
        }
      } else {
        // If we don't have audio, try to parse text response from body
        try {
          const jsonResponse: any = await response.json()
          aiResponseText = jsonResponse.textResponse || jsonResponse.text || "Текстовый ответ без аудио"
          
          if (jsonResponse.error) {
            if (typeof jsonResponse.error === 'string' && jsonResponse.error.includes('subscription')) {
              setTtsError('Для преобразования текста в речь требуется платная подписка Play.ht. Ответы будут доступны только в текстовом формате.')
            } else {
              toast.warning(`Нет аудио: ${jsonResponse.error}`, { duration: 3000 })
            }
          }
        } catch {
          aiResponseText = "Не удалось получить ответ в текстовом формате"
        }
      }
      
      // Add assistant response to conversation history
      if (aiResponseText) {
        const assistantMessage: Message = {
          role: "assistant",
          content: aiResponseText
        }
        setConversationHistory(prev => [...prev, assistantMessage])
        setLastResponse(aiResponseText)
      }
      
      // Clear transcript
      setTranscript("")
      
    } catch (error) {
      console.error("Error processing voice:", error)
      toast.error(error instanceof Error ? error.message : "Ошибка обработки голоса")
    } finally {
      setIsProcessing(false)
    }
  }
  
  // Function to stop audio playback
  const stopAudio = () => {
    if (currentAudio) {
      currentAudio.pause()
      currentAudio.src = ""
      setCurrentAudio(null)
      setIsPlaying(false)
    }
  }

  return (
    <Card className="p-4 shadow-md">
      <div className="mb-4">
        <h2 className="text-xl font-bold mb-2">Голосовое управление</h2>
        <p className="text-sm text-gray-500 mb-4">Нажмите на кнопку микрофона и говорите на русском языке</p>
        
        {ttsError && (
          <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-md mb-3 flex gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">Ограничение текста в речь:</p>
              <p className="text-sm">{ttsError}</p>
            </div>
          </div>
        )}
        
        {transcript && (
          <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-md mb-3">
            <p className="text-sm font-medium">Распознанный текст:</p>
            <p>{transcript}</p>
          </div>
        )}
        
        {lastResponse && (
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md mb-3">
            <div className="flex justify-between items-start">
              <p className="text-sm font-medium">Последний ответ:</p>
              {isPlaying ? (
                <Button variant="ghost" size="sm" onClick={stopAudio} className="h-8 w-8 p-0">
                  <VolumeX className="h-4 w-4" />
                </Button>
              ) : null}
            </div>
            <p>{lastResponse}</p>
          </div>
        )}
        
        <div className="flex space-x-2 mt-4">
          {!isRecording ? (
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={startRecording} 
              disabled={!isSpeechRecognitionSupported || isProcessing}
            >
              <Mic className="h-5 w-5 mr-2" />
              Записать голос
            </Button>
          ) : (
            <Button 
              variant="destructive" 
              className="flex-1"
              onClick={stopRecording}
            >
              <StopCircle className="h-5 w-5 mr-2" />
              Остановить запись
            </Button>
          )}
          
          <Button 
            className="flex-1"
            onClick={processVoice} 
            disabled={!transcript.trim() || isProcessing}
          >
            {isProcessing ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                Обработка...
              </>
            ) : (
              <>
                <Send className="h-5 w-5 mr-2" />
                Отправить
              </>
            )}
          </Button>
        </div>
      </div>
    </Card>
  )
} 