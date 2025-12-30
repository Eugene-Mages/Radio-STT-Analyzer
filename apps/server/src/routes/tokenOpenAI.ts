/**
 * RSTA Server - OpenAI Token Minting Endpoint
 *
 * POST /api/token/openai
 *
 * Creates ephemeral tokens for OpenAI Realtime API access.
 * SECURITY: Never returns the actual API key to the client.
 */

import { Router, Request, Response } from "express";
import type { Router as RouterType } from "express";
import { httpPost } from "../utils/http.js";
import type {
  OpenAITokenRequest,
  OpenAITokenResponse,
  APIErrorResponse,
} from "@rsta/shared";

const router: RouterType = Router();

// OpenAI Realtime API session endpoint
const OPENAI_REALTIME_SESSION_URL = "https://api.openai.com/v1/realtime/sessions";

// Token expiry from environment or default to 5 minutes
const TOKEN_EXPIRY_SECONDS = parseInt(process.env.TOKEN_EXPIRY_SECONDS || "300", 10);

/**
 * Response shape from OpenAI's session creation endpoint
 */
interface OpenAISessionResponse {
  id: string;
  object: string;
  model: string;
  modalities: string[];
  instructions: string;
  voice: string;
  input_audio_format: string;
  output_audio_format: string;
  input_audio_transcription: {
    model: string;
  } | null;
  turn_detection: {
    type: string;
    threshold?: number;
    prefix_padding_ms?: number;
    silence_duration_ms?: number;
  } | null;
  tools: unknown[];
  tool_choice: string;
  temperature: number;
  max_response_output_tokens: number | string;
  client_secret: {
    value: string;
    expires_at: number;
  };
}

/**
 * POST /api/token/openai
 *
 * Creates an ephemeral session token for OpenAI Realtime API.
 * The client uses this token to connect directly to OpenAI's WebSocket.
 */
router.post("/", async (req: Request, res: Response) => {
  const requestBody = req.body as OpenAITokenRequest;
  const sessionId = requestBody.sessionId || "anonymous";

  // Validate API key is configured
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("[OpenAI Token] OPENAI_API_KEY not configured");
    const errorResponse: APIErrorResponse = {
      error: "OpenAI API key not configured",
      code: "PROVIDER_NOT_CONFIGURED",
    };
    return res.status(500).json(errorResponse);
  }

  // Validate API key format (basic sanity check)
  if (!apiKey.startsWith("sk-")) {
    console.error("[OpenAI Token] Invalid API key format");
    const errorResponse: APIErrorResponse = {
      error: "Invalid OpenAI API key configuration",
      code: "INVALID_CONFIGURATION",
    };
    return res.status(500).json(errorResponse);
  }

  try {
    console.log(`[OpenAI Token] Creating session for: ${sessionId}`);

    // Request a new realtime session from OpenAI
    // This creates an ephemeral token (client_secret) that expires
    const response = await httpPost<OpenAISessionResponse>(
      OPENAI_REALTIME_SESSION_URL,
      {
        model: "gpt-4o-realtime-preview-2024-12-17",
        modalities: ["audio", "text"],
        input_audio_transcription: {
          model: "whisper-1",
        },
        // Disable turn detection - we control when recording stops
        turn_detection: null,
      },
      {
        Authorization: `Bearer ${apiKey}`,
      },
      15000 // 15 second timeout
    );

    if (!response.ok || !response.data) {
      console.error(`[OpenAI Token] Failed to create session: ${response.error}`);
      const errorResponse: APIErrorResponse = {
        error: response.error || "Failed to create OpenAI session",
        code: "PROVIDER_ERROR",
      };
      return res.status(502).json(errorResponse);
    }

    const sessionData = response.data;

    // Validate response has required fields
    if (!sessionData.client_secret?.value) {
      console.error("[OpenAI Token] Invalid response - missing client_secret");
      const errorResponse: APIErrorResponse = {
        error: "Invalid response from OpenAI",
        code: "INVALID_PROVIDER_RESPONSE",
      };
      return res.status(502).json(errorResponse);
    }

    // Calculate expiry timestamp
    // Use OpenAI's expiry if provided, otherwise calculate from our config
    const expiresAt = sessionData.client_secret.expires_at
      ? sessionData.client_secret.expires_at * 1000 // Convert to milliseconds
      : Date.now() + TOKEN_EXPIRY_SECONDS * 1000;

    // Construct WebSocket URL for the Realtime API
    const websocketUrl = `wss://api.openai.com/v1/realtime?model=${sessionData.model}`;

    const tokenResponse: OpenAITokenResponse = {
      token: sessionData.client_secret.value,
      expiresAt,
      websocketUrl,
    };

    console.log(`[OpenAI Token] Session created, expires at: ${new Date(expiresAt).toISOString()}`);

    return res.json(tokenResponse);
  } catch (error) {
    // Log error without sensitive details
    console.error(
      "[OpenAI Token] Unexpected error:",
      error instanceof Error ? error.message : "Unknown error"
    );

    const errorResponse: APIErrorResponse = {
      error: "Internal server error",
      code: "INTERNAL_ERROR",
    };
    return res.status(500).json(errorResponse);
  }
});

export default router;
