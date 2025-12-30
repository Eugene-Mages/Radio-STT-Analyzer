import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { env } from '../env.js';
import { logger } from '../utils/logger.js';

/**
 * Custom application error with status code
 */
export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Common error factory functions
 */
export const createError = {
  badRequest: (message: string, code?: string) => new AppError(400, message, code),
  unauthorized: (message: string = 'Unauthorized', code?: string) => new AppError(401, message, code),
  forbidden: (message: string = 'Forbidden', code?: string) => new AppError(403, message, code),
  notFound: (message: string = 'Not Found', code?: string) => new AppError(404, message, code),
  conflict: (message: string, code?: string) => new AppError(409, message, code),
  tooManyRequests: (message: string = 'Too Many Requests', code?: string) => new AppError(429, message, code),
  internal: (message: string = 'Internal Server Error', code?: string) => new AppError(500, message, code),
  serviceUnavailable: (message: string = 'Service Unavailable', code?: string) => new AppError(503, message, code),
};

/**
 * Error response shape
 */
interface ErrorResponse {
  error: string;
  message: string;
  code?: string;
  stack?: string;
}

/**
 * Global error handling middleware
 * - Logs errors appropriately
 * - Returns consistent error responses
 * - Hides stack traces in production
 * - Never exposes sensitive information
 */
export const errorHandler: ErrorRequestHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Default to 500 if no status code
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const code = err instanceof AppError ? err.code : undefined;

  // Log the error
  if (statusCode >= 500) {
    logger.error(`Server Error: ${err.message}`, err, {
      path: req.path,
      method: req.method,
      statusCode,
    });
  } else {
    logger.warn(`Client Error: ${err.message}`, {
      path: req.path,
      method: req.method,
      statusCode,
      code,
    });
  }

  // Build error response
  const response: ErrorResponse = {
    error: statusCode >= 500 ? 'Internal Server Error' : err.name || 'Error',
    message: statusCode >= 500 && env.nodeEnv === 'production' ? 'An unexpected error occurred' : err.message,
  };

  // Add error code if present
  if (code) {
    response.code = code;
  }

  // Add stack trace in development
  if (env.nodeEnv === 'development' && env.debug) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

/**
 * 404 Not Found handler
 * Use as the last route handler
 */
export const notFoundHandler = (req: Request, res: Response, _next: NextFunction): void => {
  logger.debug('Route not found', { path: req.path, method: req.method });
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`,
  });
};

/**
 * Async route wrapper to catch errors
 * Wraps async route handlers to properly forward errors to error middleware
 */
export const asyncHandler = <T>(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<T>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export default errorHandler;
