/**
 * Provider Types
 * Type definitions for realtime STT provider connections
 */

import type {
  ProviderStatus,
  TranscriptState,
  WordTiming,
  FillerCount,
  RealtimeEvent,
  TranscriptEvent,
  WordTimingEvent,
  ErrorEvent,
} from '@rsta/shared';

// Re-export for convenience
export type { ProviderStatus, TranscriptState, WordTiming, FillerCount };

// ============================================================================
// CONNECTION STATE
// ============================================================================

export type ConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error'
  | 'closed';

export interface ConnectionInfo {
  state: ConnectionState;
  providerId: 'openai' | 'elevenlabs';
  connectedAt: number | null;
  lastError: string | null;
  reconnectAttempts: number;
  latencyMs: number | null;
}

// ============================================================================
// REALTIME CONNECTION
// ============================================================================

export interface RealtimeConnection {
  /** Current connection state */
  readonly state: ConnectionState;

  /** Provider identifier */
  readonly providerId: 'openai' | 'elevenlabs';

  /** Connect to the realtime service */
  connect(): Promise<void>;

  /** Disconnect from the realtime service */
  disconnect(): void;

  /** Send audio data to the service */
  sendAudio(chunk: ArrayBuffer): void;

  /** Signal end of audio stream */
  endAudio(): void;

  /** Check if connection is active */
  isConnected(): boolean;

  /** Get connection info */
  getConnectionInfo(): ConnectionInfo;
}

// ============================================================================
// PROVIDER EVENTS
// ============================================================================

export type ProviderEventType =
  | 'connection_state_change'
  | 'transcript_interim'
  | 'transcript_committed'
  | 'transcript_final'
  | 'word_timing'
  | 'error'
  | 'timeout'
  | 'audio_level';

export interface ProviderEventMap {
  connection_state_change: ConnectionStateChangeEvent;
  transcript_interim: TranscriptEvent;
  transcript_committed: TranscriptEvent;
  transcript_final: TranscriptEvent;
  word_timing: WordTimingEvent;
  error: ErrorEvent;
  timeout: TimeoutEvent;
  audio_level: AudioLevelEvent;
}

export interface ConnectionStateChangeEvent {
  type: 'connection_state_change';
  providerId: 'openai' | 'elevenlabs';
  timestamp: number;
  data: {
    previousState: ConnectionState;
    currentState: ConnectionState;
    reason?: string;
  };
}

export interface TimeoutEvent extends RealtimeEvent {
  type: 'timeout';
  data: {
    timeoutType: 'connect' | 'response' | 'finalization';
    durationMs: number;
  };
}

export interface AudioLevelEvent {
  type: 'audio_level';
  providerId: 'openai' | 'elevenlabs';
  timestamp: number;
  data: {
    level: number; // 0-1 normalized audio level
    isSpeaking: boolean;
  };
}

export type ProviderEvent = ProviderEventMap[keyof ProviderEventMap];

// ============================================================================
// PROVIDER ADAPTER
// ============================================================================

export interface ProviderAdapterConfig {
  /** WebSocket URL for the provider */
  websocketUrl: string;
  /** Authentication token */
  token: string;
  /** Token expiration time */
  tokenExpiresAt: number;
  /** Connection timeout in milliseconds */
  connectTimeoutMs: number;
  /** Finalization timeout in milliseconds */
  finalizationTimeoutMs: number;
  /** Enable debug logging */
  debugLogging: boolean;
  /** Maximum reconnect attempts */
  maxReconnectAttempts: number;
  /** Base delay for reconnection (exponential backoff) */
  reconnectBaseDelayMs: number;
}

export interface ProviderAdapter extends RealtimeConnection {
  /** Configure the adapter */
  configure(config: Partial<ProviderAdapterConfig>): void;

  /** Subscribe to provider events */
  on<T extends ProviderEventType>(
    eventType: T,
    handler: (event: ProviderEventMap[T]) => void
  ): () => void;

  /** Unsubscribe from provider events */
  off<T extends ProviderEventType>(
    eventType: T,
    handler: (event: ProviderEventMap[T]) => void
  ): void;

  /** Emit an event (internal use) */
  emit<T extends ProviderEventType>(
    eventType: T,
    event: ProviderEventMap[T]
  ): void;

  /** Get current transcript state */
  getTranscriptState(): TranscriptState;

  /** Get word timings */
  getWordTimings(): WordTiming[];

  /** Get detected fillers */
  getFillers(): FillerCount[];

  /** Get current provider status */
  getStatus(): ProviderStatus;

  /** Reset adapter state */
  reset(): void;

  /** Dispose of the adapter and clean up resources */
  dispose(): void;
}

// ============================================================================
// PROVIDER RESULT BUILDER
// ============================================================================

export interface ProviderResultBuilder {
  /** Set transcript state */
  setTranscript(transcript: TranscriptState): void;

  /** Add word timing */
  addWordTiming(word: WordTiming): void;

  /** Add filler detection */
  addFiller(word: string): void;

  /** Set duration */
  setDuration(durationMs: number): void;

  /** Set status */
  setStatus(status: ProviderStatus): void;

  /** Add error */
  addError(error: string): void;

  /** Build the final result */
  build(): void;
}

// ============================================================================
// RECONNECTION STRATEGY
// ============================================================================

export interface ReconnectionStrategy {
  /** Maximum number of reconnection attempts */
  maxAttempts: number;
  /** Base delay in milliseconds */
  baseDelayMs: number;
  /** Maximum delay in milliseconds */
  maxDelayMs: number;
  /** Jitter factor (0-1) for randomizing delays */
  jitterFactor: number;
}

export const DEFAULT_RECONNECTION_STRATEGY: ReconnectionStrategy = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  jitterFactor: 0.2,
};

/**
 * Calculates the next reconnection delay using exponential backoff with jitter
 */
export function calculateReconnectDelay(
  attempt: number,
  strategy: ReconnectionStrategy = DEFAULT_RECONNECTION_STRATEGY
): number {
  const exponentialDelay = strategy.baseDelayMs * Math.pow(2, attempt);
  const cappedDelay = Math.min(exponentialDelay, strategy.maxDelayMs);
  const jitter = cappedDelay * strategy.jitterFactor * (Math.random() * 2 - 1);
  return Math.max(0, cappedDelay + jitter);
}
