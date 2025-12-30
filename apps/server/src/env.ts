import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from server root
config({ path: resolve(__dirname, '../.env') });

/**
 * Environment configuration for RSTA server
 * All values are loaded from .env file and typed for safety
 */
export interface EnvConfig {
  // Server
  port: number;
  nodeEnv: 'development' | 'production' | 'test';

  // API Keys (masked in logs, never exposed)
  openaiApiKey: string | undefined;
  elevenLabsApiKey: string | undefined;

  // Realtime Mode
  realtimeMode: 'direct' | 'proxy';

  // Token Configuration
  tokenExpirySeconds: number;

  // Rate Limiting
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
  rateLimitTranscribeMax: number;

  // CORS
  corsOrigin: string;

  // Logging
  debug: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  logToFile: boolean;

  // Cost Rates
  costRateOpenai: number;
  costRateElevenLabs: number;
}

function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) return defaultValue;
  return value.toLowerCase() === 'true';
}

function parseNumber(value: string | undefined, defaultValue: number): number {
  if (value === undefined) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

function parseFloat_(value: string | undefined, defaultValue: number): number {
  if (value === undefined) return defaultValue;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
}

function parseLogLevel(value: string | undefined): 'debug' | 'info' | 'warn' | 'error' {
  const validLevels = ['debug', 'info', 'warn', 'error'];
  if (value && validLevels.includes(value.toLowerCase())) {
    return value.toLowerCase() as 'debug' | 'info' | 'warn' | 'error';
  }
  return 'info';
}

function parseRealtimeMode(value: string | undefined): 'direct' | 'proxy' {
  if (value === 'proxy') return 'proxy';
  return 'direct';
}

function parseNodeEnv(value: string | undefined): 'development' | 'production' | 'test' {
  const validEnvs = ['development', 'production', 'test'];
  if (value && validEnvs.includes(value.toLowerCase())) {
    return value.toLowerCase() as 'development' | 'production' | 'test';
  }
  return 'development';
}

/**
 * Loaded and validated environment configuration
 */
export const env: EnvConfig = {
  // Server
  port: parseNumber(process.env.PORT, 3001),
  nodeEnv: parseNodeEnv(process.env.NODE_ENV),

  // API Keys - loaded but NEVER logged
  openaiApiKey: process.env.OPENAI_API_KEY,
  elevenLabsApiKey: process.env.ELEVENLABS_API_KEY,

  // Realtime Mode
  realtimeMode: parseRealtimeMode(process.env.REALTIME_MODE),

  // Token Configuration
  tokenExpirySeconds: parseNumber(process.env.TOKEN_EXPIRY_SECONDS, 300),

  // Rate Limiting
  rateLimitWindowMs: parseNumber(process.env.RATE_LIMIT_WINDOW_MS, 60000),
  rateLimitMaxRequests: parseNumber(process.env.RATE_LIMIT_MAX_REQUESTS, 60),
  rateLimitTranscribeMax: parseNumber(process.env.RATE_LIMIT_TRANSCRIBE_MAX, 30),

  // CORS - only localhost allowed
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',

  // Logging
  debug: parseBoolean(process.env.DEBUG, false),
  logLevel: parseLogLevel(process.env.LOG_LEVEL),
  logToFile: parseBoolean(process.env.LOG_TO_FILE, false),

  // Cost Rates
  costRateOpenai: parseFloat_(process.env.COST_RATE_OPENAI, 0.006),
  costRateElevenLabs: parseFloat_(process.env.COST_RATE_ELEVENLABS, 0.0003),
};

/**
 * Check if OpenAI API key is configured
 * Does NOT expose the actual key
 */
export function isOpenAIConfigured(): boolean {
  return Boolean(env.openaiApiKey && env.openaiApiKey.startsWith('sk-'));
}

/**
 * Check if ElevenLabs API key is configured
 * Does NOT expose the actual key
 */
export function isElevenLabsConfigured(): boolean {
  return Boolean(env.elevenLabsApiKey && env.elevenLabsApiKey.length > 0);
}

/**
 * Get safe config for logging (no secrets)
 */
export function getSafeConfig(): Omit<EnvConfig, 'openaiApiKey' | 'elevenLabsApiKey'> & {
  openaiConfigured: boolean;
  elevenLabsConfigured: boolean;
} {
  const { openaiApiKey, elevenLabsApiKey, ...safeConfig } = env;
  return {
    ...safeConfig,
    openaiConfigured: isOpenAIConfigured(),
    elevenLabsConfigured: isElevenLabsConfigured(),
  };
}
