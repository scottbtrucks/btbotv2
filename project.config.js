/**
 * Shared configuration values used across the project
 */
module.exports = {
  // Project metadata
  name: 'Business Trucks AI Assistant',
  version: '1.0.0',
  description: 'AI-powered assistant for commercial vehicle sales with voice interface',

  // Path configurations
  paths: {
    app: 'app',
    components: 'components',
    lib: 'lib',
    public: 'public',
    styles: 'styles',
    tests: 'tests',
    docs: 'docs',
    build: '.next',
  },

  // Feature flags
  features: {
    voiceInterface: true,
    debugMode: process.env.NODE_ENV === 'development',
    errorReporting: true,
    apiCache: true,
  },

  // API endpoints
  endpoints: {
    chat: '/api/chat',
    tts: '/api/text-to-speech',
    stt: '/api/speech-to-text',
    voice: '/api/process-voice',
    debug: '/api/debug',
  },

  // Voice service configurations
  voice: {
    defaultProvider: 'azure',
    maxAudioSize: 10 * 1024 * 1024, // 10MB
    supportedFormats: ['mp3', 'wav'],
    defaultVoiceId: {
      azure: 'ru-RU-SvetlanaNeural',
      elevenlabs: 'pNInz6obpgDQGcFmaJgB',
      playht: 's3://voice-cloning-zero-shot/d9ff78ba-d016-47f6-b0ef-dd630f59414e/female-cs/manifest.json',
    },
  },

  // Performance configurations
  performance: {
    cacheTTL: 3600,
    maxRequestsPerMinute: 60,
    timeoutMS: 30000,
  },

  // Development configurations
  development: {
    port: 3000,
    devServerPort: 3001,
    mcpServerPort: 3002,
  },

  // Testing configurations
  testing: {
    coverage: {
      statements: 70,
      branches: 70,
      functions: 70,
      lines: 70,
    },
    timeout: 10000,
  },

  // Browser compatibility
  browserSupport: {
    chrome: '>=90',
    firefox: '>=90',
    safari: '>=15',
    edge: '>=90',
  },
}