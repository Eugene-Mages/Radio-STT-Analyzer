/**
 * RSTA Server - Main Entry Point
 * Radio Speech-To-Text Analyzer Backend
 *
 * Provides API endpoints for:
 * - Health checks
 * - Token minting for OpenAI and ElevenLabs realtime APIs
 */

import express, { Request, Response, NextFunction, Application } from 'express';
import { env, getSafeConfig } from './env.js';
import { logger } from './utils/logger.js';
import { corsMiddleware } from './middleware/cors.js';
import { tokenRateLimiter, transcribeRateLimiter, generalRateLimiter } from './middleware/rateLimit.js';
import { errorHandler, notFoundHandler } from './middleware/errors.js';
import healthRouter from './routes/health.js';
import tokenOpenAIRouter from './routes/tokenOpenAI.js';
import tokenElevenLabsRouter from './routes/tokenElevenLabs.js';

/**
 * Create and configure Express application
 */
const app: Application = express();

// ============================================================================
// Core Middleware
// ============================================================================

// Trust proxy for accurate IP detection behind reverse proxies
app.set('trust proxy', 1);

// CORS - localhost only
app.use(corsMiddleware);

// JSON body parser with size limit
app.use(express.json({ limit: '10mb' }));

// URL-encoded body parser
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================================================
// Request Logging Middleware
// ============================================================================

app.use((req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.request(req.method, req.path, res.statusCode, duration);
  });

  next();
});

// ============================================================================
// Routes
// ============================================================================

// Health endpoints (no rate limiting)
app.use('/health', healthRouter);
app.use('/api/health', healthRouter);

// Token minting routes (with token rate limiting - 60 req/min)
app.use('/api/token/openai', tokenRateLimiter, tokenOpenAIRouter);
app.use('/api/token/elevenlabs', tokenRateLimiter, tokenElevenLabsRouter);

// Transcribe endpoints (with stricter rate limiting - 30 req/min)
// Placeholder for future transcribe routes
app.use('/api/transcribe', transcribeRateLimiter);

// General API rate limiting for other endpoints
app.use('/api', generalRateLimiter);

// ============================================================================
// Error Handling
// ============================================================================

// 404 handler - must be after all routes
app.use(notFoundHandler);

// Global error handler - must be last
app.use(errorHandler);

// ============================================================================
// Server Startup
// ============================================================================

/**
 * Start the Express server
 */
function startServer(): void {
  const port = env.port;

  const server = app.listen(port, () => {
    logger.startup(port, env.nodeEnv);

    // Log safe configuration (no secrets)
    const safeConfig = getSafeConfig();
    logger.info('Server configuration loaded', {
      providers: {
        openai: safeConfig.openaiConfigured,
        elevenlabs: safeConfig.elevenLabsConfigured,
      },
      realtimeMode: safeConfig.realtimeMode,
      corsOrigin: safeConfig.corsOrigin,
    });

    // Warn if no providers configured
    if (!safeConfig.openaiConfigured && !safeConfig.elevenLabsConfigured) {
      logger.warn('No API providers configured. Please set API keys in .env file.');
    }
  });

  // Graceful shutdown handling
  const shutdown = (signal: string) => {
    logger.info(`Received ${signal}. Shutting down gracefully...`);
    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });

    // Force exit after 10 seconds
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Handle unhandled errors
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection', reason as Error, { promise: String(promise) });
  });

  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception', error);
    process.exit(1);
  });
}

// Start the server
startServer();

export { app };
export default app;
