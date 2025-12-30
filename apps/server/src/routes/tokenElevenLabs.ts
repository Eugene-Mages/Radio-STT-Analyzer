/**
 * RSTA Server - ElevenLabs Token Minting Endpoint
 *
 * POST /api/token/elevenlabs
 *
 * Fetches a single-use token from ElevenLabs API for secure client-side
 * Speech-to-Text WebSocket connections.
 *
 * SECURITY: Never returns the actual API key to the client.
 * Uses ElevenLabs' official single-use token endpoint.
 */

import { Router, Request, Response } from "express";
import type { Router as RouterType } from "express";
import type {
  ElevenLabsTokenRequest,
  ElevenLabsTokenResponse,
  APIErrorResponse,
} from "@rsta/shared";

const router: RouterType = Router();

// ElevenLabs API endpoints
const ELEVENLABS_API_BASE = "https://api.elevenlabs.io/v1";
const ELEVENLABS_TOKEN_ENDPOINT = `${ELEVENLABS_API_BASE}/single-use-token/realtime_scribe`;
const ELEVENLABS_STT_WS_BASE = "wss://api.elevenlabs.io/v1/speech-to-text/realtime";

// Token expiry - ElevenLabs tokens expire after 15 minutes
const TOKEN_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Fetch a single-use token from ElevenLabs API
 */
async function fetchElevenLabsToken(apiKey: string): Promise<string> {
  const response = await fetch(ELEVENLABS_TOKEN_ENDPOINT, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ElevenLabs token request failed: ${response.status} - ${errorText}`);
  }

  const data = await response.json() as { token: string };
  return data.token;
}

/**
 * Build the WebSocket URL with the token and configuration
 */
function buildWebSocketUrl(token: string): string {
  const params = new URLSearchParams({
    token: token,
    model_id: "scribe_v1",
    language_code: "en",
    // Use PCM 16kHz mono format (matches our audio capture)
    audio_format: "pcm_16000",
    // Use VAD for automatic speech detection
    commit_strategy: "vad",
    // Include word-level timestamps for filler detection
    include_timestamps: "true",
  });

  return `${ELEVENLABS_STT_WS_BASE}?${params.toString()}`;
}

/**
 * POST /api/token/elevenlabs
 *
 * Creates a single-use authentication token for ElevenLabs Speech-to-Text WebSocket.
 *
 * This endpoint:
 * 1. Validates the server-side API key is configured
 * 2. Requests a single-use token from ElevenLabs
 * 3. Returns the token and pre-built WebSocket URL to the client
 *
 * The returned token is time-limited (15 minutes) and single-use,
 * making it safe to pass to the client without exposing the API key.
 */
router.post("/", async (req: Request, res: Response) => {
  const requestBody = req.body as ElevenLabsTokenRequest;
  const sessionId = requestBody.sessionId || "anonymous";

  // Validate API key is configured
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    console.error("[ElevenLabs Token] ELEVENLABS_API_KEY not configured");
    const errorResponse: APIErrorResponse = {
      error: "ElevenLabs API key not configured",
      code: "PROVIDER_NOT_CONFIGURED",
    };
    return res.status(500).json(errorResponse);
  }

  // Basic validation - ElevenLabs keys typically start with 'sk_' or are UUIDs
  if (apiKey.length < 10) {
    console.error("[ElevenLabs Token] Invalid API key format");
    const errorResponse: APIErrorResponse = {
      error: "Invalid ElevenLabs API key configuration",
      code: "INVALID_CONFIGURATION",
    };
    return res.status(500).json(errorResponse);
  }

  try {
    console.log(`[ElevenLabs Token] Requesting single-use token for session: ${sessionId}`);

    // Fetch single-use token from ElevenLabs
    const token = await fetchElevenLabsToken(apiKey);

    // Build WebSocket URL with the token
    const websocketUrl = buildWebSocketUrl(token);

    // Calculate expiry time (15 minutes from now)
    const expiresAt = Date.now() + TOKEN_EXPIRY_MS;

    const tokenResponse: ElevenLabsTokenResponse = {
      token: token,
      expiresAt: expiresAt,
      websocketUrl: websocketUrl,
    };

    console.log(
      `[ElevenLabs Token] Token issued, expires at: ${new Date(expiresAt).toISOString()}`
    );

    return res.json(tokenResponse);
  } catch (error) {
    // Log error without sensitive details
    console.error(
      "[ElevenLabs Token] Token request failed:",
      error instanceof Error ? error.message : "Unknown error"
    );

    const errorResponse: APIErrorResponse = {
      error: "Failed to obtain ElevenLabs token",
      code: "TOKEN_REQUEST_FAILED",
    };
    return res.status(500).json(errorResponse);
  }
});

export default router;
