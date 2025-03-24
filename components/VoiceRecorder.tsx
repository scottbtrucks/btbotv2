"use client"

import React, { useState, useRef, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { toast } from "sonner"

// Import the new components
import { VoiceSettings } from "@/components/VoiceSettings"
import { VoiceRecorderControls } from "@/components/VoiceRecorderControls"
import { VoiceTranscript } from "@/components/VoiceTranscript"
import { VoicePlayback } from "@/components/VoicePlayback"
import { VoiceStatusIndicator } from "@/components/VoiceStatusIndicator"

// Message type for conversation history
type Message = {
  role: "user" | "assistant";
  content: string;
};

// Welcome message constant
const WELCOME_MESSAGE = "Здравствуйте! Я Полина, виртуальный ассистент Business Trucks. Чем я могу вам помочь сегодня? Вы можете задать мне вопрос о коммерческом транспорте.";

export function VoiceRecorder() {
  // State for UI
  const [transcript, setTranscript] = useState("")
  const [lastResponse, setLastResponse] = useState<string>(WELCOME_MESSAGE)
  const [hasPlayedWelcome, setHasPlayedWelcome] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // State for recording and processing
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null)
  const [conversationHistory, setConversationHistory] = useState<Message[]>([])
  const [isSpeechRecognitionSupported, setIsSpeechRecognitionSupported] = useState(true)
  const [voiceGender, setVoiceGender] = useState<'Female' | 'Male'>('Female')

  // Speech recognition reference
  const recognitionRef = useRef<any>(null)

  // Initialize speech recognition support check (separate to avoid hydration issues)
  useEffect(() => {
    // Check for speech recognition support on client side
    setIsSpeechRecognitionSupported(
      typeof window !== 'undefined' && 
      !!(window.SpeechRecognition || window.webkitSpeechRecognition)
    );
  }, []);

  // Play welcome message on first load
  useEffect(() => {
    // Initialize conversation history with welcome message
    const welcomeMessage: Message = {
      role: "assistant",
      content: WELCOME_MESSAGE
    };
    setConversationHistory([welcomeMessage]);
    
    // Delay welcome audio slightly to ensure DOM is fully loaded
    const welcomeTimer = setTimeout(() => {
      if (!hasPlayedWelcome) {
        playWelcomeMessage().catch(err => {
          console.error("Failed to play welcome message:", err);
          // Make sure we don't try again even if it fails
          setHasPlayedWelcome(true);
        });
      }
    }, 1500);
    
    return () => {
      clearTimeout(welcomeTimer);
      stopAudio(); // Clean up any playing audio on unmount
    };
  }, []);

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
        
        // Handle recognition errors with improved error messages
        recognition.onerror = (event: any) => {
          console.error('Speech recognition error', event.error, event)
          setIsRecording(false)
          
          // Provide specific feedback based on error type
          switch(event.error) {
            case 'network':
              toast.error("Ошибка сети при распознавании речи. Проверьте подключение к интернету.");
              break;
            case 'not-allowed':
            case 'permission-denied':
              toast.error("Доступ к микрофону запрещен. Пожалуйста, разрешите доступ к микрофону в настройках браузера.");
              break;
            case 'no-speech':
              toast.error("Речь не распознана. Пожалуйста, говорите громче или проверьте работу микрофона.");
              break;
            case 'audio-capture':
              toast.error("Не удалось получить аудио с микрофона. Проверьте, подключен ли микрофон.");
              break;
            case 'aborted':
              // This is an expected error when we manually stop recording
              break;
            default:
              toast.error(`Ошибка распознавания речи: ${event.error}`);
          }
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

  // Helper function to check if audio format is supported by the browser
  const canPlayAudioType = (type: string): boolean => {
    if (typeof window === 'undefined') return false;
    
    const audio = document.createElement('audio');
    // Return if this audio type can be played probably or maybe
    return !!(audio.canPlayType && (
      audio.canPlayType(type).replace(/no/, '') !== ''
    ));
  };
  
  // Function to create and play audio
  const createAndPlayAudio = (audioBlob: Blob, mimeType: string = 'audio/mpeg'): Promise<void> => {
    return new Promise((resolve, reject) => {
      // Check if we received a valid blob
      if (!audioBlob || audioBlob.size === 0) {
        toast.error("Получен пустой аудио-файл");
        reject(new Error("Empty audio blob"));
        return;
      }
      
      // Always ensure we're using a supported mime type
      // Force audio/mpeg which has better browser support than audio/mp3
      const safeType = 'audio/mpeg';
      
      console.log(`Creating audio with blob size ${audioBlob.size} bytes, original type: ${audioBlob.type || 'unknown'}`);
      
      // Create a new blob with the correct mime type if needed
      let blobToPlay = audioBlob;
      if (!audioBlob.type || audioBlob.type !== safeType) {
        console.log(`Converting blob to ${safeType}`);
        blobToPlay = new Blob([audioBlob], { type: safeType });
      }
      
      // Create audio URL
      const audioUrl = URL.createObjectURL(blobToPlay);
      
      // Create audio element with proper error handling
      try {
        const audio = new Audio();
        
        // Set up error handler before setting source
        audio.onerror = (e) => {
          const errorCode = audio.error ? audio.error.code : "unknown";
          const errorMessage = audio.error ? audio.error.message : "unknown error";
          console.error("Audio error:", e, "Code:", errorCode, "Message:", errorMessage);
          
          // Cleanup
          URL.revokeObjectURL(audioUrl);
          setIsPlaying(false);
          setCurrentAudio(null);
          
          // Try fallback approach
          tryAudioFallback(audioBlob, resolve, reject);
        };
        
        // Set up success handler
        audio.oncanplaythrough = () => {
          console.log("Audio is ready to play");
          
          // Try to play the audio
          try {
            const playPromise = audio.play();
            if (playPromise !== undefined) {
              setIsPlaying(true);
              setCurrentAudio(audio);
              
              playPromise.then(() => {
                console.log("Audio playback started successfully");
              }).catch(err => {
                console.error("Audio play failed:", err);
                URL.revokeObjectURL(audioUrl);
                setIsPlaying(false);
                setCurrentAudio(null);
                
                // Try fallback approach
                tryAudioFallback(audioBlob, resolve, reject);
              });
            }
          } catch (playError) {
            console.error("Error starting playback:", playError);
            URL.revokeObjectURL(audioUrl);
            
            // Try fallback approach
            tryAudioFallback(audioBlob, resolve, reject);
          }
        };
        
        // Set up completion handler
        audio.onended = () => {
          console.log("Audio playback completed");
          URL.revokeObjectURL(audioUrl);
          setIsPlaying(false);
          setCurrentAudio(null);
          resolve();
        };
        
        // Set source and load audio
        audio.src = audioUrl;
        audio.load();
      } catch (audioCreateError) {
        console.error("Error creating audio element:", audioCreateError);
        URL.revokeObjectURL(audioUrl);
        
        // Try fallback approach
        tryAudioFallback(audioBlob, resolve, reject);
      }
    });
  };
  
  // Helper function to try fallback audio playback method
  const tryAudioFallback = (audioBlob: Blob, resolve: () => void, reject: (error: Error) => void) => {
    try {
      console.log("Attempting fallback audio playback method");
      
      // Create a second blob with a different MIME type
      const fallbackBlob = new Blob([audioBlob], { type: 'audio/mp3' });
      const fallbackUrl = URL.createObjectURL(fallbackBlob);
      
      const fallbackAudio = new Audio();
      
      // Set up error handler for fallback
      fallbackAudio.onerror = () => {
        console.error("Fallback audio playback also failed");
        URL.revokeObjectURL(fallbackUrl);
        
        // At this point, both methods have failed
        toast.error("Не удалось воспроизвести аудио. Пожалуйста, проверьте совместимость браузера.");
        reject(new Error("All audio playback methods failed"));
      };
      
      // Set up success handler for fallback
      fallbackAudio.oncanplaythrough = () => {
        try {
          const fallbackPlayPromise = fallbackAudio.play();
          setIsPlaying(true);
          setCurrentAudio(fallbackAudio);
          
          if (fallbackPlayPromise) {
            fallbackPlayPromise
              .then(() => console.log("Fallback audio playback started"))
              .catch(fallbackErr => {
                console.error("Fallback playback also failed:", fallbackErr);
                URL.revokeObjectURL(fallbackUrl);
                setIsPlaying(false);
                setCurrentAudio(null);
                
                // Both methods have failed, show error
                toast.error("Не удалось воспроизвести аудио. Попробуйте другой браузер.");
                reject(new Error("All audio playback methods failed"));
              });
          }
        } catch (fallbackPlayError) {
          console.error("Error starting fallback playback:", fallbackPlayError);
          URL.revokeObjectURL(fallbackUrl);
          setIsPlaying(false);
          setCurrentAudio(null);
          reject(new Error(`Fallback playback error: ${fallbackPlayError instanceof Error ? fallbackPlayError.message : String(fallbackPlayError)}`));
        }
      };
      
      // Set up completion handler for fallback
      fallbackAudio.onended = () => {
        console.log("Fallback audio playback completed");
        URL.revokeObjectURL(fallbackUrl);
        setIsPlaying(false);
        setCurrentAudio(null);
        resolve();
      };
      
      // Start loading fallback audio
      fallbackAudio.src = fallbackUrl;
      fallbackAudio.load();
      
    } catch (fallbackError) {
      console.error("Fallback approach failed:", fallbackError);
      toast.error("Не удалось воспроизвести аудио после нескольких попыток.");
      reject(new Error(`Fallback approach failed: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`));
    }
  };

  // Функция воспроизведения приветственного сообщения
  const playWelcomeMessage = async () => {
    if (!hasPlayedWelcome) {
      try {
        console.log("Fetching welcome message audio...")
        setIsProcessing(true)
        setError(null)

        // Make a request to the text-to-speech API
        const response = await fetch("/api/text-to-speech", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ 
            text: WELCOME_MESSAGE,
            voiceId: `ru-ru-${voiceGender}` // Add voice selection
          }),
        })

        // Set the welcome message text and add it to conversation
        setLastResponse(WELCOME_MESSAGE)
        const welcomeMessage: Message = {
          role: "assistant",
          content: WELCOME_MESSAGE
        }
        setConversationHistory((prev) => [...prev, welcomeMessage])

        // Check if response is ok
        if (!response.ok) {
          let errorText = "Ошибка получения аудио"
          try {
            // Try to parse error as JSON
            const errorData = await response.json()
            errorText = errorData.message || errorData.error || errorText
            console.error("Welcome message audio error:", errorData)
          } catch (parseError) {
            // If not JSON, try to get text
            errorText = await response.text() || errorText
            console.error("Welcome message raw error:", errorText)
          }

          // Show error to user
          setError(`Не удалось загрузить аудио: ${errorText}`)
          toast.error(`Не удалось загрузить аудио: ${errorText}`)
          
          // Continue with the text version only
          setHasPlayedWelcome(true)
          setIsProcessing(false)
          return
        }

        // Check for empty response
        const contentLength = response.headers.get("Content-Length")
        if (contentLength && parseInt(contentLength, 10) === 0) {
          console.warn("Received empty audio data")
          toast.warning("Аудио недоступно, но вы можете прочитать приветствие")
          setHasPlayedWelcome(true)
          setIsProcessing(false)
          return
        }

        // Get audio blob and content type
        const audioBlob = await response.blob()
        const contentType = response.headers.get("Content-Type") || "audio/wav"
        
        console.log(`Received welcome audio: size ${audioBlob.size} bytes, type: ${contentType}`)

        // Play audio with the enhanced createAndPlayAudio function
        await createAndPlayAudio(audioBlob, contentType)
        
        // Mark welcome message as played
        setHasPlayedWelcome(true)
      } catch (error) {
        console.error("Error playing welcome message:", error)
        setError("Не удалось воспроизвести приветствие, но вы можете прочитать его текст")
        toast.error("Не удалось воспроизвести приветствие, но вы можете прочитать его текст")
        
        // Ensure welcome message is marked as played even if audio fails
        setHasPlayedWelcome(true)
      } finally {
        setIsProcessing(false)
      }
    }
  }

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

  // Add toggle function for voice gender
  const toggleVoiceGender = () => {
    const newGender = voiceGender === 'Female' ? 'Male' : 'Female';
    setVoiceGender(newGender);
    toast.success(`Голос изменен на ${newGender === 'Female' ? 'женский' : 'мужской'}`);
  };

  // Function to process the speech-to-text result
  const processResponse = async (message: string) => {
    if (!message.trim()) return
    
    try {
      console.log("Processing user message:", message)
      setIsProcessing(true)
      
      // Add user message to conversation history
      const userMessage: Message = { role: "user", content: message }
      setConversationHistory(prev => [...prev, userMessage])
      
      // Make API request to process the message
      const response = await fetch("/api/process-voice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          message,
          voiceId: `ru-ru-${voiceGender}` // Add voice selection
        }),
      })
      
      // Check for unsuccessful responses
      if (!response.ok) {
        let errorText = "Ошибка получения ответа"
        try {
          // Try to parse error as JSON
          const errorData = await response.json()
          errorText = errorData.message || errorData.error || errorText
          console.error("Processing response error:", errorData)
        } catch (parseError) {
          // If not JSON, try to get text
          errorText = await response.text() || errorText
          console.error("Processing raw error:", errorText)
        }
        
        // Show error to user
        toast.error(`Не удалось получить ответ: ${errorText}`)
        setIsProcessing(false)
        return
      }
      
      // Check if we received audio response
      const contentType = response.headers.get("Content-Type") || ""
      
      // Get text response from header or try to parse JSON
      let textResponse = ""
      if (response.headers.has("X-Text-Response")) {
        textResponse = decodeURIComponent(response.headers.get("X-Text-Response") || "")
      }
      
      // If we have audio (either WAV or MP3)
      if (contentType.includes("audio")) {
        console.log(`Received audio response with content type: ${contentType}`)
        
        // Check for empty response
        const contentLength = response.headers.get("Content-Length")
        if (contentLength && parseInt(contentLength, 10) === 0) {
          console.warn("Received empty audio data")
          
          // If we have text but no audio, show the text
          if (textResponse) {
            // Add assistant response to conversation
            const assistantMessage: Message = { 
              role: "assistant", 
              content: textResponse 
            }
            setLastResponse(textResponse)
            setConversationHistory(prev => [...prev, assistantMessage])
            toast.warning("Аудио недоступно, показан текстовый ответ")
          } else {
            toast.error("Получен пустой ответ")
          }
          
          setIsProcessing(false)
          return
        }
        
        // Get audio blob
        const audioBlob = await response.blob()
        console.log(`Received audio response: size ${audioBlob.size} bytes, type: ${contentType}`)
        
        // Try to get full text from the response headers if available
        if (!textResponse) {
          try {
            // Try to fetch the text from a hidden header or body property
            const textResponseHeader = response.headers.get("X-Full-Text-Response")
            if (textResponseHeader) {
              textResponse = decodeURIComponent(textResponseHeader)
            } else if (audioBlob.size > 0) {
              // We have audio but no text, get it from the text-to-speech header
              textResponse = response.headers.get("X-Text-Response") 
                ? decodeURIComponent(response.headers.get("X-Text-Response") || "")
                : "Аудио ответ"
            }
          } catch (headerError) {
            console.warn("Could not extract text from response headers:", headerError)
          }
        }
        
        // Add response to conversation history
        if (textResponse) {
          const assistantMessage: Message = { 
            role: "assistant", 
            content: textResponse 
          }
          setLastResponse(textResponse)
          setConversationHistory(prev => [...prev, assistantMessage])
        }
        
        // Play the audio response
        try {
          await createAndPlayAudio(audioBlob, contentType)
        } catch (audioError) {
          console.error("Error playing audio response:", audioError)
          toast.error("Не удалось воспроизвести аудио ответ, но вы можете прочитать текст ответа")
        }
      } else if (contentType.includes("json")) {
        // Parse JSON response
        const data = await response.json()
        const assistantResponse = data.response || data.message || data.text || "Получен пустой ответ"
        
        // Add assistant response to conversation
        const assistantMessage: Message = { 
          role: "assistant", 
          content: assistantResponse 
        }
        setLastResponse(assistantResponse)
        setConversationHistory(prev => [...prev, assistantMessage])
        
        // Inform user that only text is available
        toast.info("Доступен только текстовый ответ")
      } else {
        // Unknown response type
        console.warn("Received unknown response type:", contentType)
        toast.error("Получен ответ в неизвестном формате")
      }
    } catch (error) {
      console.error("Error processing voice message:", error)
      toast.error(`Ошибка обработки: ${error instanceof Error ? error.message : String(error)}`)
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

  // Function to play the last response
  const playLastResponse = () => {
    if (!isPlaying && !isProcessing && lastResponse) {
      // Create a request to convert the last response to speech
      fetch("/api/text-to-speech", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          text: lastResponse,
          voiceId: `ru-ru-${voiceGender}`
        }),
      })
      .then(response => {
        if (!response.ok) {
          throw new Error("Failed to get audio response");
        }
        // Get content type from response headers
        const contentType = response.headers.get("Content-Type") || "audio/wav";
        return response.blob().then(blob => ({ blob, contentType }));
      })
      .then(({ blob: audioBlob, contentType }) => {
        // Handle WAV format audio from Azure TTS proxy
        return createAndPlayAudio(audioBlob, contentType);
      })
      .catch(error => {
        console.error("Error playing last response:", error);
        toast.error("Не удалось воспроизвести ответ");
      });
    }
  };

  // Function to manually play welcome message again if needed
  const replayWelcome = () => {
    if (!isPlaying && !isProcessing) {
      playWelcomeMessage();
    }
  };

  // Function to process user voice input
  const processVoice = () => {
    if (!transcript.trim()) {
      toast.error("Пожалуйста, запишите сообщение сначала");
      return;
    }
    
    if (isProcessing || isLoading) return;
    
    // Set processing state
    setIsProcessing(true);
    setError(null);
    
    // Process the current transcript
    processResponse(transcript)
      .finally(() => {
        setIsProcessing(false);
      });
    
    // Clear the transcript
    setTranscript("");
  };

  return (
    <Card className="w-full max-w-3xl mx-auto shadow-lg">
      <div className="p-4 md:p-6 flex flex-col">
        {/* Header */}
        <div className="mb-6 flex justify-between items-center">
          <h2 className="text-2xl font-semibold">Голосовой чат</h2>
          
          {/* Voice Settings Component */}
          <VoiceSettings 
            voiceGender={voiceGender}
            onToggleVoiceGender={toggleVoiceGender}
            onReplayWelcome={replayWelcome}
            isPlaying={isPlaying}
            isProcessing={isProcessing}
          />
        </div>
        
        <div className="mb-4">
          <h2 className="text-xl font-bold mb-2">Голосовое управление</h2>
          <p className="text-sm text-gray-500 mb-4">Нажмите на кнопку микрофона и говорите на русском языке</p>
          
          {/* Status Indicator Component */}
          <VoiceStatusIndicator 
            isLoading={isLoading}
            error={error}
          />
          
          {/* Transcript Component */}
          <VoiceTranscript transcript={transcript} />
          
          {/* Playback Component */}
          <VoicePlayback 
            lastResponse={lastResponse}
            isPlaying={isPlaying}
            onPlay={playLastResponse}
            onStop={stopAudio}
          />
          
          {/* Voice Recorder Controls Component */}
          <VoiceRecorderControls 
            isRecording={isRecording}
            isProcessing={isProcessing}
            isLoading={isLoading}
            hasTranscript={!!transcript.trim()}
            startRecording={startRecording}
            stopRecording={stopRecording}
            processVoice={processVoice}
            isSpeechRecognitionSupported={isSpeechRecognitionSupported}
          />
        </div>
      </div>
    </Card>
  )
} 