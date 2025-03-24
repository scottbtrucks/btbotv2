import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import responseTime from 'response-time';
import pino from 'pino';
import pinoHttp from 'pino-http';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { config } from 'dotenv';
import { ProxyService } from './services/proxy-service.js';
import { TTSService } from './services/tts-service.js';
import { MetricsService } from './services/metrics-service.js';
import { errorHandler } from './middleware/error-handler.js';
import { validateRequest } from './middleware/validate-request.js';
import { healthRouter } from './routes/health.js';
import { ttsRouter } from './routes/tts.js';
import { metricsRouter } from './routes/metrics.js';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: process.env.NODE_ENV === 'test' ? '.env.test' : '.env' });

// Initialize logger
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true
    }
  }
});

// Initialize Express app
const app = express();

// Configure middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(pinoHttp({ logger }));
app.use(responseTime());

// Configure rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
});
app.use(limiter);

// Initialize services
const proxyService = new ProxyService(logger);
const ttsService = new TTSService(proxyService, logger);
const metricsService = new MetricsService();

// Health check endpoint
app.use('/health', healthRouter);

// TTS endpoints
app.use('/tts', validateRequest, ttsRouter(ttsService));

// Metrics endpoint (if enabled)
if (process.env.ENABLE_METRICS === 'true') {
  app.use('/metrics', metricsRouter(metricsService));
}

// Error handling
app.use(errorHandler);

// Start server
const port = process.env.PORT || 3002;
const server = app.listen(port, () => {
  logger.info(`MCP Server listening on port ${port}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received. Shutting down gracefully...');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

export default server;