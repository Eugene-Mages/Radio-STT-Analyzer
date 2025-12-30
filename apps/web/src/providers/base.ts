/**
 * Base Provider Adapter
 * Abstract base class for STT provider adapters with common functionality
 */

import {
  type ProviderStatus,
  type TranscriptState,
  type WordTiming,
  type FillerCount,
  FILLER_WORDS,
} from '@rsta/shared';

import type {
  ConnectionState,
  ConnectionInfo,
  ProviderAdapter,
  ProviderAdapterConfig,
  ProviderEventType,
  ProviderEventMap,
  ProviderEvent,
  ReconnectionStrategy,
} from './types';

import {
  DEFAULT_RECONNECTION_STRATEGY,
  calculateReconnectDelay,
} from './types';

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

const DEFAULT_CONFIG: ProviderAdapterConfig = {
  websocketUrl: '',
  token: '',
  tokenExpiresAt: 0,
  connectTimeoutMs: 10000,
  finalizationTimeoutMs: 5000,
  debugLogging: false,
  maxReconnectAttempts: 3,
  reconnectBaseDelayMs: 1000,
};

// ============================================================================
// BASE PROVIDER ADAPTER
// ============================================================================

export abstract class BaseProviderAdapter implements ProviderAdapter {
  // Provider identity
  abstract readonly providerId: 'openai' | 'elevenlabs';

  // Configuration
  protected config: ProviderAdapterConfig = { ...DEFAULT_CONFIG };
  protected reconnectionStrategy: ReconnectionStrategy = { ...DEFAULT_RECONNECTION_STRATEGY };

  // Connection state
  protected _state: ConnectionState = 'disconnected';
  protected websocket: WebSocket | null = null;
  protected connectTimeout: ReturnType<typeof setTimeout> | null = null;
  protected reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  protected reconnectAttempts: number = 0;
  protected connectedAt: number | null = null;
  protected lastError: string | null = null;

  // Provider state
  protected _status: ProviderStatus = 'idle';
  protected transcript: TranscriptState = {
    interimText: '',
    committedText: '',
    finalText: '',
    isFinal: false,
  };
  protected wordTimings: WordTiming[] = [];
  protected fillerCounts: Map<string, number> = new Map();
  protected errors: string[] = [];
  protected startedAt: number | null = null;
  protected completedAt: number | null = null;

  // Event handling
  protected eventListeners: Map<ProviderEventType, Set<(event: ProviderEvent) => void>> = new Map();

  // ============================================================================
  // ABSTRACT METHODS (must be implemented by subclasses)
  // ============================================================================

  /** Handle incoming WebSocket message */
  protected abstract handleMessage(data: string | ArrayBuffer): void;

  /** Create the initial configuration message to send after connection */
  protected abstract createConfigurationMessage(): string | null;

  /** Format audio data for sending to the provider */
  protected abstract formatAudioForSending(chunk: ArrayBuffer): string | ArrayBuffer;

  /** Create the end-of-audio signal message */
  protected abstract createEndAudioMessage(): string | null;

  /** Get WebSocket subprotocols for authentication (override in subclass) */
  protected getWebSocketProtocols(): string[] | undefined {
    return undefined;
  }

  // ============================================================================
  // PUBLIC INTERFACE
  // ============================================================================

  get state(): ConnectionState {
    return this._state;
  }

  configure(config: Partial<ProviderAdapterConfig>): void {
    this.config = { ...this.config, ...config };
    this.log('Configuration updated', config);
  }

  async connect(): Promise<void> {
    if (this._state === 'connected' || this._state === 'connecting') {
      this.log('Already connected or connecting');
      return;
    }

    this.log('Connecting to WebSocket', this.config.websocketUrl);
    this.setConnectionState('connecting');

    return new Promise((resolve, reject) => {
      try {
        // Get subprotocols for authentication (override in subclass if needed)
        const protocols = this.getWebSocketProtocols();

        if (protocols && protocols.length > 0) {
          this.websocket = new WebSocket(this.config.websocketUrl, protocols);
        } else {
          this.websocket = new WebSocket(this.config.websocketUrl);
        }
        this.websocket.binaryType = 'arraybuffer';

        // Set connection timeout
        this.connectTimeout = setTimeout(() => {
          this.handleConnectionTimeout();
          reject(new Error('Connection timeout'));
        }, this.config.connectTimeoutMs);

        this.websocket.onopen = () => {
          this.handleOpen();
          resolve();
        };

        this.websocket.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.websocket.onerror = (event) => {
          this.handleError(event);
        };

        this.websocket.onclose = (event) => {
          this.handleClose(event);
        };
      } catch (error) {
        this.setConnectionState('error');
        this.lastError = error instanceof Error ? error.message : 'Connection failed';
        reject(error);
      }
    });
  }

  disconnect(): void {
    this.log('Disconnecting');
    this.clearTimeouts();

    if (this.websocket) {
      this.websocket.onclose = null; // Prevent reconnection logic
      this.websocket.close(1000, 'Client disconnect');
      this.websocket = null;
    }

    this.setConnectionState('closed');
  }

  sendAudio(chunk: ArrayBuffer): void {
    if (!this.isConnected()) {
      this.log('Cannot send audio - not connected');
      return;
    }

    const formatted = this.formatAudioForSending(chunk);
    this.websocket?.send(formatted);
  }

  endAudio(): void {
    if (!this.isConnected()) {
      this.log('Cannot end audio - not connected');
      return;
    }

    const message = this.createEndAudioMessage();
    if (message) {
      this.websocket?.send(message);
    }

    this._status = 'processing';
  }

  isConnected(): boolean {
    return this._state === 'connected' && this.websocket?.readyState === WebSocket.OPEN;
  }

  getConnectionInfo(): ConnectionInfo {
    return {
      state: this._state,
      providerId: this.providerId,
      connectedAt: this.connectedAt,
      lastError: this.lastError,
      reconnectAttempts: this.reconnectAttempts,
      latencyMs: null, // Can be measured by subclasses
    };
  }

  // ============================================================================
  // EVENT HANDLING
  // ============================================================================

  on<T extends ProviderEventType>(
    eventType: T,
    handler: (event: ProviderEventMap[T]) => void
  ): () => void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, new Set());
    }

    const listeners = this.eventListeners.get(eventType)!;
    listeners.add(handler as (event: ProviderEvent) => void);

    // Return unsubscribe function
    return () => {
      listeners.delete(handler as (event: ProviderEvent) => void);
    };
  }

  off<T extends ProviderEventType>(
    eventType: T,
    handler: (event: ProviderEventMap[T]) => void
  ): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      listeners.delete(handler as (event: ProviderEvent) => void);
    }
  }

  emit<T extends ProviderEventType>(
    eventType: T,
    event: ProviderEventMap[T]
  ): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      listeners.forEach((handler) => {
        try {
          handler(event as ProviderEvent);
        } catch (error) {
          console.error(`Error in ${eventType} event handler:`, error);
        }
      });
    }
  }

  // ============================================================================
  // STATE GETTERS
  // ============================================================================

  getTranscriptState(): TranscriptState {
    return { ...this.transcript };
  }

  getWordTimings(): WordTiming[] {
    return [...this.wordTimings];
  }

  getFillers(): FillerCount[] {
    return Array.from(this.fillerCounts.entries()).map(([word, count]) => ({
      word,
      count,
    }));
  }

  getStatus(): ProviderStatus {
    return this._status;
  }

  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  reset(): void {
    this.log('Resetting adapter state');

    this._status = 'idle';
    this.transcript = {
      interimText: '',
      committedText: '',
      finalText: '',
      isFinal: false,
    };
    this.wordTimings = [];
    this.fillerCounts.clear();
    this.errors = [];
    this.startedAt = null;
    this.completedAt = null;
    this.lastError = null;
    this.reconnectAttempts = 0;
  }

  dispose(): void {
    this.log('Disposing adapter');
    this.disconnect();
    this.reset();
    this.eventListeners.clear();
  }

  // ============================================================================
  // PROTECTED HELPERS
  // ============================================================================

  protected setConnectionState(state: ConnectionState, reason?: string): void {
    const previousState = this._state;
    this._state = state;

    if (state === 'connected') {
      this.connectedAt = Date.now();
      this._status = 'listening';
    } else if (state === 'disconnected' || state === 'closed' || state === 'error') {
      this.connectedAt = null;
    }

    this.emit('connection_state_change', {
      type: 'connection_state_change',
      providerId: this.providerId,
      timestamp: Date.now(),
      data: {
        previousState,
        currentState: state,
        reason,
      },
    });
  }

  protected handleOpen(): void {
    this.log('WebSocket connected');
    this.clearTimeouts();
    this.reconnectAttempts = 0;
    this.setConnectionState('connected');
    this.startedAt = Date.now();

    // Send configuration message if needed
    const configMessage = this.createConfigurationMessage();
    if (configMessage) {
      this.websocket?.send(configMessage);
    }
  }

  protected handleError(event: Event): void {
    this.log('WebSocket error', event);
    this.lastError = 'WebSocket error occurred';
  }

  protected handleClose(event: CloseEvent): void {
    this.log('WebSocket closed', { code: event.code, reason: event.reason });
    this.clearTimeouts();

    // Check if we should reconnect
    if (
      this._state !== 'closed' &&
      event.code !== 1000 &&
      this.reconnectAttempts < this.config.maxReconnectAttempts
    ) {
      this.scheduleReconnect();
    } else {
      this.setConnectionState('disconnected', event.reason || 'Connection closed');
    }
  }

  protected handleConnectionTimeout(): void {
    this.log('Connection timeout');
    this.clearTimeouts();

    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }

    this.emit('timeout', {
      type: 'timeout',
      providerId: this.providerId,
      timestamp: Date.now(),
      data: {
        timeoutType: 'connect',
        durationMs: this.config.connectTimeoutMs,
      },
    });

    if (this.reconnectAttempts < this.config.maxReconnectAttempts) {
      this.scheduleReconnect();
    } else {
      this.setConnectionState('error', 'Connection timeout after max retries');
    }
  }

  protected scheduleReconnect(): void {
    this.setConnectionState('reconnecting');
    this.reconnectAttempts++;

    const delay = calculateReconnectDelay(this.reconnectAttempts - 1, this.reconnectionStrategy);
    this.log(`Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);

    this.reconnectTimeout = setTimeout(() => {
      this.connect().catch((error) => {
        this.log('Reconnect failed', error);
      });
    }, delay);
  }

  protected clearTimeouts(): void {
    if (this.connectTimeout) {
      clearTimeout(this.connectTimeout);
      this.connectTimeout = null;
    }
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  protected updateTranscript(updates: Partial<TranscriptState>): void {
    this.transcript = { ...this.transcript, ...updates };
  }

  protected addWordTiming(wordTiming: WordTiming): void {
    this.wordTimings.push(wordTiming);

    // Check for filler words
    const normalizedWord = wordTiming.word.toLowerCase().trim();
    if (this.isFillerWord(normalizedWord)) {
      const currentCount = this.fillerCounts.get(normalizedWord) || 0;
      this.fillerCounts.set(normalizedWord, currentCount + 1);
    }
  }

  protected isFillerWord(word: string): boolean {
    const normalizedWord = word.toLowerCase();
    return FILLER_WORDS.some((filler) =>
      normalizedWord === filler || normalizedWord.includes(filler)
    );
  }

  protected addError(error: string): void {
    this.errors.push(error);
    this.lastError = error;
  }

  protected log(message: string, ...args: unknown[]): void {
    if (this.config.debugLogging) {
      console.log(`[${this.providerId}] ${message}`, ...args);
    }
  }
}
