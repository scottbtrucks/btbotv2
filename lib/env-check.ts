/**
 * Environment variable validation utility
 * Checks for required environment variables and logs warnings
 */

// Define ProcessEnv interface for type safety
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      [key: string]: string | undefined;
    }
  }
}

export function checkRequiredEnvVars(): void {
  if (typeof window !== 'undefined') {
    // Only run on server side
    return;
  }

  // Check for API Key Configuration
  let hasAiApiConfig = false;
  const aiApiOptions = [
    { name: 'OPENAI_API_KEY', description: 'OpenAI API Key' },
    { name: 'OPENROUTER_API_KEY', description: 'OpenRouter API Key' },
    { name: 'NANO_GPT_API_KEY', description: 'Nano-GPT API Key' }
  ];

  // Check if at least one API key is configured
  for (const option of aiApiOptions) {
    if (process.env[option.name]) {
      hasAiApiConfig = true;
      console.log(`✅ Found AI API configuration: ${option.description}`);
      break;
    }
  }

  // Check for Text-to-Speech API credentials
  const hasAzureSpeechKey = !!(process.env.AZURE_TTS_KEY || process.env.AZURE_STT_KEY);
  const hasVoiceRssKey = !!process.env.VOICERSS_API_KEY;
  const hasPlayHTConfig = !!(process.env.PLAYHT_API_KEY && process.env.PLAYHT_USER_ID);
  const hasElevenLabsKey = !!process.env.ELEVENLABS_API_KEY;
  const hasTtsConfig = hasAzureSpeechKey || hasVoiceRssKey || hasPlayHTConfig || hasElevenLabsKey || process.env.USE_LOCAL_TTS_PROXY === 'true';

  if (hasAzureSpeechKey) {
    console.log('✅ Found Azure Speech Services configuration');
    
    // Check for specific Azure configuration
    if (process.env.AZURE_TTS_KEY) {
      console.log('  ✓ Azure TTS key is set');
    }
    if (process.env.AZURE_STT_KEY) {
      console.log('  ✓ Azure STT key is set');
    }
    if (process.env.AZURE_TTS_REGION || process.env.AZURE_STT_REGION) {
      console.log(`  ✓ Azure region: ${process.env.AZURE_TTS_REGION || process.env.AZURE_STT_REGION}`);
    } else {
      console.log('  ℹ️ Azure region not set, will use default (eastus)');
    }
    
    if (process.env.USE_AZURE_SERVICES !== 'true') {
      console.warn('⚠️ Azure keys are configured but USE_AZURE_SERVICES is not set to true');
    }
  } else if (process.env.USE_LOCAL_TTS_PROXY === 'true') {
    console.log('✅ Using local TTS proxy for development/testing');
    console.warn('⚠️ Local TTS proxy should only be used for development and testing');
  } else if (hasVoiceRssKey) {
    console.log('✅ Found VoiceRSS TTS configuration (free TTS service)');
  } else if (hasPlayHTConfig) {
    console.log('✅ Found Play.ht TTS configuration (requires paid subscription)');
  } else if (hasElevenLabsKey) {
    console.log('✅ Found ElevenLabs TTS configuration');
  }

  // Required variables check
  const missingRequirements = [];
  
  if (!hasAiApiConfig) {
    missingRequirements.push('At least one AI API Key (OPENAI_API_KEY, OPENROUTER_API_KEY, or NANO_GPT_API_KEY)');
  }
  
  if (!hasTtsConfig) {
    missingRequirements.push('At least one speech service: Azure Speech key (AZURE_TTS_KEY/AZURE_STT_KEY), VoiceRSS API key (VOICERSS_API_KEY), Play.ht credentials, or ELEVENLABS_API_KEY');
  }

  // Log warnings for missing required variables
  if (missingRequirements.length > 0) {
    console.warn('\n⚠️ WARNING: Missing required environment variables:');
    missingRequirements.forEach(req => {
      console.warn(`  - ${req}`);
    });
    console.warn('\nPlease create or update your .env.local file with these variables.\n');
  } else {
    console.log('✅ All required environment variables are set.');
  }

  // Additional environment checks and recommendations
  if (process.env.USE_AZURE_SERVICES === 'true' && !hasAzureSpeechKey) {
    console.warn('⚠️ USE_AZURE_SERVICES is set to true but no Azure Speech keys are configured.');
  }

  if (process.env.USE_MCP_PROXY === 'true' && !process.env.MCP_SERVER_URL) {
    console.warn('⚠️ USE_MCP_PROXY is set to true but MCP_SERVER_URL is not configured.');
  }

  if (hasAiApiConfig && !process.env.OPENROUTER_MODEL && process.env.OPENAI_BASE_URL?.includes('openrouter.ai')) {
    console.warn('⚠️ Using OpenRouter but OPENROUTER_MODEL is not specified. Will use default model.');
  }
  
  // TTS-specific warnings
  if (hasAzureSpeechKey && (hasPlayHTConfig || hasElevenLabsKey || hasVoiceRssKey)) {
    console.warn('⚠️ Multiple TTS services configured. Azure Speech will be used if USE_AZURE_SERVICES=true.');
  } else if ((hasPlayHTConfig || hasElevenLabsKey) && hasVoiceRssKey) {
    console.warn('⚠️ Multiple TTS services configured. Check your configuration to ensure the right service is used.');
  }
  
  if (hasElevenLabsKey && process.env.USE_MCP_PROXY === 'true' && !process.env.MCP_SERVER_URL) {
    console.warn('⚠️ Using ElevenLabs with MCP proxy enabled, but MCP_SERVER_URL is not set.');
  }

  if (process.env.USE_LOCAL_TTS_PROXY === 'true' && process.env.NODE_ENV === 'production') {
    console.warn('⚠️ USE_LOCAL_TTS_PROXY should not be used in production. Please configure a real TTS service.');
  }
} 