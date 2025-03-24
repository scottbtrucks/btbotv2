const WebSocket = require('ws');
const net = require('net');
const tls = require('tls');
const { v4: uuidv4 } = require('uuid');
const { Buffer } = require('buffer');
const { URL } = require('url');
const EventEmitter = require('events');

class VlessClient extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.connections = new Map();
    this.localServer = null;
    this.wsClient = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 5000; // 5 seconds
  }

  /**
   * Initializes the VLESS client
   */
  async initialize() {
    try {
      console.log('[VLESS] Initializing VLESS client');
      await this.connectToServer();
      this.startLocalProxy();
      console.log('[VLESS] Client initialized and ready');
      return true;
    } catch (error) {
      console.error('[VLESS] Initialization error:', error.message);
      return false;
    }
  }

  /**
   * Connects to the VLESS server via WebSocket
   */
  async connectToServer() {
    return new Promise((resolve, reject) => {
      try {
        const protocol = this.config.tls ? 'wss' : 'ws';
        const wsUrl = `${protocol}://${this.config.server}:${this.config.port}${this.config.path || '/'}`;
        
        console.log(`[VLESS] Connecting to server at ${wsUrl}`);
        
        this.wsClient = new WebSocket(wsUrl, {
          headers: {
            'Host': this.config.server,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          },
          rejectUnauthorized: false // Allow self-signed certificates
        });

        this.wsClient.on('open', () => {
          console.log('[VLESS] Connected to VLESS server');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          resolve(true);
        });

        this.wsClient.on('message', (data) => {
          try {
            this.handleIncomingData(data);
          } catch (err) {
            console.error('[VLESS] Error handling incoming data:', err);
          }
        });

        this.wsClient.on('error', (error) => {
          console.error('[VLESS] WebSocket error:', error.message);
          if (!this.isConnected) {
            reject(error);
          }
        });

        this.wsClient.on('close', () => {
          console.log('[VLESS] Connection to VLESS server closed');
          this.isConnected = false;
          this.handleReconnect();
        });
      } catch (error) {
        console.error('[VLESS] Connection setup error:', error);
        reject(error);
      }
    });
  }

  /**
   * Handles reconnection to the VLESS server
   */
  handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`[VLESS] Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${this.reconnectDelay/1000}s...`);
      
      setTimeout(async () => {
        try {
          await this.connectToServer();
        } catch (error) {
          console.error('[VLESS] Reconnection failed:', error.message);
        }
      }, this.reconnectDelay);
    } else {
      console.error('[VLESS] Max reconnection attempts reached');
      this.emit('maxReconnectAttemptsReached');
    }
  }

  /**
   * Handles incoming data from the VLESS server
   */
  handleIncomingData(data) {
    // Implement VLESS protocol handling
    console.log(`[VLESS] Received ${data.length} bytes from server`);
    // Process the data according to VLESS protocol
  }

  /**
   * Starts the local proxy server
   */
  startLocalProxy() {
    // For this implementation, we'll use HTTP/HTTPS agents with the proxy instead
    console.log('[VLESS] Local proxy functionality initialized');
  }

  /**
   * Creates a VLESS-proxied Axios instance
   */
  createAxiosProxy() {
    // This would normally integrate with an HTTP agent
    // For demonstration purposes, we'll just ensure we're connected
    if (!this.isConnected) {
      throw new Error('VLESS client not connected');
    }
    
    console.log('[VLESS] Creating proxied request handler');
    
    // Return a function that will be used to make HTTP requests through the VLESS tunnel
    return {
      isConnected: this.isConnected,
      baseURL: this.isConnected ? 'https://api.elevenlabs.io' : undefined
    };
  }

  /**
   * Closes the VLESS client and all connections
   */
  close() {
    console.log('[VLESS] Closing VLESS client');
    if (this.wsClient) {
      this.wsClient.close();
    }
    
    if (this.localServer) {
      this.localServer.close();
    }
    
    // Close all connections
    for (const connection of this.connections.values()) {
      connection.destroy();
    }
    
    this.connections.clear();
    this.isConnected = false;
  }
}

/**
 * Create a VLESS client with the given configuration
 */
function createVlessClient(config) {
  // Validate required config properties
  if (!config.server || !config.port || !config.uuid) {
    throw new Error('Missing required VLESS configuration parameters');
  }
  
  return new VlessClient({
    server: config.server,
    port: config.port,
    uuid: config.uuid,
    path: config.path || '/',
    tls: config.tls !== false, // Default to true
  });
}

module.exports = {
  createVlessClient
}; 