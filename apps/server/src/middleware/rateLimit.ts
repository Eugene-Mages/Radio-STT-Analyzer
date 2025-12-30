import rateLimit, { Options } from 'express-rate-limit';
import { Request, Response } from 'express';
import { env } from '../env.js';
import { logger } from '../utils/logger.js';

// Extend Express Request type to include rateLimit
interface RateLimitInfo {
  limit: number;
  current: number;
  remaining: number;
  resetTime: Date | undefined;
}

interface RateLimitRequest extends Request {
  rateLimit?: RateLimitInfo;
}

/**
 * Base rate limiter configuration
 */
const baseOptions: Partial<Options> = {
  standardHeaders: true, // Return rate limit info in RateLimit-* headers
  legacyHeaders: false, // Disable X-RateLimit-* headers
  handler: (req: RateLimitRequest, res: Response) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      method: req.method,
    });
    const resetTime = req.rateLimit?.resetTime?.getTime();
    const retryAfter = resetTime ? Math.ceil((resetTime - Date.now()) / 1000) : 60;
    res.status(429).json({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter,
    });
  },
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health' || req.path === '/api/health';
  },
  keyGenerator: (req) => {
    // Use IP address as the key
    return req.ip || req.socket.remoteAddress || 'unknown';
  },
};

/**
 * Rate limiter for token endpoints
 * Limit: 60 requests per minute (configurable via env)
 */
export const tokenRateLimiter = rateLimit({
  ...baseOptions,
  windowMs: env.rateLimitWindowMs, // Default: 60 seconds
  max: env.rateLimitMaxRequests, // Default: 60 requests per window
  message: {
    error: 'Too Many Requests',
    message: 'Token request rate limit exceeded. Please wait before requesting a new token.',
  },
});

/**
 * Rate limiter for transcribe endpoints
 * Limit: 30 requests per minute (stricter for resource-intensive operations)
 */
export const transcribeRateLimiter = rateLimit({
  ...baseOptions,
  windowMs: env.rateLimitWindowMs, // Default: 60 seconds
  max: env.rateLimitTranscribeMax, // Default: 30 requests per window
  message: {
    error: 'Too Many Requests',
    message: 'Transcription rate limit exceeded. Please wait before making another request.',
  },
});

/**
 * General API rate limiter
 * More lenient for general endpoints
 */
export const generalRateLimiter = rateLimit({
  ...baseOptions,
  windowMs: 60000, // 1 minute
  max: 120, // 120 requests per minute
  message: {
    error: 'Too Many Requests',
    message: 'API rate limit exceeded. Please slow down your requests.',
  },
});

export default {
  token: tokenRateLimiter,
  transcribe: transcribeRateLimiter,
  general: generalRateLimiter,
};
