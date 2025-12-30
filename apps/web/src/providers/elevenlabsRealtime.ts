/**
 * ElevenLabs Realtime STT Provider Adapter
 *
 * Implements real-time speech-to-text using ElevenLabs WebSocket API.
 * Handles streaming audio, interim transcripts, and word-level timing.
 */

import { BaseProviderAdapter } from './base';
import type { WordTiming } from './types';

// ============================================================================
// ELEVENLABS API TYPES
// ============================================================================

/** ElevenLabs audio format configuration */
interface ElevenLabsAudioFormat {
  sample_rate: number;
  channels: number;
  encoding: 'pcm_s16le' | 'pcm_f32le';
}

/** ElevenLabs start configuration message */
interface ElevenLabsStartMessage {
  type: 'start';
  audio_format: ElevenLabsAudioFormat;
  language_code: string;
}

/** ElevenLabs transcript event from WebSocket */
interface ElevenLabsTranscriptEvent {
  type: 'transcript';
  text: string;
  is_final: boolean;
  words?: ElevenLabsWordInfo[];
}

/** ElevenLabs word information */
interface ElevenLabsWordInfo {
  word: string;
  start: number; // seconds
  end: number; // seconds
  confidence?: number;
}

/** ElevenLabs word event */
interface ElevenLabsWordEvent {
  type: 'word';
  word: string;
  start: number; // seconds
  end: number; // seconds
  confidence?: number;
}

/** ElevenLabs error event */
interface ElevenLabsErrorEvent {
  type: 'error';
  code?: string;
  message: string;
}

/** ElevenLabs end event */
interface ElevenLabsEndEvent {
  type: 'end';
}

/** Union of all ElevenLabs events */
type ElevenLabsEvent =
  | ElevenLabsTranscriptEvent
  | ElevenLabsWordEvent
  | ElevenLabsErrorEvent
  | ElevenLabsEndEvent;

// ============================================================================
// CONFIGURATION
// ============================================================================

/** Default audio format for ElevenLabs STT */
const DEFAULT_AUDIO_FORMAT: ElevenLabsAudioFormat = {
  sample_rate: 16000,
  channels: 1,
  encoding: 'pcm_s16le',
};

/** Default language code */
const DEFAULT_LANGUAGE_CODE = 'en';

// ============================================================================
// ELEVENLABS REALTIME ADAPTER
// ============================================================================

/**
 * ElevenLabs Realtime Speech-to-Text Adapter
 *
 * Connects to ElevenLabs WebSocket API for real-time transcription.
 * Supports PCM16 audio at 16kHz mono.
 */
export class ElevenLabsRealtimeAdapter extends BaseProviderAdapter {
  readonly providerId = 'elevenlabs' as const;

  /** Audio format configuration */
  private audioFormat: ElevenLabsAudioFormat = { ...DEFAULT_AUDIO_FORMAT };

  /** Language code for transcription */
  private languageCode: string = DEFAULT_LANGUAGE_CODE;

  // ============================================================================
  // CONFIGURATION
  // ============================================================================

  /**
   * Configure audio format for ElevenLabs
   */
  setAudioFormat(format: Partial<ElevenLabsAudioFormat>): void {
    this.audioFormat = { ...this.audioFormat, ...format };
    this.log('Audio format configured', this.audioFormat);
  }

  /**
   * Set the language code for transcription
   */
  setLanguageCode(code: string): void {
    this.languageCode = code;
    this.log('Language code set', code);
  }

  // ============================================================================
  // ABSTRACT METHOD IMPLEMENTATIONS
  // ============================================================================

  /**
   * Handle incoming WebSocket messages from ElevenLabs
   */
  protected handleMessage(data: string | ArrayBuffer): void {
    // ElevenLabs sends JSON text messages
    if (typeof data !== 'string') {
      this.log('Received unexpected binary data');
      return;
    }

    try {
      const event = JSON.parse(data) as ElevenLabsEvent;
      this.log('Received event', event.type);

      switch (event.type) {
        case 'transcript':
          this.handleTranscriptEvent(event);
          break;

        case 'word':
          this.handleWordEvent(event);
          break;

        case 'error':
          this.handleErrorEvent(event);
          break;

        case 'end':
          this.handleEndEvent();
          break;

        default:
          this.log('Unknown event type', (event as { type: string }).type);
      }
    } catch (error) {
      this.log('Failed to parse message', error);
      this.addError('Failed to parse ElevenLabs message');
    }
  }

  /**
   * Create the initial configuration message
   */
  protected createConfigurationMessage(): string | null {
    const message: ElevenLabsStartMessage = {
      type: 'start',
      audio_format: this.audioFormat,
      language_code: this.languageCode,
    };

    this.log('Sending start configuration', message);
    return JSON.stringify(message);
  }

  /**
   * Format audio data for sending to ElevenLabs
   *
   * ElevenLabs accepts raw PCM binary data directly
   */
  protected formatAudioForSending(chunk: ArrayBuffer): ArrayBuffer {
    // ElevenLabs accepts raw PCM data directly
    return chunk;
  }

  /**
   * Create the end-of-audio signal message
   */
  protected createEndAudioMessage(): string | null {
    const message = { type: 'end_of_audio' };
    this.log('Sending end of audio signal');
    return JSON.stringify(message);
  }

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  /**
   * Handle transcript events from ElevenLabs
   */
  private handleTranscriptEvent(event: ElevenLabsTranscriptEvent): void {
    const { text, is_final, words } = event;

    // Process word timings if available
    if (words && words.length > 0) {
      this.processWordTimings(words);
    }

    if (is_final) {
      // Final transcript - commit and emit
      this.updateTranscript({
        committedText: this.transcript.committedText + text + ' ',
        interimText: '',
        finalText: text,
        isFinal: true,
      });

      this.emit('transcript_committed', {
        type: 'transcript_committed',
        providerId: this.providerId,
        timestamp: Date.now(),
        data: {
          text: text,
          isFinal: true,
          state: this.getTranscriptState(),
        },
      });

      this.emit('transcript_final', {
        type: 'transcript_final',
        providerId: this.providerId,
        timestamp: Date.now(),
        data: {
          text: this.transcript.committedText.trim(),
          isFinal: true,
          state: this.getTranscriptState(),
        },
      });

      // Update status to completed
      this._status = 'completed';
      this.completedAt = Date.now();
    } else {
      // Interim transcript - update but don't commit
      this.updateTranscript({
        interimText: text,
        isFinal: false,
      });

      this.emit('transcript_interim', {
        type: 'transcript_interim',
        providerId: this.providerId,
        timestamp: Date.now(),
        data: {
          text: text,
          isFinal: false,
          state: this.getTranscriptState(),
        },
      });
    }
  }

  /**
   * Handle individual word events from ElevenLabs
   */
  private handleWordEvent(event: ElevenLabsWordEvent): void {
    const wordTiming: WordTiming = {
      word: event.word,
      startMs: Math.round(event.start * 1000),
      endMs: Math.round(event.end * 1000),
      confidence: event.confidence,
    };

    this.addWordTiming(wordTiming);

    this.emit('word_timing', {
      type: 'word_timing',
      providerId: this.providerId,
      timestamp: Date.now(),
      data: {
        word: wordTiming.word,
        startMs: wordTiming.startMs,
        endMs: wordTiming.endMs,
        confidence: wordTiming.confidence,
      },
    });
  }

  /**
   * Handle error events from ElevenLabs
   */
  private handleErrorEvent(event: ElevenLabsErrorEvent): void {
    const errorMessage = event.message || 'Unknown ElevenLabs error';
    const errorCode = event.code || 'ELEVENLABS_ERROR';

    this.addError(errorMessage);
    this._status = 'error';

    this.emit('error', {
      type: 'error',
      providerId: this.providerId,
      timestamp: Date.now(),
      data: {
        code: errorCode,
        message: errorMessage,
        recoverable: this.isRecoverableError(errorCode),
        details: event,
      },
    });
  }

  /**
   * Handle end event from ElevenLabs
   */
  private handleEndEvent(): void {
    this.log('Received end event from ElevenLabs');

    // Finalize the transcript if not already done
    if (!this.transcript.isFinal) {
      const finalText = (this.transcript.committedText + this.transcript.interimText).trim();

      this.updateTranscript({
        finalText: finalText,
        interimText: '',
        isFinal: true,
      });

      this.emit('transcript_final', {
        type: 'transcript_final',
        providerId: this.providerId,
        timestamp: Date.now(),
        data: {
          text: finalText,
          isFinal: true,
          state: this.getTranscriptState(),
        },
      });
    }

    this._status = 'completed';
    this.completedAt = Date.now();
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  /**
   * Process word timing information from transcript event
   */
  private processWordTimings(words: ElevenLabsWordInfo[]): void {
    for (const wordInfo of words) {
      const wordTiming: WordTiming = {
        word: wordInfo.word,
        startMs: Math.round(wordInfo.start * 1000),
        endMs: Math.round(wordInfo.end * 1000),
        confidence: wordInfo.confidence,
      };

      // Only add if not already tracked (avoid duplicates)
      const exists = this.wordTimings.some(
        (w) =>
          w.word === wordTiming.word &&
          w.startMs === wordTiming.startMs &&
          w.endMs === wordTiming.endMs
      );

      if (!exists) {
        this.addWordTiming(wordTiming);

        this.emit('word_timing', {
          type: 'word_timing',
          providerId: this.providerId,
          timestamp: Date.now(),
          data: {
            word: wordTiming.word,
            startMs: wordTiming.startMs,
            endMs: wordTiming.endMs,
            confidence: wordTiming.confidence,
          },
        });
      }
    }
  }

  /**
   * Determine if an error is recoverable
   */
  private isRecoverableError(code: string): boolean {
    const recoverableCodes = [
      'RATE_LIMIT',
      'TEMPORARY_ERROR',
      'TIMEOUT',
      'CONNECTION_LOST',
    ];
    return recoverableCodes.some((c) => code.toUpperCase().includes(c));
  }

  // ============================================================================
  // OVERRIDE: Reset
  // ============================================================================

  /**
   * Reset adapter state including ElevenLabs-specific state
   */
  reset(): void {
    super.reset();
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Create a new ElevenLabs realtime adapter instance
 */
export function createElevenLabsAdapter(): ElevenLabsRealtimeAdapter {
  return new ElevenLabsRealtimeAdapter();
}
