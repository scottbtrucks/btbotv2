import { NextResponse } from 'next/server'

// Debug API for checking environment configuration
export async function GET() {
  // Only enable in development mode
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'Debug API is only available in development mode' },
      { status: 403 }
    )
  }

  // Check AI service configuration
  const aiConfig = {
    // Check which AI provider is configured
    provider: process.env.OPENAI_BASE_URL?.includes('openrouter.ai')
      ? 'OpenRouter'
      : process.env.OPENAI_BASE_URL?.includes('nano-gpt.com')
      ? 'Nano-GPT'
      : 'OpenAI',
      
    // Check if API keys are configured (without exposing them)
    hasOpenAIKey: !!process.env.OPENAI_API_KEY,
    hasOpenRouterKey: !!process.env.OPENROUTER_API_KEY,
    hasNanoGPTKey: !!process.env.NANO_GPT_API_KEY,
    
    // Additional configuration
    baseUrlConfigured: !!process.env.OPENAI_BASE_URL,
    modelSpecified: !!process.env.OPENROUTER_MODEL,
    
    // If model is specified, what is it?
    model: process.env.OPENROUTER_MODEL || 'gpt-4o',
  }

  // Determine which TTS provider will be used based on configuration
  let ttsProvider = 'Not Configured'
  if (process.env.USE_AZURE_SERVICES === 'true' && (process.env.AZURE_TTS_KEY || process.env.AZURE_STT_KEY)) {
    ttsProvider = 'Azure'
  } else if (process.env.VOICERSS_API_KEY) {
    ttsProvider = 'VoiceRSS'
  } else if (process.env.PLAYHT_API_KEY) {
    ttsProvider = 'Play.ht'
  } else if (process.env.ELEVENLABS_API_KEY) {
    ttsProvider = 'ElevenLabs'
  }

  // Check TTS configuration
  const ttsConfig = {
    // Provider that will actually be used
    provider: ttsProvider,
    
    // VoiceRSS config (free)
    hasVoiceRssKey: !!process.env.VOICERSS_API_KEY,
    
    // Play.ht config
    hasPlayHTKey: !!process.env.PLAYHT_API_KEY,
    hasPlayHTUserId: !!process.env.PLAYHT_USER_ID,
    playHTVoiceConfigured: !!process.env.PLAYHT_VOICE_ID,
    playHTVoiceId: process.env.PLAYHT_VOICE_ID,
    
    // ElevenLabs config
    hasElevenLabsKey: !!process.env.ELEVENLABS_API_KEY,
    elevenLabsVoiceId: process.env.ELEVENLABS_VOICE_ID || 'pNInz6obpgDQGcFmaJgB',
    useProxy: process.env.USE_MCP_PROXY === 'true',
    hasProxyUrl: !!process.env.MCP_SERVER_URL,
    
    // Azure Speech Services config
    useAzureServices: process.env.USE_AZURE_SERVICES === 'true',
    hasAzureTtsKey: !!process.env.AZURE_TTS_KEY,
    hasAzureTtsRegion: !!process.env.AZURE_TTS_REGION,
    hasAzureSttKey: !!process.env.AZURE_STT_KEY,
    hasAzureSttRegion: !!process.env.AZURE_STT_REGION,
    azureTtsFemaleVoice: process.env.AZURE_TTS_FEMALE_VOICE || 'ru-RU-SvetlanaNeural',
    azureTtsMaleVoice: process.env.AZURE_TTS_MALE_VOICE || 'ru-RU-DmitryNeural',
  }

  // Determine which STT provider will be used based on configuration
  let sttProvider = 'Browser Native'
  if (process.env.USE_AZURE_SERVICES === 'true' && process.env.AZURE_STT_KEY) {
    sttProvider = 'Azure'
  }

  // STT configuration
  const sttConfig = {
    provider: sttProvider,
    hasAzureSttKey: !!process.env.AZURE_STT_KEY,
    hasAzureSttRegion: !!process.env.AZURE_STT_REGION,
    useAzureServices: process.env.USE_AZURE_SERVICES === 'true',
  }

  // Return debugging information
  return NextResponse.json({
    environment: process.env.NODE_ENV,
    aiConfig,
    ttsConfig,
    sttConfig,
    // Include any other helpful debugging info here
  })
} 