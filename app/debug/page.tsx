"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle, CheckCircle2, XCircle, ArrowLeft } from "lucide-react"
import Link from "next/link"

interface DebugInfo {
  environment: string
  aiConfig: {
    provider: string
    hasOpenAIKey: boolean
    hasOpenRouterKey: boolean
    hasNanoGPTKey: boolean
    baseUrlConfigured: boolean
    modelSpecified: boolean
    model: string
  }
  ttsConfig: {
    provider: string
    // VoiceRSS config (free)
    hasVoiceRssKey: boolean
    // Play.ht config
    hasPlayHTKey: boolean
    hasPlayHTUserId: boolean
    playHTVoiceConfigured: boolean
    playHTVoiceId: string | undefined
    // ElevenLabs config
    hasElevenLabsKey: boolean
    elevenLabsVoiceId: string
    useProxy: boolean
    hasProxyUrl: boolean
    // Azure Speech Services config
    useAzureServices: boolean
    hasAzureTtsKey: boolean
    hasAzureTtsRegion: boolean
    hasAzureSttKey: boolean
    hasAzureSttRegion: boolean
    azureTtsFemaleVoice: string
    azureTtsMaleVoice: string
  }
  sttConfig: {
    provider: string
    hasAzureSttKey: boolean
    hasAzureSttRegion: boolean
    useAzureServices: boolean
  }
}

export default function DebugPage() {
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [testChatStatus, setTestChatStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [testTtsStatus, setTestTtsStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [chatErrorMsg, setChatErrorMsg] = useState<string | null>(null)
  const [ttsErrorMsg, setTtsErrorMsg] = useState<string | null>(null)

  // Fetch debug information
  useEffect(() => {
    async function fetchDebugInfo() {
      try {
        const response = await fetch("/api/debug")
        if (!response.ok) {
          if (response.status === 403) {
            setError("Debug mode is only available in development environment")
          } else {
            setError("Failed to fetch debug information")
          }
          setLoading(false)
          return
        }
        
        const data = await response.json()
        setDebugInfo(data)
      } catch (err) {
        setError("Error fetching debug information")
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchDebugInfo()
  }, [])

  // Test Chat API function
  const testChatAPI = async () => {
    setTestChatStatus("loading")
    setChatErrorMsg(null)
    
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: "Hello, this is a test message." }]
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        setChatErrorMsg(errorData?.message || `Error ${response.status}: ${response.statusText}`)
        setTestChatStatus("error")
        return
      }
      
      // Just check if we get a valid response stream
      const reader = response.body?.getReader()
      if (reader) {
        const { done } = await reader.read()
        if (!done) {
          setTestChatStatus("success")
          return
        }
      }
      
      setChatErrorMsg("No data received from chat API")
      setTestChatStatus("error")
    } catch (err) {
      setChatErrorMsg(err instanceof Error ? err.message : "Unknown error testing chat API")
      setTestChatStatus("error")
    }
  }

  // Test TTS API function
  const testTtsAPI = async () => {
    setTestTtsStatus("loading")
    setTtsErrorMsg(null)
    
    try {
      const response = await fetch("/api/text-to-speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "Это тестовое сообщение." })
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        setTtsErrorMsg(errorData?.message || `Error ${response.status}: ${response.statusText}`)
        setTestTtsStatus("error")
        return
      }
      
      // Check if we received audio data
      const contentType = response.headers.get("Content-Type")
      if (contentType?.includes("audio")) {
        setTestTtsStatus("success")
      } else {
        setTtsErrorMsg("Invalid response format: expected audio data")
        setTestTtsStatus("error")
      }
    } catch (err) {
      setTtsErrorMsg(err instanceof Error ? err.message : "Unknown error testing TTS API")
      setTestTtsStatus("error")
    }
  }

  // Rendering
  if (loading) {
    return (
      <div className="container mx-auto p-8">
        <Card className="p-6">
          <h1 className="text-2xl font-bold mb-4">Загрузка диагностической информации...</h1>
          <div className="animate-pulse flex space-x-4">
            <div className="flex-1 space-y-4 py-1">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6"></div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-8">
        <Card className="p-6">
          <div className="flex items-center mb-4 text-red-500">
            <AlertCircle className="mr-2" />
            <h1 className="text-2xl font-bold">Ошибка</h1>
          </div>
          <p>{error}</p>
          <div className="mt-6">
            <Link href="/">
              <Button variant="outline" className="flex items-center">
                <ArrowLeft className="mr-2 h-4 w-4" /> Назад на главную
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    )
  }

  // Main debug information display
  return (
    <div className="container mx-auto p-4 md:p-8">
      <Card className="p-4 md:p-6 mb-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Диагностика Business Trucks Assistant</h1>
          <Link href="/">
            <Button variant="outline" className="flex items-center">
              <ArrowLeft className="mr-2 h-4 w-4" /> Назад
            </Button>
          </Link>
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Окружение</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center">
              <span className="font-medium mr-2">Режим:</span>
              <span className={debugInfo?.environment === "development" ? "text-green-500" : "text-blue-500"}>
                {debugInfo?.environment || "unknown"}
              </span>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Конфигурация AI</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center">
              <span className="font-medium mr-2">Провайдер:</span>
              <span className="font-mono">{debugInfo?.aiConfig.provider}</span>
            </div>
            <div className="flex items-center">
              <span className="font-medium mr-2">API ключ OpenAI:</span>
              {debugInfo?.aiConfig.hasOpenAIKey ? (
                <CheckCircle2 className="text-green-500 h-5 w-5" />
              ) : (
                <XCircle className="text-gray-400 h-5 w-5" />
              )}
            </div>
            <div className="flex items-center">
              <span className="font-medium mr-2">API ключ OpenRouter:</span>
              {debugInfo?.aiConfig.hasOpenRouterKey ? (
                <CheckCircle2 className="text-green-500 h-5 w-5" />
              ) : (
                <XCircle className="text-gray-400 h-5 w-5" />
              )}
            </div>
            <div className="flex items-center">
              <span className="font-medium mr-2">API ключ Nano-GPT:</span>
              {debugInfo?.aiConfig.hasNanoGPTKey ? (
                <CheckCircle2 className="text-green-500 h-5 w-5" />
              ) : (
                <XCircle className="text-gray-400 h-5 w-5" />
              )}
            </div>
            <div className="flex items-center">
              <span className="font-medium mr-2">Собственный Base URL:</span>
              {debugInfo?.aiConfig.baseUrlConfigured ? (
                <CheckCircle2 className="text-green-500 h-5 w-5" />
              ) : (
                <XCircle className="text-gray-400 h-5 w-5" />
              )}
            </div>
            <div className="flex items-center">
              <span className="font-medium mr-2">Модель:</span>
              <span className="font-mono">{debugInfo?.aiConfig.model}</span>
            </div>
          </div>

          <div className="mt-4">
            <Button 
              onClick={testChatAPI} 
              disabled={testChatStatus === "loading"}
              variant={testChatStatus === "error" ? "destructive" : testChatStatus === "success" ? "outline" : "default"}
            >
              {testChatStatus === "loading" ? "Тестирование..." : "Тест Chat API"}
            </Button>
            {testChatStatus === "success" && (
              <span className="ml-4 text-green-500 flex items-center">
                <CheckCircle2 className="h-5 w-5 mr-2" /> API работает корректно
              </span>
            )}
            {testChatStatus === "error" && (
              <div className="ml-4 text-red-500 flex items-center">
                <XCircle className="h-5 w-5 mr-2" /> Ошибка: {chatErrorMsg}
              </div>
            )}
          </div>
        </div>

        <div className="p-4 rounded-md bg-gray-100 dark:bg-gray-800 mb-6">
          <h2 className="text-xl font-semibold mb-4">Конфигурация Text-to-Speech</h2>
          
          <div className="mb-4">
            <span className="font-medium mr-2">Провайдер TTS:</span>
            <span className="font-mono">{debugInfo?.ttsConfig.provider}</span>
          </div>
          
          {/* Azure Speech Services Configuration */}
          {debugInfo?.ttsConfig.provider === 'Azure' && (
            <div className="border-l-4 border-blue-500 pl-4 mb-4">
              <div className="mb-2">
                <span className="font-medium mr-2">API ключ Azure TTS:</span>
                {debugInfo?.ttsConfig.hasAzureTtsKey ? (
                  <span className="text-green-600 dark:text-green-400 flex items-center">
                    <CheckCircle2 className="h-5 w-5 mr-2" /> Настроен
                  </span>
                ) : (
                  <span className="text-red-600 dark:text-red-400 flex items-center">
                    <XCircle className="h-5 w-5 mr-2" /> Не настроен
                  </span>
                )}
              </div>
              <div className="mb-2">
                <span className="font-medium mr-2">Регион Azure TTS:</span>
                {debugInfo?.ttsConfig.hasAzureTtsRegion ? (
                  <span className="text-green-600 dark:text-green-400 flex items-center">
                    <CheckCircle2 className="h-5 w-5 mr-2" /> Настроен
                  </span>
                ) : (
                  <span className="text-red-600 dark:text-red-400 flex items-center">
                    <XCircle className="h-5 w-5 mr-2" /> Не настроен
                  </span>
                )}
              </div>
              <div className="mb-2">
                <span className="font-medium mr-2">Женский голос:</span>
                <span className="font-mono text-sm">{debugInfo?.ttsConfig.azureTtsFemaleVoice}</span>
              </div>
              <div className="mb-2">
                <span className="font-medium mr-2">Мужской голос:</span>
                <span className="font-mono text-sm">{debugInfo?.ttsConfig.azureTtsMaleVoice}</span>
              </div>
              <div className="mt-2 text-blue-700 dark:text-blue-300 text-xs">
                ℹ️ Azure предоставляет 500,000 символов в месяц бесплатно для Text-to-Speech
              </div>
            </div>
          )}
          
          {/* VoiceRSS Configuration (Free) */}
          {debugInfo?.ttsConfig.provider === 'VoiceRSS' && (
            <div className="border-l-4 border-green-500 pl-4 mb-4">
              <div className="mb-2">
                <span className="font-medium mr-2">API ключ VoiceRSS (бесплатный сервис):</span>
                {debugInfo?.ttsConfig.hasVoiceRssKey ? (
                  <span className="text-green-600 dark:text-green-400 flex items-center">
                    <CheckCircle2 className="h-5 w-5 mr-2" /> Настроен
                  </span>
                ) : (
                  <span className="text-red-600 dark:text-red-400 flex items-center">
                    <XCircle className="h-5 w-5 mr-2" /> Не настроен
                  </span>
                )}
              </div>
              <div className="mb-2">
                <span className="font-medium mr-2">Лимит запросов:</span>
                <span>350 запросов в день (бесплатно)</span>
              </div>
            </div>
          )}
          
          {/* Play.ht Configuration */}
          {debugInfo?.ttsConfig.provider === 'Play.ht' && (
            <div className="border-l-4 border-blue-500 pl-4 mb-4">
              <div className="mb-2">
                <span className="font-medium mr-2">API ключ Play.ht:</span>
                {debugInfo?.ttsConfig.hasPlayHTKey ? (
                  <span className="text-green-600 dark:text-green-400 flex items-center">
                    <CheckCircle2 className="h-5 w-5 mr-2" /> Настроен
                  </span>
                ) : (
                  <span className="text-red-600 dark:text-red-400 flex items-center">
                    <XCircle className="h-5 w-5 mr-2" /> Не настроен
                  </span>
                )}
              </div>
              <div className="mb-2">
                <span className="font-medium mr-2">ID пользователя Play.ht:</span>
                {debugInfo?.ttsConfig.hasPlayHTUserId ? (
                  <span className="text-green-600 dark:text-green-400 flex items-center">
                    <CheckCircle2 className="h-5 w-5 mr-2" /> Настроен
                  </span>
                ) : (
                  <span className="text-red-600 dark:text-red-400 flex items-center">
                    <XCircle className="h-5 w-5 mr-2" /> Не настроен
                  </span>
                )}
              </div>
              <div className="mb-2">
                <span className="font-medium mr-2">ID голоса Play.ht:</span>
                {debugInfo?.ttsConfig.playHTVoiceConfigured ? (
                  <span className="font-mono text-xs">{debugInfo?.ttsConfig.playHTVoiceId?.substring(0, 25)}...</span>
                ) : (
                  <span className="text-yellow-600 dark:text-yellow-400">Не настроен (будет использован голос по умолчанию)</span>
                )}
              </div>
              <div className="mt-2 text-amber-700 dark:text-amber-300 text-xs">
                ⚠️ Требуется платная подписка на play.ht для использования API
              </div>
            </div>
          )}
          
          {/* ElevenLabs Configuration */}
          {debugInfo?.ttsConfig.provider === 'ElevenLabs' && (
            <div className="border-l-4 border-blue-500 pl-4 mb-4">
              <div className="mb-2">
                <span className="font-medium mr-2">API ключ ElevenLabs:</span>
                {debugInfo?.ttsConfig.hasElevenLabsKey ? (
                  <span className="text-green-600 dark:text-green-400 flex items-center">
                    <CheckCircle2 className="h-5 w-5 mr-2" /> Настроен
                  </span>
                ) : (
                  <span className="text-red-600 dark:text-red-400 flex items-center">
                    <XCircle className="h-5 w-5 mr-2" /> Не настроен
                  </span>
                )}
              </div>
              <div className="mb-2">
                <span className="font-medium mr-2">ID голоса ElevenLabs:</span>
                <span className="font-mono text-sm">{debugInfo?.ttsConfig.elevenLabsVoiceId}</span>
              </div>
              
              <div className="mb-2">
                <span className="font-medium mr-2">Использовать прокси:</span>
                {debugInfo?.ttsConfig.useProxy ? (
                  <span className="text-green-600 dark:text-green-400 flex items-center">
                    <CheckCircle2 className="h-5 w-5 mr-2" /> Включено
                  </span>
                ) : (
                  <span className="text-gray-600 dark:text-gray-400">Выключено</span>
                )}
              </div>
              
              {debugInfo?.ttsConfig.useProxy && (
                <div className="mb-2">
                  <span className="font-medium mr-2">URL сервера MCP:</span>
                  {debugInfo?.ttsConfig.hasProxyUrl ? (
                    <span className="text-green-600 dark:text-green-400 flex items-center">
                      <CheckCircle2 className="h-5 w-5 mr-2" /> Настроен
                    </span>
                  ) : (
                    <span className="text-red-600 dark:text-red-400 flex items-center">
                      <XCircle className="h-5 w-5 mr-2" /> Не настроен
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
          
          {/* Test TTS API button */}
          <div className="mt-4">
            <Button
              onClick={testTtsAPI}
              disabled={testTtsStatus === "loading"}
              variant={testTtsStatus === "error" ? "destructive" : testTtsStatus === "success" ? "outline" : "default"}
            >
              {testTtsStatus === "loading" ? "Тестирование..." : "Тест TTS API"}
            </Button>
            
            {testTtsStatus === "success" && (
              <div className="text-green-600 dark:text-green-400 mt-2 flex items-center">
                <CheckCircle2 className="h-5 w-5 mr-2" /> TTS API работает корректно
              </div>
            )}
            
            {testTtsStatus === "error" && (
              <div className="text-red-600 dark:text-red-400 mt-2 flex items-center">
                <XCircle className="h-5 w-5 mr-2" /> Ошибка: {ttsErrorMsg}
              </div>
            )}
          </div>
        </div>

        {/* Add Speech-to-Text section */}
        <div className="p-4 rounded-md bg-gray-100 dark:bg-gray-800 mb-6">
          <h2 className="text-xl font-semibold mb-4">Конфигурация Speech-to-Text</h2>
          
          <div className="mb-4">
            <span className="font-medium mr-2">Провайдер STT:</span>
            <span className="font-mono">{debugInfo?.sttConfig.provider}</span>
          </div>
          
          {/* Azure Speech Services STT Configuration */}
          {debugInfo?.sttConfig.provider === 'Azure' && (
            <div className="border-l-4 border-blue-500 pl-4 mb-4">
              <div className="mb-2">
                <span className="font-medium mr-2">API ключ Azure STT:</span>
                {debugInfo?.sttConfig.hasAzureSttKey ? (
                  <span className="text-green-600 dark:text-green-400 flex items-center">
                    <CheckCircle2 className="h-5 w-5 mr-2" /> Настроен
                  </span>
                ) : (
                  <span className="text-red-600 dark:text-red-400 flex items-center">
                    <XCircle className="h-5 w-5 mr-2" /> Не настроен
                  </span>
                )}
              </div>
              <div className="mb-2">
                <span className="font-medium mr-2">Регион Azure STT:</span>
                {debugInfo?.sttConfig.hasAzureSttRegion ? (
                  <span className="text-green-600 dark:text-green-400 flex items-center">
                    <CheckCircle2 className="h-5 w-5 mr-2" /> Настроен
                  </span>
                ) : (
                  <span className="text-red-600 dark:text-red-400 flex items-center">
                    <XCircle className="h-5 w-5 mr-2" /> Не настроен
                  </span>
                )}
              </div>
              <div className="mt-2 text-blue-700 dark:text-blue-300 text-xs">
                ℹ️ Azure предоставляет 5 часов распознавания речи в месяц бесплатно
              </div>
            </div>
          )}
          
          {/* Browser Native STT info */}
          {debugInfo?.sttConfig.provider === 'Browser Native' && (
            <div className="border-l-4 border-amber-500 pl-4 mb-4">
              <div className="mb-2 text-amber-700 dark:text-amber-400">
                Используется встроенное распознавание речи браузера (Web Speech API).
                Для более надежного распознавания рекомендуется настроить Azure Speech Services.
              </div>
              <div className="mt-2 text-amber-700 dark:text-amber-400 text-xs">
                ⚠️ Web Speech API может иметь ограниченную поддержку в некоторых браузерах и требует подключения к интернету
              </div>
            </div>
          )}
        </div>

        <div className="p-4 rounded-md bg-gray-100 dark:bg-gray-800 mb-6">
          <h2 className="text-xl font-semibold mb-4">Рекомендации</h2>
          
          <ul className="list-disc pl-5 space-y-2">
            {/* TTS recommendations */}
            {!debugInfo?.ttsConfig.hasVoiceRssKey && 
             !debugInfo?.ttsConfig.hasPlayHTKey && 
             !debugInfo?.ttsConfig.hasElevenLabsKey && 
             !debugInfo?.ttsConfig.hasAzureTtsKey && (
              <li>Настройте сервис синтеза речи. Рекомендуем Azure (AZURE_TTS_KEY), VoiceRSS (VOICERSS_API_KEY), Play.ht или ElevenLabs для функции синтеза речи</li>
            )}
            
            {/* Azure recommendations */}
            {debugInfo?.ttsConfig.provider === 'Azure' && (!debugInfo?.ttsConfig.hasAzureTtsKey || !debugInfo?.ttsConfig.hasAzureTtsRegion) && (
              <li>Настройте ключ и регион Azure Speech Services (AZURE_TTS_KEY и AZURE_TTS_REGION) для использования синтеза речи</li>
            )}
            
            {debugInfo?.sttConfig.provider === 'Azure' && (!debugInfo?.sttConfig.hasAzureSttKey || !debugInfo?.sttConfig.hasAzureSttRegion) && (
              <li>Настройте ключ и регион Azure Speech Services (AZURE_STT_KEY и AZURE_STT_REGION) для использования распознавания речи</li>
            )}
            
            {/* ... existing recommendations ... */}
          </ul>
        </div>

        {/* Issues warning section */}
        {debugInfo && ((!debugInfo.aiConfig.hasOpenAIKey && 
           !debugInfo.aiConfig.hasOpenRouterKey && 
           !debugInfo.aiConfig.hasNanoGPTKey) || 
          (!debugInfo.ttsConfig.hasVoiceRssKey && 
           !debugInfo.ttsConfig.hasPlayHTKey && 
           !debugInfo.ttsConfig.hasPlayHTUserId && 
           !debugInfo.ttsConfig.hasElevenLabsKey &&
           !debugInfo.ttsConfig.hasAzureTtsKey)) && (
          <div className="p-4 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <h3 className="text-lg font-semibold text-red-700 dark:text-red-400 mb-2">⚠️ Критические ошибки конфигурации</h3>
            
            {/* Check if AI is configured */}
            {debugInfo && !debugInfo.aiConfig.hasOpenAIKey && 
             !debugInfo.aiConfig.hasOpenRouterKey && 
             !debugInfo.aiConfig.hasNanoGPTKey && (
              <p className="mb-2 text-red-700 dark:text-red-400">
                Не настроен API ключ для искусственного интеллекта. 
                Добавьте хотя бы один ключ (OPENAI_API_KEY, OPENROUTER_API_KEY, или NANO_GPT_API_KEY) в ваш файл <code>.env.local</code>.
              </p>
            )}
            
            {/* Check if TTS is configured */}
            {debugInfo && !debugInfo.ttsConfig.hasVoiceRssKey &&
             !debugInfo.ttsConfig.hasPlayHTKey &&
             !debugInfo.ttsConfig.hasPlayHTUserId &&
             !debugInfo.ttsConfig.hasElevenLabsKey &&
             !debugInfo.ttsConfig.hasAzureTtsKey && (
              <div>
                <p className="mb-2 text-red-700 dark:text-red-400">
                  Не настроен сервис синтеза речи. Выберите один из вариантов:
                </p>
                <ul className="list-disc ml-5 mb-2 text-red-700 dark:text-red-400">
                  <li>
                    <strong>Azure Speech Services (рекомендуется):</strong> Установите ключи <code>AZURE_TTS_KEY</code> и <code>AZURE_TTS_REGION</code> в вашем <code>.env.local</code> файле.
                    <div className="ml-5 mt-1 text-sm">
                      Получите бесплатный ключ Azure на <a href="https://azure.microsoft.com/free/" target="_blank" className="underline">https://azure.microsoft.com/free/</a>.
                      <br/>Бесплатный тариф: 500,000 символов в месяц для TTS и 5 часов в месяц для STT.
                    </div>
                  </li>
                  <li>
                    <strong>VoiceRSS (бесплатно):</strong> Установите ключ <code>VOICERSS_API_KEY</code> в вашем <code>.env.local</code> файле.
                    <div className="ml-5 mt-1 text-sm">
                      Получите бесплатный ключ API на <a href="https://www.voicerss.org/registration.aspx" target="_blank" className="underline">https://www.voicerss.org/registration.aspx</a>.
                      <br/>Лимит бесплатного аккаунта: 350 запросов в день.
                    </div>
                  </li>
                  <li>
                    Для Play.ht, установите <code>PLAYHT_API_KEY</code> и <code>PLAYHT_USER_ID</code> в вашем <code>.env.local</code> файле.
                    <p className="text-amber-600 dark:text-amber-400 mt-1">
                      <strong>Важно:</strong> Play.ht требует платной подписки для использования API.
                      Посетите <a href="https://play.ht/pricing" target="_blank" className="underline">https://play.ht/pricing</a> для получения тарифов.
                    </p>
                  </li>
                  <li>
                    Для ElevenLabs, установите <code>ELEVENLABS_API_KEY</code> в вашем <code>.env.local</code> файле.
                  </li>
                </ul>
              </div>
            )}
          </div>
        )}
        
        {/* Azure configuration warnings */}
        {debugInfo && debugInfo.ttsConfig.useAzureServices && (
          <>
            {/* Azure TTS configuration issues */}
            {(!debugInfo.ttsConfig.hasAzureTtsKey || !debugInfo.ttsConfig.hasAzureTtsRegion) && (
              <div className="p-4 rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 mt-4">
                <h3 className="text-lg font-semibold text-amber-700 dark:text-amber-400 mb-2">⚠️ Неполная настройка Azure TTS</h3>
                <p className="text-amber-700 dark:text-amber-400">
                  Вы включили Azure Services (USE_AZURE_SERVICES=true), но не настроили ключ или регион для TTS.
                  <br />
                  Установите <code>AZURE_TTS_KEY</code> и <code>AZURE_TTS_REGION</code> в вашем <code>.env.local</code> файле.
                </p>
              </div>
            )}
            
            {/* Azure STT configuration issues */}
            {(debugInfo.sttConfig.provider === 'Azure' && (!debugInfo.sttConfig.hasAzureSttKey || !debugInfo.sttConfig.hasAzureSttRegion)) && (
              <div className="p-4 rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 mt-4">
                <h3 className="text-lg font-semibold text-amber-700 dark:text-amber-400 mb-2">⚠️ Неполная настройка Azure STT</h3>
                <p className="text-amber-700 dark:text-amber-400">
                  Вы включили Azure Services (USE_AZURE_SERVICES=true), но не настроили ключ или регион для STT.
                  <br />
                  Установите <code>AZURE_STT_KEY</code> и <code>AZURE_STT_REGION</code> в вашем <code>.env.local</code> файле.
                </p>
              </div>
            )}
          </>
        )}

        {/* If using ElevenLabs, check for proxy settings */}
        {debugInfo && debugInfo.ttsConfig.hasElevenLabsKey &&
         debugInfo.ttsConfig.useProxy &&
         !debugInfo.ttsConfig.hasProxyUrl && (
          <div className="p-4 rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 mt-4">
            <h3 className="text-lg font-semibold text-amber-700 dark:text-amber-400 mb-2">⚠️ Неполная настройка прокси</h3>
            <p className="text-amber-700 dark:text-amber-400">
              You've enabled the MCP proxy for ElevenLabs, but haven't specified the proxy URL.
              <br />
              Set <code>MCP_SERVER_URL</code> in your <code>.env.local</code> file or disable the proxy by setting <code>USE_MCP_PROXY=false</code>.
            </p>
          </div>
        )}
      </Card>
    </div>
  )
} 