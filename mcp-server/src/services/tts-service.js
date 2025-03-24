import fetch from 'node-fetch';
import { createHash } from 'crypto';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class TTSService {
  constructor(proxyService, logger) {
    this.proxyService = proxyService;
    this.logger = logger;
    this.apiKey = process.env.ELEVENLABS_API_KEY;
    this.defaultVoiceId = process.env.ELEVENLABS_VOICE_ID;
    this.baseUrl = 'https://api.elevenlabs.io/v1';
    this.cacheEnabled = process.env.ENABLE_RESPONSE_CACHE === 'true';
    this.cacheTTL = parseInt(process.env.CACHE_TTL_SECONDS) || 3600;
    this.cache = new Map();
  }

  async textToSpeech(text, voiceId = this.defaultVoiceId) {
    try {
      const cacheKey = this.generateCacheKey(text, voiceId);
      
      // Check cache if enabled
      if (this.cacheEnabled) {
        const cached = this.getCachedResponse(cacheKey);
        if (cached) {
          this.logger.info('Returning cached TTS response');
          return cached;
        }
      }

      // Prepare request
      const url = `${this.baseUrl}/text-to-speech/${voiceId}`;
      const body = JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.0,
          use_speaker_boost: true
        }
      });

      // Make request through proxy if configured
      const response = await this.proxyService.fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': this.apiKey
        },
        body
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`ElevenLabs API error: ${error}`);
      }

      const audioBuffer = await response.buffer();

      // Cache response if enabled
      if (this.cacheEnabled) {
        this.cacheResponse(cacheKey, audioBuffer);
      }

      // Save for debugging if in development
      if (process.env.NODE_ENV === 'development') {
        const debugPath = join(__dirname, '..', '..', 'test_tts.mp3');
        await writeFile(debugPath, audioBuffer);
        this.logger.debug(`Saved debug audio to ${debugPath}`);
      }

      return audioBuffer;
    } catch (error) {
      this.logger.error('TTS service error:', error);
      throw error;
    }
  }

  generateCacheKey(text, voiceId) {
    const data = `${text}:${voiceId}`;
    return createHash('md5').update(data).digest('hex');
  }

  getCachedResponse(key) {
    if (!this.cache.has(key)) return null;
    
    const { timestamp, data } = this.cache.get(key);
    const now = Date.now();
    
    if (now - timestamp > this.cacheTTL * 1000) {
      this.cache.delete(key);
      return null;
    }
    
    return data;
  }

  cacheResponse(key, data) {
    this.cache.set(key, {
      timestamp: Date.now(),
      data
    });

    // Clean old cache entries
    this.cleanCache();
  }

  cleanCache() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.cacheTTL * 1000) {
        this.cache.delete(key);
      }
    }
  }

  async getVoices() {
    try {
      const url = `${this.baseUrl}/voices`;
      const response = await this.proxyService.fetch(url, {
        headers: {
          'xi-api-key': this.apiKey
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch voices: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      this.logger.error('Error fetching voices:', error);
      throw error;
    }
  }

  async getVoiceSettings(voiceId = this.defaultVoiceId) {
    try {
      const url = `${this.baseUrl}/voices/${voiceId}/settings`;
      const response = await this.proxyService.fetch(url, {
        headers: {
          'xi-api-key': this.apiKey
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch voice settings: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      this.logger.error('Error fetching voice settings:', error);
      throw error;
    }
  }
}