const { Agent: HttpAgent } = require('http');
const { Agent: HttpsAgent } = require('https');
const http = require('http');
const https = require('https');
const { createVLESSClient } = require('./vless-client');
const { createRealityVlessClient } = require('./reality-vless-client');
const dotenv = require('dotenv');
const url = require('url');

// Load environment variables
dotenv.config();

/**
 * Manager for proxy connections
 */
class ProxyManager {
  constructor() {
    this.vlessClient = null;
    this.httpAgent = null;
    this.httpsAgent = null;
    this.isRealityEnabled = process.env.VLESS_REALITY_ENABLED === 'true';
    this.debugLevel = process.env.DEBUG_LEVEL || 'info';
  }

  /**
   * Initialize the proxy manager
   */
  async initialize() {
    try {
      if (process.env.VLESS_ENABLED !== 'true') {
        this.log('info', 'VLESS proxy is disabled');
        return false;
      }
      
      const server = process.env.VLESS_SERVER;
      const port = parseInt(process.env.VLESS_PORT || '443', 10);
      const uuid = process.env.VLESS_UUID;
      
      if (!server || !port || !uuid) {
        this.log('error', 'Missing VLESS configuration parameters. Check your .env file.');
        return false;
      }
      
      // Check if we should use Reality or WebSocket
      if (this.isRealityEnabled) {
        this.log('info', 'Initializing Reality TLS VLESS client');
        
        const serverName = process.env.VLESS_SERVER_NAME;
        const fingerprint = process.env.VLESS_FINGERPRINT || 'chrome';
        const publicKey = process.env.VLESS_REALITY_PUBLIC_KEY;
        
        if (!serverName || !publicKey) {
          this.log('error', 'Missing Reality TLS configuration parameters. Check your .env file.');
          return false;
        }
        
        // Create Reality VLESS client
        this.vlessClient = createRealityVlessClient({
          server,
          port,
          uuid,
          serverName,
          fingerprint,
          reality: {
            publicKey,
            shortId: process.env.VLESS_REALITY_SHORT_ID || '',
          }
        });
      } else {
        this.log('info', 'Initializing WebSocket VLESS client');
        
        // Create standard VLESS client with WebSocket
        this.vlessClient = createVLESSClient({
          server,
          port,
          uuid,
          tls: process.env.VLESS_TLS === 'true',
          path: process.env.VLESS_PATH || '/',
        });
      }
      
      // Initialize the client
      const initialized = await this.vlessClient.initialize();
      
      if (initialized) {
        this.log('info', `VLESS client initialized successfully (${this.isRealityEnabled ? 'Reality TLS' : 'WebSocket'})`);
        return true;
      } else {
        this.log('error', 'Failed to initialize VLESS client');
        return false;
      }
    } catch (error) {
      this.log('error', `Proxy initialization error: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Make a request through the VLESS proxy
   */
  async makeProxiedRequest(options) {
    if (!this.vlessClient || !this.vlessClient.isConnected) {
      this.log('warn', 'VLESS client is not connected');
      
      // Attempt to reinitialize
      const initialized = await this.initialize();
      if (!initialized) {
        throw new Error('VLESS proxy is not available');
      }
    }
    
    try {
      this.log('debug', `Making proxied request to ${options.hostname}:${options.port}${options.path}`);
      
      let response;
      
      if (this.isRealityEnabled) {
        // Reality VLESS client uses different API
        response = await this.vlessClient.makeRequest(options);
      } else {
        // WebSocket VLESS client
        response = await this.vlessClient.sendRequest(options);
      }
      
      this.log('debug', `Received response: status=${response.statusCode}, body size=${response.body ? response.body.length : 0} bytes`);
      
      return response;
    } catch (error) {
      this.log('error', `Proxy request error: ${error.message}`);
      
      // Try to detect specific error conditions
      const errorMessage = error.message || '';
      
      if (errorMessage.includes('connect ETIMEDOUT') || 
          errorMessage.includes('timeout') || 
          errorMessage.includes('socket hang up')) {
        // Connection timeout or network issue
        throw new Error(`VLESS proxy connection timeout: ${errorMessage}`);
      } else if (errorMessage.includes('TLS') || 
                errorMessage.includes('SSL') ||
                errorMessage.includes('handshake')) {
        // TLS related error
        throw new Error(`VLESS TLS error: ${errorMessage}`);
      } else {
        // Generic error
        throw new Error(`VLESS proxy error: ${errorMessage}`);
      }
    }
  }
  
  /**
   * Attempt to make a request with fallback to direct request
   */
  async makeRequestWithFallback(options, directRequestFn) {
    try {
      // Try to make request through VLESS proxy
      return await this.makeProxiedRequest(options);
    } catch (error) {
      this.log('warn', `Falling back to direct request: ${error.message}`);
      
      // Fall back to direct request if proxy fails
      if (typeof directRequestFn === 'function') {
        return await directRequestFn();
      } else {
        throw error;
      }
    }
  }
  
  /**
   * Close the proxy connections
   */
  close() {
    if (this.vlessClient) {
      this.vlessClient.close();
      this.vlessClient = null;
    }
    
    this.log('info', 'Proxy connections closed');
  }
  
  /**
   * Log a message with the appropriate level
   */
  log(level, message) {
    const levels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3
    };
    
    const configLevel = levels[this.debugLevel] ?? 2;
    const messageLevel = levels[level] ?? 3;
    
    if (messageLevel <= configLevel) {
      const prefix = `[ProxyManager]`;
      console[level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'](`${prefix} ${message}`);
    }
  }
}

// Singleton instance
const proxyManager = new ProxyManager();

module.exports = proxyManager; 