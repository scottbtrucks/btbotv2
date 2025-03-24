"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Mic, Send, StopCircle, Volume2, VolumeX } from "lucide-react"
import { cn } from "@/lib/utils"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

// Message type definition
type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export default function ChatPage() {
  const [isRecording, setIsRecording] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [autoPlay, setAutoPlay] = useState(true) // Enable autoplay by default
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null)
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null)
  const [ttsError, setTtsError] = useState<string | null>(null)
  const [isSpeechRecognitionSupported, setIsSpeechRecognitionSupported] = useState(true)
  const [apiProvider, setApiProvider] = useState<string>("openrouter")
  const [voiceFeaturesEnabled, setVoiceFeaturesEnabled] = useState(true) // Enable voice features
  
  // Chat state
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Здравствуйте! Меня зовут Полина, я помощник по продажам коммерческого транспорта компании Business Trucks. Чем я могу вам помочь сегодня?",
    }
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const recognitionRef = useRef<any>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages, isLoading])

  // Get AI provider info on load
  useEffect(() => {
    fetch("/api/debug")
      .then(response => response.ok ? response.json() : null)
      .then(data => {
        if (data && data.aiConfig && data.aiConfig.provider) {
          setApiProvider(data.aiConfig.provider.toLowerCase());
        }
      })
      .catch(err => console.error("Could not fetch API provider info:", err));
  }, []);

  // Initialize speech recognition - DISABLED FOR NOW
  useEffect(() => {
    if (!voiceFeaturesEnabled) return; // Skip voice initialization
    
    // Original speech recognition code would be here...
    
    // Play welcome message
    if (autoPlay) {
      setTimeout(() => {
        playMessageAudio("welcome", messages[0].content)
      }, 1000)
    }

    return () => {
      // Clean up
      if (recognitionRef.current) {
        recognitionRef.current.abort()
      }
      if (currentAudio) {
        currentAudio.pause()
        currentAudio.src = ""
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-play new assistant messages
  useEffect(() => {
    if (!voiceFeaturesEnabled || !autoPlay) return; // Skip if disabled
    
    // Get the most recent assistant message
    const lastMessage = messages[messages.length - 1];
    
    // If it's an assistant message and we're not loading or playing something else
    if (
      lastMessage && 
      lastMessage.role === "assistant" && 
      !isLoading && 
      !isPlaying && 
      !playingMessageId
    ) {
      // Small delay to ensure UI is updated first
      setTimeout(() => {
        playMessageAudio(lastMessage.id, lastMessage.content);
      }, 500);
    }
  }, [messages, isLoading, autoPlay, isPlaying, playingMessageId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Custom chat handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim() || isLoading) return;
    
    try {
      // Add user message
      const userMessage: Message = {
        id: Date.now().toString(),
        role: "user",
        content: input,
      };
      
      setMessages(prev => [...prev, userMessage]);
      setInput("");
      setIsLoading(true);
      setError(null);
      
      // Make API request
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: messages.concat(userMessage),
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
      }
      
      // Parse response
      const data = await response.json();
      
      // Add assistant message
      setMessages(prev => [
        ...prev, 
        {
          id: Date.now().toString(),
          role: "assistant",
          content: data.content,
        }
      ]);
    } catch (err) {
      console.error("Chat API error:", err);
      setError(err instanceof Error ? err : new Error("Failed to send message"));
      
      // Show error toast
      toast.error("Ошибка в чате: " + (err instanceof Error ? err.message : "Неизвестная ошибка"), {
        duration: 5000,
        action: {
          label: "Подробности",
          onClick: () => console.error("Detailed error:", err)
        }
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  // Active function for playing message audio
  const playMessageAudio = async (messageId: string, text: string) => {
    // Stop any existing playback
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.src = "";
      setCurrentAudio(null);
    }
    
    setTtsError(null);
    setIsPlaying(true);
    setPlayingMessageId(messageId);
    
    try {
      console.log("Requesting TTS for message:", messageId);
      
      // Max retries for network issues
      const maxRetries = 2;
      let retryCount = 0;
      let audioData: Blob | null = null;
      
      while (retryCount <= maxRetries && !audioData) {
        try {
          // Set timeout for the fetch request
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000); // 10-second timeout
          
          const response = await fetch("/api/text-to-speech", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text }),
            signal: controller.signal
          }).finally(() => clearTimeout(timeoutId));
          
          // Check if we got an error response (JSON)
          const contentType = response.headers.get("Content-Type") || "";
          
          if (contentType.includes("application/json")) {
            // Parse error
            const errorData = await response.json();
            console.error("TTS API returned error:", errorData);
            throw new Error(errorData.message || "Error generating speech");
          }
          
          // Make sure we got audio data
          if (!contentType.includes("audio")) {
            throw new Error(`Expected audio but got ${contentType}`);
          }
          
          // Get the audio blob
          audioData = await response.blob();
          
          if (!audioData || audioData.size === 0) {
            throw new Error("Received empty audio data");
          }
          
          break; // Success, exit retry loop
        } catch (fetchError) {
          retryCount++;
          console.warn(`TTS attempt ${retryCount} failed:`, fetchError);
          
          if (retryCount <= maxRetries) {
            // Wait with exponential backoff before retrying
            await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount - 1)));
          } else {
            throw fetchError; // Re-throw if we've exhausted retries
          }
        }
      }
      
      if (!audioData) {
        throw new Error("Failed to get audio after retries");
      }
      
      // Create audio URL and element
      const audioUrl = URL.createObjectURL(audioData);
      const audio = new Audio(audioUrl);
      setCurrentAudio(audio);
      
      // Listen for audio events
      return new Promise<void>((resolve, reject) => {
        audio.addEventListener("ended", () => {
          URL.revokeObjectURL(audioUrl);
          setIsPlaying(false);
          setPlayingMessageId(null);
          setCurrentAudio(null);
          resolve();
        });
        
        audio.addEventListener("error", (e) => {
          console.error("Audio playback error:", e);
          URL.revokeObjectURL(audioUrl);
          setIsPlaying(false);
          setPlayingMessageId(null);
          setCurrentAudio(null);
          setTtsError("Ошибка воспроизведения аудио");
          reject(e);
        });
        
        // Handle autoplay restrictions
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch(err => {
            console.error("Audio play failed (likely autoplay restriction):", err);
            setTtsError("Автовоспроизведение заблокировано браузером. Пожалуйста, разрешите автовоспроизведение.");
            setIsPlaying(false);
            setPlayingMessageId(null);
            reject(err);
          });
        }
      });
    } catch (err) {
      console.error("Error playing message audio:", err);
      setTtsError(err instanceof Error ? err.message : "Ошибка синтеза речи");
      setIsPlaying(false);
      setPlayingMessageId(null);
      toast.error("Ошибка синтеза речи", {
        description: err instanceof Error ? err.message : "Неизвестная ошибка",
        duration: 3000
      });
    }
  };

  // Function to start speech recognition - still disabled
  const startRecording = () => {
    toast.info("Голосовой ввод временно отключен");
  }

  // Function to stop recording - still disabled
  const stopRecording = () => {
    // Function is disabled
  }

  // Function to stop audio playback
  const stopAudio = () => {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.src = "";
      setCurrentAudio(null);
      setIsPlaying(false);
      setPlayingMessageId(null);
    }
  }

  // Toggle autoplay setting
  const handleToggleAutoPlay = () => {
    setAutoPlay(!autoPlay);
    toast.info(
      !autoPlay 
        ? "Автовоспроизведение включено" 
        : "Автовоспроизведение отключено"
    );
  }

  // Optional reload function if needed
  const handleReloadPage = () => {
    window.location.reload();
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-primary text-primary-foreground py-4 px-6 shadow-md">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold">Business Trucks</h1>
            <span className="ml-4 text-lg hidden sm:inline">Полина - ваш помощник по продажам</span>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="autoplay-mode"
                checked={autoPlay}
                onCheckedChange={handleToggleAutoPlay}
              />
              <Label htmlFor="autoplay-mode" className="text-xs">
                Автовоспроизведение
              </Label>
            </div>
            <div className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 px-2 py-1 rounded">
              AI: {apiProvider}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto p-4 overflow-hidden flex flex-col">
        <Card className="flex-1 overflow-hidden flex flex-col p-4 shadow-lg">
          <div className="flex-1 overflow-y-auto space-y-4 mb-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex items-start gap-3 rounded-lg p-4",
                  message.role === "user"
                    ? "ml-auto bg-primary text-primary-foreground max-w-[80%]"
                    : "mr-auto bg-muted max-w-[80%]",
                )}
              >
                <div className="flex-1">
                  <p>{message.content}</p>
                </div>
                {message.role === "assistant" && (
                  <div className="flex shrink-0">
                    {playingMessageId !== message.id ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => playMessageAudio(message.id, message.content)}
                        className="h-8 w-8"
                      >
                        <Volume2 className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button variant="ghost" size="icon" onClick={stopAudio} className="h-8 w-8">
                        <VolumeX className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="mr-auto bg-muted max-w-[80%] rounded-lg p-4">
                <div className="flex space-x-2">
                  <div className="h-2 w-2 rounded-full bg-gray-400 animate-bounce"></div>
                  <div className="h-2 w-2 rounded-full bg-gray-400 animate-bounce [animation-delay:0.2s]"></div>
                  <div className="h-2 w-2 rounded-full bg-gray-400 animate-bounce [animation-delay:0.4s]"></div>
                </div>
              </div>
            )}
            {error && (
              <div className="w-full text-center my-4">
                <div className="inline-block bg-red-100 text-red-800 p-3 rounded-lg text-sm">
                  <p className="mb-2">Произошла ошибка при подключении к AI-сервису</p>
                  <Button variant="outline" size="sm" onClick={handleReloadPage}>
                    Перезагрузить страницу
                  </Button>
                </div>
              </div>
            )}
            {ttsError && (
              <div className="text-center text-red-500 text-sm p-2">
                {ttsError}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <Input
              value={input}
              onChange={handleInputChange}
              placeholder="Введите ваше сообщение..."
              className="flex-1"
              disabled={isLoading}
            />
            {/* Voice recording button disabled */}
            {/* {!isRecording ? (
              <Button 
                type="button" 
                variant="outline" 
                size="icon" 
                onClick={startRecording} 
                disabled={isLoading || !isSpeechRecognitionSupported}
                title={
                  !isSpeechRecognitionSupported 
                    ? "Распознавание речи не поддерживается в вашем браузере" 
                    : "Начать запись голоса"
                }
              >
                <Mic className="h-5 w-5" />
              </Button>
            ) : (
              <Button type="button" variant="destructive" size="icon" onClick={stopRecording} title="Остановить запись">
                <StopCircle className="h-5 w-5" />
              </Button>
            )} */}
            <Button type="submit" disabled={isLoading || !input}>
              <Send className="h-5 w-5" />
            </Button>
          </form>
        </Card>
      </main>

      {isRecording && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-full animate-pulse">
          Запись голоса...
        </div>
      )}
    </div>
  )
}

