/**
 * OpenAI Realtime Provider Adapter
 *
 * Implements the OpenAI Realtime API for real-time audio transcription
 * via WebSocket connection. Handles audio streaming, transcript events,
 * and session management.
 *
 * Protocol: wss://api.openai.com/v1/realtime
 * Audio Format: PCM16 @ 16kHz mono (base64 encoded)
 */

import { BaseProviderAdapter } from './base';
import type { WordTiming } from '@rsta/shared';

// ============================================================================
// OPENAI REALTIME API TYPES
// ============================================================================

/**
 * OpenAI Realtime event types sent from server
 */
type OpenAIServerEventType =
  | 'session.created'
  | 'session.updated'
  | 'error'
  | 'input_audio_buffer.speech_started'
  | 'input_audio_buffer.speech_stopped'
  | 'input_audio_buffer.committed'
  | 'input_audio_buffer.cleared'
  | 'conversation.item.created'
  | 'conversation.item.input_audio_transcription.completed'
  | 'conversation.item.input_audio_transcription.failed'
  | 'response.created'
  | 'response.done'
  | 'response.output_item.added'
  | 'response.output_item.done'
  | 'response.content_part.added'
  | 'response.content_part.done'
  | 'response.audio_transcript.delta'
  | 'response.audio_transcript.done'
  | 'response.audio.delta'
  | 'response.audio.done'
  | 'response.text.delta'
  | 'response.text.done';

/**
 * Base structure for all OpenAI Realtime events
 */
interface OpenAIRealtimeEvent {
  type: OpenAIServerEventType;
  event_id?: string;
}

/**
 * Session created/updated event
 */
interface SessionEvent extends OpenAIRealtimeEvent {
  type: 'session.created' | 'session.updated';
  session: {
    id: string;
    model: string;
    modalities: string[];
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
  };
}

/**
 * Error event from OpenAI
 */
interface ErrorEvent extends OpenAIRealtimeEvent {
  type: 'error';
  error: {
    type: string;
    code?: string;
    message: string;
    param?: string | null;
    event_id?: string;
  };
}

/**
 * Speech detection events
 */
interface SpeechStartedEvent extends OpenAIRealtimeEvent {
  type: 'input_audio_buffer.speech_started';
  audio_start_ms: number;
  item_id: string;
}

interface SpeechStoppedEvent extends OpenAIRealtimeEvent {
  type: 'input_audio_buffer.speech_stopped';
  audio_end_ms: number;
  item_id: string;
}

/**
 * Transcript delta event (interim results)
 */
interface TranscriptDeltaEvent extends OpenAIRealtimeEvent {
  type: 'response.audio_transcript.delta';
  response_id: string;
  item_id: string;
  output_index: number;
  content_index: number;
  delta: string;
}

/**
 * Transcript done event (final result for response)
 */
interface TranscriptDoneEvent extends OpenAIRealtimeEvent {
  type: 'response.audio_transcript.done';
  response_id: string;
  item_id: string;
  output_index: number;
  content_index: number;
  transcript: string;
}

/**
 * Input audio transcription completed (full transcription result)
 */
interface InputAudioTranscriptionCompletedEvent extends OpenAIRealtimeEvent {
  type: 'conversation.item.input_audio_transcription.completed';
  item_id: string;
  content_index: number;
  transcript: string;
}

/**
 * Input audio transcription failed
 */
interface InputAudioTranscriptionFailedEvent extends OpenAIRealtimeEvent {
  type: 'conversation.item.input_audio_transcription.failed';
  item_id: string;
  content_index: number;
  error: {
    type: string;
    code?: string;
    message: string;
  };
}

/**
 * Response done event
 */
interface ResponseDoneEvent extends OpenAIRealtimeEvent {
  type: 'response.done';
  response: {
    id: string;
    status: 'completed' | 'cancelled' | 'failed' | 'incomplete';
    status_details?: {
      type: string;
      reason?: string;
      error?: {
        type: string;
        code?: string;
        message: string;
      };
    } | null;
    output: Array<{
      id: string;
      type: string;
      status: string;
      content?: Array<{
        type: string;
        transcript?: string;
        text?: string;
      }>;
    }>;
    usage?: {
      total_tokens: number;
      input_tokens: number;
      output_tokens: number;
      input_token_details?: {
        cached_tokens: number;
        text_tokens: number;
        audio_tokens: number;
      };
      output_token_details?: {
        text_tokens: number;
        audio_tokens: number;
      };
    };
  };
}

/**
 * Audio buffer committed event
 */
interface AudioBufferCommittedEvent extends OpenAIRealtimeEvent {
  type: 'input_audio_buffer.committed';
  previous_item_id: string | null;
  item_id: string;
}

// Union type for all handled events
type HandledOpenAIEvent =
  | SessionEvent
  | ErrorEvent
  | SpeechStartedEvent
  | SpeechStoppedEvent
  | TranscriptDeltaEvent
  | TranscriptDoneEvent
  | InputAudioTranscriptionCompletedEvent
  | InputAudioTranscriptionFailedEvent
  | ResponseDoneEvent
  | AudioBufferCommittedEvent;

// ============================================================================
// OPENAI REALTIME PROVIDER ADAPTER
// ============================================================================

/**
 * Configuration options specific to OpenAI Realtime
 */
export interface OpenAIRealtimeConfig {
  /** Model to use for transcription (default: whisper-1) */
  transcriptionModel?: string;
  /** Enable server-side voice activity detection */
  enableVAD?: boolean;
  /** VAD threshold (0-1, default: 0.5) */
  vadThreshold?: number;
  /** Silence duration before end of speech (ms, default: 500) */
  silenceDurationMs?: number;
  /** Language hint for transcription (e.g., 'en', 'es') */
  language?: string;
}

/**
 * OpenAI Realtime Provider Adapter
 *
 * Implements real-time speech-to-text using OpenAI's Realtime API.
 * Handles WebSocket connection, audio streaming, and transcript events.
 */
export class OpenAIRealtimeAdapter extends BaseProviderAdapter {
  readonly providerId = 'openai' as const;

  // OpenAI-specific configuration
  private openaiConfig: OpenAIRealtimeConfig = {
    transcriptionModel: 'whisper-1',
    enableVAD: false, // We use client-side VAD
    vadThreshold: 0.5,
    silenceDurationMs: 500,
  };

  // State tracking
  private sessionId: string | null = null;
  private accumulatedTranscript: string = '';
  private speechStartTime: number | null = null;
  private isResponseRequested: boolean = false;

  /**
   * Configure OpenAI-specific settings
   */
  configureOpenAI(config: Partial<OpenAIRealtimeConfig>): void {
    this.openaiConfig = { ...this.openaiConfig, ...config };
    this.log('OpenAI config updated', config);
  }

  /**
   * Get WebSocket subprotocols for OpenAI Realtime API authentication.
   * OpenAI requires the ephemeral token to be passed via subprotocols.
   */
  protected override getWebSocketProtocols(): string[] {
    const token = this.config.token;
    if (!token) {
      this.log('Warning: No token configured for authentication');
      return [];
    }

    // OpenAI Realtime API authentication via subprotocols
    return [
      'realtime',
      `openai-insecure-api-key.${token}`,
      'openai-beta.realtime-v1',
    ];
  }

  // ============================================================================
  // ABSTRACT METHOD IMPLEMENTATIONS
  // ============================================================================

  /**
   * Handle incoming WebSocket messages from OpenAI Realtime API
   */
  protected handleMessage(data: string | ArrayBuffer): void {
    // OpenAI Realtime only sends JSON string messages
    if (typeof data !== 'string') {
      this.log('Received unexpected binary data, ignoring');
      return;
    }

    try {
      const event = JSON.parse(data) as HandledOpenAIEvent;
      this.log('Received event', event.type, event);

      switch (event.type) {
        case 'session.created':
        case 'session.updated':
          this.handleSessionEvent(event);
          break;

        case 'error':
          this.handleErrorEvent(event);
          break;

        case 'input_audio_buffer.speech_started':
          this.handleSpeechStarted(event);
          break;

        case 'input_audio_buffer.speech_stopped':
          this.handleSpeechStopped(event);
          break;

        case 'input_audio_buffer.committed':
          this.handleAudioCommitted(event);
          break;

        case 'response.audio_transcript.delta':
          this.handleTranscriptDelta(event);
          break;

        case 'response.audio_transcript.done':
          this.handleTranscriptDone(event);
          break;

        case 'conversation.item.input_audio_transcription.completed':
          this.handleInputTranscriptionCompleted(event);
          break;

        case 'conversation.item.input_audio_transcription.failed':
          this.handleInputTranscriptionFailed(event);
          break;

        case 'response.done':
          this.handleResponseDone(event);
          break;

        default:
          // Log unhandled event types for debugging
          this.log('Unhandled event type', (event as OpenAIRealtimeEvent).type);
      }
    } catch (error) {
      this.log('Failed to parse message', error);
      this.addError(`Message parse error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create the session configuration message
   * Sent after WebSocket connection is established
   */
  protected createConfigurationMessage(): string {
    const sessionUpdate = {
      type: 'session.update',
      session: {
        modalities: ['text'], // We only need text transcription
        input_audio_format: 'pcm16',
        input_audio_transcription: {
          model: this.openaiConfig.transcriptionModel || 'whisper-1',
        },
        turn_detection: this.openaiConfig.enableVAD
          ? {
              type: 'server_vad',
              threshold: this.openaiConfig.vadThreshold ?? 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: this.openaiConfig.silenceDurationMs ?? 500,
            }
          : null, // Disable server VAD, use client-side
      },
    };

    this.log('Creating configuration message', sessionUpdate);
    return JSON.stringify(sessionUpdate);
  }

  /**
   * Format audio chunk for sending to OpenAI Realtime API
   * Audio must be base64 encoded and sent as input_audio_buffer.append event
   */
  protected formatAudioForSending(chunk: ArrayBuffer): string {
    // Convert ArrayBuffer to base64
    const bytes = new Uint8Array(chunk);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64Audio = btoa(binary);

    const appendEvent = {
      type: 'input_audio_buffer.append',
      audio: base64Audio,
    };

    return JSON.stringify(appendEvent);
  }

  /**
   * Create the end-of-audio signal message
   * Commits the audio buffer and requests a response
   */
  protected createEndAudioMessage(): string {
    // First commit the audio buffer
    const commitEvent = {
      type: 'input_audio_buffer.commit',
    };

    // Send commit event
    if (this.websocket?.readyState === WebSocket.OPEN) {
      this.websocket.send(JSON.stringify(commitEvent));
    }

    // Then request a response
    const responseEvent = {
      type: 'response.create',
      response: {
        modalities: ['text'],
      },
    };

    this.isResponseRequested = true;
    return JSON.stringify(responseEvent);
  }

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  /**
   * Handle session created/updated events
   */
  private handleSessionEvent(event: SessionEvent): void {
    this.sessionId = event.session.id;
    this.log('Session established', {
      id: this.sessionId,
      model: event.session.model,
      inputFormat: event.session.input_audio_format,
      transcription: event.session.input_audio_transcription,
    });

    // Emit connection ready event
    this._status = 'listening';
    this.emit('connection_state_change', {
      type: 'connection_state_change',
      providerId: this.providerId,
      timestamp: Date.now(),
      data: {
        previousState: 'connecting',
        currentState: 'connected',
        reason: `Session ${event.type === 'session.created' ? 'created' : 'updated'}`,
      },
    });
  }

  /**
   * Handle error events from OpenAI
   */
  private handleErrorEvent(event: ErrorEvent): void {
    const errorMessage = `${event.error.type}: ${event.error.message}`;
    this.log('Error from OpenAI', event.error);
    this.addError(errorMessage);

    this.emit('error', {
      type: 'error',
      providerId: this.providerId,
      timestamp: Date.now(),
      data: {
        code: event.error.code || 'UNKNOWN',
        message: errorMessage,
        recoverable: !['authentication_error', 'invalid_request_error'].includes(event.error.type),
      },
    });

    // Update status if error is fatal
    if (['authentication_error', 'invalid_request_error'].includes(event.error.type)) {
      this._status = 'error';
    }
  }

  /**
   * Handle speech started detection
   */
  private handleSpeechStarted(event: SpeechStartedEvent): void {
    this.speechStartTime = event.audio_start_ms;
    this._status = 'listening';

    this.log('Speech started', { startMs: event.audio_start_ms, itemId: event.item_id });

    this.emit('audio_level', {
      type: 'audio_level',
      providerId: this.providerId,
      timestamp: Date.now(),
      data: {
        level: 1, // Speech detected
        isSpeaking: true,
      },
    });
  }

  /**
   * Handle speech stopped detection
   */
  private handleSpeechStopped(event: SpeechStoppedEvent): void {
    this.log('Speech stopped', { endMs: event.audio_end_ms, itemId: event.item_id });

    this.emit('audio_level', {
      type: 'audio_level',
      providerId: this.providerId,
      timestamp: Date.now(),
      data: {
        level: 0,
        isSpeaking: false,
      },
    });
  }

  /**
   * Handle audio buffer committed
   */
  private handleAudioCommitted(event: AudioBufferCommittedEvent): void {
    this._status = 'processing';
    this.log('Audio committed', { itemId: event.item_id });
  }

  /**
   * Handle transcript delta (interim results)
   */
  private handleTranscriptDelta(event: TranscriptDeltaEvent): void {
    // Accumulate the delta
    this.accumulatedTranscript += event.delta;

    // Update transcript state
    this.updateTranscript({
      interimText: this.accumulatedTranscript,
    });

    // Emit interim transcript event
    this.emit('transcript_interim', {
      type: 'transcript_interim',
      providerId: this.providerId,
      timestamp: Date.now(),
      data: {
        text: this.accumulatedTranscript,
        isFinal: false,
        state: this.getTranscriptState(),
      },
    });
  }

  /**
   * Handle transcript done (final result for a response segment)
   */
  private handleTranscriptDone(event: TranscriptDoneEvent): void {
    const finalText = event.transcript;
    this.log('Transcript done', { transcript: finalText });

    // Update transcript state
    this.updateTranscript({
      committedText: this.transcript.committedText + finalText + ' ',
      interimText: '',
    });

    // Reset accumulated transcript
    this.accumulatedTranscript = '';

    // Emit committed transcript event
    this.emit('transcript_committed', {
      type: 'transcript_committed',
      providerId: this.providerId,
      timestamp: Date.now(),
      data: {
        text: finalText,
        isFinal: false, // Not fully final until response.done
        state: this.getTranscriptState(),
      },
    });
  }

  /**
   * Handle input audio transcription completed
   * This is the full transcription of the input audio
   */
  private handleInputTranscriptionCompleted(event: InputAudioTranscriptionCompletedEvent): void {
    const transcript = event.transcript;
    this.log('Input transcription completed', { transcript });

    // Parse word timings if available (OpenAI doesn't always provide these)
    this.extractWordTimings(transcript);

    // Update transcript state
    this.updateTranscript({
      finalText: transcript,
      isFinal: true,
    });

    // Emit final transcript event
    this.emit('transcript_final', {
      type: 'transcript_final',
      providerId: this.providerId,
      timestamp: Date.now(),
      data: {
        text: transcript,
        isFinal: true,
        state: this.getTranscriptState(),
      },
    });

    this._status = 'completed';
    this.completedAt = Date.now();
  }

  /**
   * Handle input audio transcription failed
   */
  private handleInputTranscriptionFailed(event: InputAudioTranscriptionFailedEvent): void {
    const errorMessage = `Transcription failed: ${event.error.message}`;
    this.log('Transcription failed', event.error);
    this.addError(errorMessage);

    this.emit('error', {
      type: 'error',
      providerId: this.providerId,
      timestamp: Date.now(),
      data: {
        code: event.error.code || 'TRANSCRIPTION_FAILED',
        message: errorMessage,
        recoverable: true,
      },
    });
  }

  /**
   * Handle response done event
   */
  private handleResponseDone(event: ResponseDoneEvent): void {
    this.log('Response done', {
      id: event.response.id,
      status: event.response.status,
      usage: event.response.usage,
    });

    // Check for errors in the response
    if (event.response.status === 'failed' && event.response.status_details?.error) {
      const error = event.response.status_details.error;
      this.addError(`Response failed: ${error.message}`);
      this.emit('error', {
        type: 'error',
        providerId: this.providerId,
        timestamp: Date.now(),
        data: {
          code: error.code || 'RESPONSE_FAILED',
          message: error.message,
          recoverable: true,
        },
      });
    }

    // Extract transcript from response output if available
    if (event.response.output) {
      for (const item of event.response.output) {
        if (item.content) {
          for (const content of item.content) {
            if (content.transcript) {
              // This is the final transcript from the response
              this.updateTranscript({
                finalText: content.transcript,
                isFinal: true,
              });
            }
          }
        }
      }
    }

    // Reset response flag
    this.isResponseRequested = false;

    // Update status if we have a transcript
    if (this.transcript.finalText || this.transcript.committedText) {
      this._status = 'completed';
      this.completedAt = Date.now();
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Extract word timings from transcript text
   * Note: OpenAI Realtime doesn't provide word-level timing in all cases,
   * so we estimate based on average word length
   */
  private extractWordTimings(transcript: string): void {
    const words = transcript.split(/\s+/).filter(w => w.length > 0);

    if (words.length === 0) return;

    const startTime = this.speechStartTime || 0;
    const now = Date.now();
    const duration = this.startedAt ? now - this.startedAt : 0;

    // Estimate timing based on word count and duration
    const avgWordDuration = duration / words.length;

    words.forEach((word, index) => {
      const startMs = startTime + (index * avgWordDuration);
      const endMs = startTime + ((index + 1) * avgWordDuration);
      const confidence = 0.9; // OpenAI doesn't provide per-word confidence

      const wordTiming: WordTiming = {
        word,
        startMs,
        endMs,
        confidence,
      };

      this.addWordTiming(wordTiming);

      // Emit word timing event
      this.emit('word_timing', {
        type: 'word_timing',
        providerId: this.providerId,
        timestamp: Date.now(),
        data: {
          word,
          startMs,
          endMs,
          confidence,
        },
      });
    });
  }

  /**
   * Request transcription for committed audio
   * Can be called manually if auto-response is not enabled
   */
  requestTranscription(): void {
    if (!this.isConnected()) {
      this.log('Cannot request transcription - not connected');
      return;
    }

    if (this.isResponseRequested) {
      this.log('Transcription already requested');
      return;
    }

    const responseEvent = {
      type: 'response.create',
      response: {
        modalities: ['text'],
      },
    };

    this.websocket?.send(JSON.stringify(responseEvent));
    this.isResponseRequested = true;
    this._status = 'processing';
  }

  /**
   * Clear the audio buffer without committing
   */
  clearAudioBuffer(): void {
    if (!this.isConnected()) {
      this.log('Cannot clear audio buffer - not connected');
      return;
    }

    const clearEvent = {
      type: 'input_audio_buffer.clear',
    };

    this.websocket?.send(JSON.stringify(clearEvent));
    this.log('Audio buffer cleared');
  }

  /**
   * Reset adapter state (override to reset OpenAI-specific state)
   */
  override reset(): void {
    super.reset();
    this.sessionId = null;
    this.accumulatedTranscript = '';
    this.speechStartTime = null;
    this.isResponseRequested = false;
  }
}
