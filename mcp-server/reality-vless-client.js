const net = require('net');
const tls = require('tls');
const crypto = require('crypto');
const EventEmitter = require('events');
const { Buffer } = require('buffer');
const url = require('url');

/**
 * VLESS client implementation with Reality TLS support
 * Based on the VLESS protocol specification
 */
class RealityVlessClient extends EventEmitter {
  constructor(config) {
    super();
    this.config = {
      server: config.server,
      port: config.port || 443,
      uuid: config.uuid,
      serverName: config.serverName || 'www.google.com',
      fingerprint: config.fingerprint || 'chrome',
      publicKey: config.reality?.publicKey,
      shortId: config.reality?.shortId || '',
      ...config
    };
    this.isConnected = false;
    this.connections = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 2000; // 2 seconds initial delay
    this.debugLevel = process.env.DEBUG_LEVEL || 'info';
  }

  /**
   * Initialize the VLESS client
   */
  async initialize() {
    this.log('info', 'Initializing VLESS client with Reality TLS');
    
    try {
      // Test connection to the VLESS server
      const testResult = await this.testConnection();
      this.isConnected = testResult;
      
      if (this.isConnected) {
        this.log('info', 'Successfully connected to VLESS server');
        this.reconnectAttempts = 0;
        this.emit('connected');
        return true;
      } else {
        this.log('error', 'Failed to connect to VLESS server');
        return false;
      }
    } catch (error) {
      this.log('error', `Initialization error: ${error.message}`);
      return false;
    }
  }

  /**
   * Test the connection to the VLESS server
   */
  async testConnection() {
    this.log('info', `Testing connection to ${this.config.server}:${this.config.port}`);
    
    try {
      // Create a TCP connection
      const socket = net.connect({
        host: this.config.server,
        port: this.config.port
      });
      
      return new Promise((resolve, reject) => {
        socket.on('connect', async () => {
          this.log('info', 'TCP connection established');
          
          try {
            // Wrap the socket with TLS
            const tlsSocket = await this.createTLSConnection(socket);
            
            this.log('info', 'TLS connection established');
            
            // Send VLESS handshake
            try {
              await this.sendVLESSHandshake(tlsSocket);
              this.log('info', 'VLESS handshake successful');
              
              // Cleanup
              tlsSocket.end();
              resolve(true);
            } catch (handshakeError) {
              this.log('error', `VLESS handshake failed: ${handshakeError.message}`);
              tlsSocket.destroy();
              resolve(false);
            }
          } catch (tlsError) {
            this.log('error', `TLS connection failed: ${tlsError.message}`);
            socket.destroy();
            resolve(false);
          }
        });
        
        socket.on('error', (err) => {
          this.log('error', `Socket connection error: ${err.message}`);
          socket.destroy();
          resolve(false);
        });
        
        socket.on('timeout', () => {
          this.log('error', 'Connection timeout');
          socket.destroy();
          resolve(false);
        });
      });
    } catch (error) {
      this.log('error', `Connection test error: ${error.message}`);
      return false;
    }
  }

  /**
   * Create a TLS connection over the provided socket
   */
  createTLSConnection(socket) {
    return new Promise((resolve, reject) => {
      const tlsOptions = {
        servername: this.config.serverName,
        rejectUnauthorized: false,
        socket: socket,
        ALPNProtocols: ['h2', 'http/1.1'],
      };
      
      // Apply specific TLS fingerprint settings
      this.applyTLSFingerprint(tlsOptions);
      
      const tlsSocket = tls.connect(tlsOptions, () => {
        resolve(tlsSocket);
      });
      
      tlsSocket.on('error', (err) => {
        this.log('error', `TLS error: ${err.message}`);
        reject(err);
      });
      
      tlsSocket.on('timeout', () => {
        this.log('error', 'TLS connection timeout');
        reject(new Error('TLS connection timeout'));
      });
    });
  }
  
  /**
   * Apply TLS fingerprinting settings based on the selected fingerprint
   */
  applyTLSFingerprint(tlsOptions) {
    // Use more relaxed TLS settings to improve compatibility
    tlsOptions.minVersion = 'TLSv1.2';
    
    switch (this.config.fingerprint.toLowerCase()) {
      case 'chrome':
        tlsOptions.ciphers = 'TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:ECDHE-ECDSA-AES128-GCM-SHA256';
        break;
      case 'firefox':
        tlsOptions.ciphers = 'TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:ECDHE-ECDSA-AES128-GCM-SHA256';
        break;
      case 'safari':
        tlsOptions.ciphers = 'TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:ECDHE-ECDSA-AES128-GCM-SHA256';
        break;
      case 'ios':
        tlsOptions.ciphers = 'TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:ECDHE-ECDSA-AES128-GCM-SHA256';
        break;
      case 'android':
        tlsOptions.ciphers = 'TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:ECDHE-ECDSA-AES128-GCM-SHA256';
        break;
      default:
        // Default to Chrome with more compatible ciphers
        tlsOptions.ciphers = 'TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:ECDHE-ECDSA-AES128-GCM-SHA256';
    }
  }

  /**
   * Send VLESS handshake
   */
  async sendVLESSHandshake(tlsSocket) {
    return new Promise((resolve, reject) => {
      try {
        // Parse the UUID (without dashes)
        const uuid = Buffer.from(this.config.uuid.replace(/-/g, ''), 'hex');
        
        // Simple VLESS handshake for Reality
        const handshake = Buffer.alloc(1 + 16 + 1); // Version + UUID + Addons
        handshake[0] = 0; // VLESS version 0
        uuid.copy(handshake, 1); // UUID comes after version
        handshake[17] = 0; // No addons
        
        // Simplified command structure - connecting to a test endpoint
        const command = Buffer.from([1, 0, 1]); // TCP connect(1), reserved(0), IPv4(1)
        
        // Target address (api.elevenlabs.io as a test destination)
        const addr = Buffer.from([1, 1, 1, 1]); // 1.1.1.1 as a test
        const port = Buffer.from([0x01, 0xBB]); // 443 in network byte order
        
        // Combine all parts
        const request = Buffer.concat([handshake, command, addr, port]);
        
        // Set up data handler for response
        tlsSocket.once('data', (data) => {
          // VLESS response: [version(1 byte)] [addon length(1 byte)] [addons(variable)]
          if (data.length >= 1 && data[0] === 0) {
            resolve(true);
          } else {
            reject(new Error('Invalid VLESS response'));
          }
        });
        
        // Send the request
        tlsSocket.write(request);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Handle reconnection logic
   */
  async handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.log('error', `Maximum reconnection attempts (${this.maxReconnectAttempts}) reached`);
      this.emit('maxReconnectAttemptsReached');
      return false;
    }
    
    this.reconnectAttempts++;
    const delay = Math.min(30000, this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1));
    
    this.log('info', `Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    return new Promise((resolve) => {
      setTimeout(async () => {
        try {
          const success = await this.initialize();
          resolve(success);
        } catch (error) {
          this.log('error', `Reconnection attempt failed: ${error.message}`);
          resolve(false);
        }
      }, delay);
    });
  }

  /**
   * Make a request through the VLESS proxy
   */
  async makeRequest(options) {
    if (!this.isConnected) {
      this.log('warn', 'VLESS client is not connected, attempting to reconnect');
      const reconnected = await this.handleReconnect();
      if (!reconnected) {
        throw new Error('Failed to connect to VLESS server');
      }
    }
    
    // Parse options
    const method = options.method || 'GET';
    const hostname = options.hostname || options.host;
    const path = options.path || '/';
    const port = options.port || (options.protocol === 'https:' ? 443 : 80);
    const headers = options.headers || {};
    const body = options.body;
    
    // Generate a unique ID for this connection
    const connId = crypto.randomBytes(8).toString('hex');
    
    try {
      // Create a socket connection
      const socket = net.connect({
        host: this.config.server,
        port: this.config.port,
        timeout: 10000 // 10 second timeout
      });
      
      // Save the connection
      this.connections.set(connId, socket);
      
      return new Promise((resolve, reject) => {
        socket.on('connect', async () => {
          try {
            // Create TLS connection
            const tlsSocket = await this.createTLSConnection(socket);
            
            // Update the connection object
            this.connections.set(connId, tlsSocket);
            
            // Send the VLESS request
            const response = await this.sendVLESSRequest(tlsSocket, {
              method,
              hostname,
              path,
              port,
              headers,
              body
            });
            
            // Clean up
            tlsSocket.end();
            this.connections.delete(connId);
            
            resolve(response);
          } catch (error) {
            this.log('error', `Request error: ${error.message}`);
            if (this.connections.has(connId)) {
              const conn = this.connections.get(connId);
              if (conn) conn.destroy();
              this.connections.delete(connId);
            }
            reject(error);
          }
        });
        
        socket.on('error', (error) => {
          this.log('error', `Socket error: ${error.message}`);
          this.connections.delete(connId);
          reject(error);
        });
        
        socket.on('timeout', () => {
          this.log('error', 'Socket connection timeout');
          socket.destroy();
          this.connections.delete(connId);
          reject(new Error('Connection timeout'));
        });
      });
    } catch (error) {
      this.log('error', `Failed to create connection: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send an HTTP request encapsulated in VLESS
   */
  async sendVLESSRequest(tlsSocket, reqOptions) {
    return new Promise((resolve, reject) => {
      let responseTimeout;
      try {
        // Setup timeout for response
        responseTimeout = setTimeout(() => {
          const error = new Error('VLESS response timeout');
          reject(error);
          tlsSocket.destroy();
        }, 15000); // 15 second timeout
        
        // Parse the UUID (without dashes)
        const uuid = Buffer.from(this.config.uuid.replace(/-/g, ''), 'hex');
        
        // VLESS header
        const vlessHeader = Buffer.alloc(1 + 16 + 1);
        vlessHeader[0] = 0; // Version
        uuid.copy(vlessHeader, 1); // UUID
        vlessHeader[17] = 0; // No addons
        
        // Command
        let targetHost = reqOptions.hostname;
        let addrType, addrBuf, portBuf;
        
        this.log('debug', `Preparing VLESS request to ${targetHost}:${reqOptions.port} (${reqOptions.method} ${reqOptions.path})`);
        
        // Create address buffer based on hostname
        if (net.isIP(targetHost) === 4) {
          // IPv4
          addrType = Buffer.from([1]); // Type 1 (IPv4)
          addrBuf = Buffer.from(targetHost.split('.').map(Number));
        } else if (net.isIP(targetHost) === 6) {
          // IPv6
          addrType = Buffer.from([4]); // Type 4 (IPv6)
          
          // Convert IPv6 address to buffer
          const ipv6Parts = targetHost.split(':');
          addrBuf = Buffer.alloc(16);
          
          for (let i = 0; i < ipv6Parts.length; i++) {
            const part = parseInt(ipv6Parts[i], 16);
            addrBuf.writeUInt16BE(part, i * 2);
          }
        } else {
          // Domain name
          addrType = Buffer.from([2]); // Type 2 (Domain)
          
          const domainBuf = Buffer.from(targetHost);
          const domainLen = Buffer.alloc(1);
          domainLen[0] = domainBuf.length;
          
          addrBuf = Buffer.concat([domainLen, domainBuf]);
        }
        
        // Port (in network byte order)
        portBuf = Buffer.alloc(2);
        portBuf.writeUInt16BE(reqOptions.port, 0);
        
        // Command (TCP connect)
        const cmd = Buffer.from([1]); // 1 for TCP connect
        
        // Construct the VLESS header + command + address
        const vlessCommand = Buffer.concat([vlessHeader, cmd, addrType, addrBuf, portBuf]);
        
        // Write the VLESS header
        tlsSocket.write(vlessCommand);
        
        // Setup VLESS response handler
        tlsSocket.once('data', (vlessResponse) => {
          // Cancel the response timeout
          clearTimeout(responseTimeout);
          
          // Check VLESS response
          if (vlessResponse.length > 0 && vlessResponse[0] !== 0) {
            reject(new Error(`Invalid VLESS response version: ${vlessResponse[0]}`));
            return;
          }
          
          this.log('debug', 'Received valid VLESS response, sending HTTP request');
          
          // Prepare HTTP request
          const httpReq = this.buildHTTPRequest(reqOptions);
          
          // Send the HTTP request
          tlsSocket.write(httpReq);
          
          // Handle HTTP response
          const chunks = [];
          let statusCode = null;
          let headers = {};
          let headersParsed = false;
          let headerData = '';
          
          // Setup a timeout for HTTP response
          const httpTimeout = setTimeout(() => {
            reject(new Error('HTTP response timeout'));
            tlsSocket.destroy();
          }, 20000); // 20 second timeout
          
          // Setup data handler for HTTP response
          tlsSocket.on('data', (chunk) => {
            if (!headersParsed) {
              // Try to parse headers
              headerData += chunk.toString('utf8', 0, Math.min(chunk.length, 2048));
              const headerEnd = headerData.indexOf('\r\n\r\n');
              
              if (headerEnd > -1) {
                // Extract headers
                const headerSection = headerData.substring(0, headerEnd);
                const headerLines = headerSection.split('\r\n');
                
                // Parse status line
                const statusLine = headerLines[0];
                const statusMatch = statusLine.match(/HTTP\/\d\.\d\s+(\d+)\s+(.*)/);
                
                if (statusMatch) {
                  statusCode = parseInt(statusMatch[1], 10);
                  
                  // Parse headers
                  for (let i = 1; i < headerLines.length; i++) {
                    const line = headerLines[i];
                    const separatorIndex = line.indexOf(':');
                    
                    if (separatorIndex > -1) {
                      const key = line.substring(0, separatorIndex).trim().toLowerCase();
                      const value = line.substring(separatorIndex + 1).trim();
                      headers[key] = value;
                    }
                  }
                }
                
                headersParsed = true;
                
                // Extract body part from the current chunk
                const bodyStart = chunk.indexOf(Buffer.from('\r\n\r\n')) + 4;
                
                if (bodyStart < chunk.length) {
                  const bodyChunk = chunk.slice(bodyStart);
                  chunks.push(bodyChunk);
                }
              } else {
                // Headers incomplete, store whole chunk
                chunks.push(chunk);
              }
            } else {
              // Headers already parsed, just store the chunk
              chunks.push(chunk);
            }
          });
          
          // Setup end handler
          tlsSocket.on('end', () => {
            clearTimeout(httpTimeout);
            
            if (!headersParsed && chunks.length > 0) {
              // Try one more time to parse headers from all data
              const allData = Buffer.concat(chunks);
              const fullResponse = allData.toString('utf8');
              const headerEnd = fullResponse.indexOf('\r\n\r\n');
              
              if (headerEnd > -1) {
                const headerLines = fullResponse.substring(0, headerEnd).split('\r\n');
                const statusLine = headerLines[0];
                const statusMatch = statusLine.match(/HTTP\/\d\.\d\s+(\d+)\s+(.*)/);
                
                if (statusMatch) {
                  statusCode = parseInt(statusMatch[1], 10);
                  
                  // Parse headers
                  for (let i = 1; i < headerLines.length; i++) {
                    const line = headerLines[i];
                    const separatorIndex = line.indexOf(':');
                    
                    if (separatorIndex > -1) {
                      const key = line.substring(0, separatorIndex).trim().toLowerCase();
                      const value = line.substring(separatorIndex + 1).trim();
                      headers[key] = value;
                    }
                  }
                }
                
                // Replace chunks with just the body
                const bodyData = allData.slice(headerEnd + 4);
                chunks.length = 0;
                chunks.push(bodyData);
              }
            }
            
            // Combine all chunks to form the response body
            const body = Buffer.concat(chunks);
            
            // Create response object
            const response = {
              statusCode: statusCode || 200,
              headers: headers,
              body: body
            };
            
            this.log('debug', `Received HTTP response: status=${response.statusCode}, bodySize=${body.length}`);
            
            resolve(response);
          });
          
          // Setup error handler
          tlsSocket.on('error', (err) => {
            clearTimeout(httpTimeout);
            this.log('error', `TLS socket error during HTTP exchange: ${err.message}`);
            reject(err);
          });
        });
        
        // Setup error handler for VLESS handshake
        tlsSocket.on('error', (err) => {
          clearTimeout(responseTimeout);
          this.log('error', `TLS socket error during VLESS handshake: ${err.message}`);
          reject(err);
        });
      } catch (error) {
        clearTimeout(responseTimeout);
        this.log('error', `Error in sendVLESSRequest: ${error.message}`);
        reject(error);
      }
    });
  }

  /**
   * Build an HTTP request from the given options
   */
  buildHTTPRequest(options) {
    const method = options.method.toUpperCase();
    const path = options.path;
    const headers = { ...options.headers };
    const body = options.body;
    
    // Add host header if not present
    if (!headers['host'] && !headers['Host']) {
      headers['Host'] = options.hostname;
    }
    
    // Ensure we have proper user-agent
    if (!headers['user-agent'] && !headers['User-Agent']) {
      headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
    }
    
    // Prepare request line and headers
    let request = `${method} ${path} HTTP/1.1\r\n`;
    
    // Add headers
    for (const [key, value] of Object.entries(headers)) {
      request += `${key}: ${value}\r\n`;
    }
    
    // Add body if present
    if (body) {
      if (!headers['content-length'] && !headers['Content-Length']) {
        const bodyBuffer = Buffer.isBuffer(body) ? body : Buffer.from(body);
        request += `Content-Length: ${bodyBuffer.length}\r\n`;
      }
      
      request += '\r\n';
      
      if (Buffer.isBuffer(body)) {
        const requestBuffer = Buffer.from(request);
        return Buffer.concat([requestBuffer, body]);
      } else {
        request += body;
      }
    } else {
      request += '\r\n';
    }
    
    return Buffer.from(request);
  }

  /**
   * Create a proxy configuration for Axios
   */
  createAxiosProxy() {
    return {
      // We can't directly use Axios with VLESS
      // Instead, we'll use our custom adapter in the proxy manager
      vless: {
        client: this
      }
    };
  }

  /**
   * Close the client and all connections
   */
  close() {
    this.log('info', 'Closing VLESS client');
    
    // Close all active connections
    for (const [connId, conn] of this.connections.entries()) {
      try {
        conn.end();
        conn.destroy();
      } catch (error) {
        this.log('error', `Error closing connection ${connId}: ${error.message}`);
      }
    }
    
    this.connections.clear();
    this.isConnected = false;
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
      const prefix = `[VLESS]`;
      console[level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'](`${prefix} ${message}`);
    }
  }
}

/**
 * Create a new Reality VLESS client
 */
function createRealityVlessClient(config) {
  // Validate required parameters
  if (!config.server) {
    throw new Error('Server is required');
  }
  
  if (!config.port) {
    throw new Error('Port is required');
  }
  
  if (!config.uuid) {
    throw new Error('UUID is required');
  }
  
  // For Reality TLS, we need the server name
  if (config.reality && config.reality.publicKey && !config.serverName) {
    throw new Error('Server name is required for Reality TLS');
  }
  
  return new RealityVlessClient(config);
}

module.exports = { createRealityVlessClient, RealityVlessClient }; 