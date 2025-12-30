import { Router, Request, Response } from 'express';
import type { Router as RouterType } from 'express';
import { isOpenAIConfigured, isElevenLabsConfigured } from '../env.js';

/**
 * Health check response shape
 */
interface HealthResponse {
  ok: boolean;
  providers: {
    openai: boolean;
    elevenlabs: boolean;
  };
  timestamp: string;
  version: string;
}

/**
 * Health check router
 */
const router: RouterType = Router();

/**
 * GET /health
 * Returns server health status and provider availability
 *
 * Response:
 * - ok: true if server is running
 * - providers: object showing which API providers are configured
 * - timestamp: ISO timestamp of the check
 * - version: server version
 *
 * Note: This endpoint does NOT validate API keys, only checks if they are configured
 */
router.get('/', (_req: Request, res: Response) => {
  const response: HealthResponse = {
    ok: true,
    providers: {
      openai: isOpenAIConfigured(),
      elevenlabs: isElevenLabsConfigured(),
    },
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  };

  res.json(response);
});

/**
 * GET /health/ready
 * Readiness probe - checks if server is ready to accept requests
 */
router.get('/ready', (_req: Request, res: Response) => {
  const openaiReady = isOpenAIConfigured();
  const elevenLabsReady = isElevenLabsConfigured();

  // Server is ready if at least one provider is configured
  const isReady = openaiReady || elevenLabsReady;

  const response = {
    ready: isReady,
    providers: {
      openai: openaiReady,
      elevenlabs: elevenLabsReady,
    },
    timestamp: new Date().toISOString(),
  };

  if (isReady) {
    res.json(response);
  } else {
    res.status(503).json({
      ...response,
      message: 'No providers configured. Please set API keys in .env file.',
    });
  }
});

/**
 * GET /health/live
 * Liveness probe - simple check that server is running
 */
router.get('/live', (_req: Request, res: Response) => {
  res.json({
    alive: true,
    timestamp: new Date().toISOString(),
  });
});

export default router;
