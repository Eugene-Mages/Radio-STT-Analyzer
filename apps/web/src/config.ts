/**
 * Application Configuration Module
 *
 * Imports and exports the app configuration from app_config.json.
 * Provides typed access to configuration values throughout the app.
 */

import appConfigJson from '@data/app_config.json';

/**
 * Scoring weights for R/T performance evaluation
 */
export interface ScoringWeights {
  clarity: number;
  pace: number;
  structure: number;
}

/**
 * Pace configuration for speech analysis
 */
export interface PaceConfig {
  idealWpmMin: number;
  idealWpmMax: number;
  acceptableWpmMin: number;
  acceptableWpmMax: number;
  pauseThresholdMs: number;
  longPauseThresholdMs: number;
}

/**
 * Cost rates for external services
 */
export interface CostRates {
  openai: number;
  elevenlabs: number;
}

/**
 * Timeout configuration for various operations
 */
export interface Timeouts {
  connectMs: number;
  finalizationMs: number;
  maxRecordingMs: number;
}

/**
 * Feature flags for controlling app behavior
 */
export interface FeatureFlags {
  realtimeMode: 'direct' | 'proxy';
  enableProxyFallback: boolean;
  debugLogging: boolean;
  lockSelectionDuringRecording: boolean;
  allowSkipScoring: boolean;
}

/**
 * Complete application configuration type
 */
export interface AppConfig {
  receiverCallsignDefault: string;
  acceptedReceiverTokens: string[];
  scoringWeights: ScoringWeights;
  paceConfig: PaceConfig;
  costRates: CostRates;
  timeouts: Timeouts;
  featureFlags: FeatureFlags;
}

/**
 * Typed application configuration
 *
 * @example
 * ```typescript
 * import { APP_CONFIG } from '@/config';
 *
 * const maxRecording = APP_CONFIG.timeouts.maxRecordingMs;
 * const isDebug = APP_CONFIG.featureFlags.debugLogging;
 * ```
 */
export const APP_CONFIG: AppConfig = appConfigJson as AppConfig;

/**
 * Helper to check if debug logging is enabled
 */
export const isDebugMode = (): boolean => APP_CONFIG.featureFlags.debugLogging;

/**
 * Helper to get the default receiver callsign
 */
export const getDefaultReceiver = (): string => APP_CONFIG.receiverCallsignDefault;

/**
 * Helper to check if a receiver token is valid
 */
export const isValidReceiverToken = (token: string): boolean => {
  return APP_CONFIG.acceptedReceiverTokens.includes(token.toLowerCase());
};

export default APP_CONFIG;
