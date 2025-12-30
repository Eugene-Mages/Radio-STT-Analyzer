import cors, { CorsOptions } from 'cors';
import { env } from '../env.js';
import { logger } from '../utils/logger.js';

/**
 * Allowed localhost origins for CORS
 * Security: Only localhost origins are permitted
 */
const ALLOWED_ORIGINS = [
  'http://localhost:5173', // Vite dev server
  'http://localhost:3000', // Alternative dev port
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
];

/**
 * Validate if origin is allowed
 * Only localhost origins are permitted for security
 */
function isOriginAllowed(origin: string | undefined): boolean {
  if (!origin) {
    // Allow requests with no origin (like curl, Postman, or same-origin)
    return true;
  }

  // Check against allowed localhost origins
  if (ALLOWED_ORIGINS.includes(origin)) {
    return true;
  }

  // Allow configured origin from env
  if (origin === env.corsOrigin) {
    return true;
  }

  // Check if it's a localhost variant
  const localhostPattern = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
  if (localhostPattern.test(origin)) {
    return true;
  }

  return false;
}

/**
 * CORS configuration options
 * Security: Restricts to localhost origins only
 */
const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      logger.warn('CORS request blocked', { origin });
      callback(new Error('CORS not allowed from this origin'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  maxAge: 86400, // 24 hours
};

/**
 * CORS middleware configured for localhost-only access
 */
export const corsMiddleware = cors(corsOptions);

export default corsMiddleware;
