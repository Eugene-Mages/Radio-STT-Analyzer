/**
 * Dual STT Recording Hook
 *
 * Manages simultaneous recording to OpenAI and ElevenLabs STT providers.
 * Coordinates audio capture, WebSocket connections, and transcript updates.
 */

import { useCallback, useRef, useEffect } from 'react';
import { useSessionStore, type ProviderId } from '../state/sessionStore';
import { OpenAIRealtimeAdapter } from '../providers/openaiRealtime';
import { createElevenLabsAdapter } from '../providers/elevenlabsRealtime';
import { requestMicPermission, stopMicStream } from '../audio/mic';
import { createAudioChunker, type AudioChunker } from '../audio/chunker';
import type { BaseProviderAdapter } from '../providers/base';
import appConfig from '../data/app_config.json';

// ============================================================================
// Types
// ============================================================================

interface TokenResponse {
  token: string;
  websocketUrl: string;
  expiresAt: number;
}

interface DualSTTHookReturn {
  /** Start recording and streaming to both providers */
  startRecording: () => Promise<void>;
  /** Stop recording and finalize both providers */
  stopRecording: () => void;
  /** Whether recording is currently active */
  isRecording: boolean;
  /** Any errors that occurred */
  error: string | null;
}

// ============================================================================
// Token Fetchers
// ============================================================================

async function fetchOpenAIToken(): Promise<TokenResponse> {
  const response = await fetch('/api/token/openai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o-realtime-preview-2024-10-01',
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Token request failed' }));
    throw new Error(error.message || 'Failed to get OpenAI token');
  }

  return response.json();
}

async function fetchElevenLabsToken(): Promise<TokenResponse> {
  const response = await fetch('/api/token/elevenlabs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      duration: 60, // 60 second token
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Token request failed' }));
    throw new Error(error.message || 'Failed to get ElevenLabs token');
  }

  return response.json();
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useDualSTT(): DualSTTHookReturn {
  // Store actions
  const {
    recordingState,
    startRecording: storeStartRecording,
    stopRecording: storeStopRecording,
    updateProviderStatus,
    updateProviderTranscript,
    updateProviderWords,
    updateProviderDuration,
    setProviderError,
    computeScores,
    setRecordingCompleted,
  } = useSessionStore();

  // Refs for cleanup
  const openaiAdapterRef = useRef<BaseProviderAdapter | null>(null);
  const elevenlabsAdapterRef = useRef<BaseProviderAdapter | null>(null);
  const audioChunkerRef = useRef<AudioChunker | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const errorRef = useRef<string | null>(null);
  const recordingStartTimeRef = useRef<number>(0);

  // Helper to set up event listeners for a provider
  const setupProviderEvents = useCallback((
    adapter: BaseProviderAdapter,
    providerId: ProviderId
  ) => {
    // Connection state changes
    adapter.on('connection_state_change', (event) => {
      const { currentState } = event.data;

      if (currentState === 'connected') {
        updateProviderStatus(providerId, 'listening');
      } else if (currentState === 'error') {
        updateProviderStatus(providerId, 'error');
      } else if (currentState === 'disconnected' || currentState === 'closed') {
        // Only update if we were still processing
        const result = useSessionStore.getState()[
          providerId === 'openai' ? 'openaiResult' : 'elevenlabsResult'
        ];
        if (result.status === 'listening' || result.status === 'processing') {
          updateProviderStatus(providerId, 'error');
        }
      }
    });

    // Interim transcript updates
    adapter.on('transcript_interim', (event) => {
      updateProviderTranscript(providerId, {
        interimText: event.data.text,
      });
    });

    // Committed transcript updates
    adapter.on('transcript_committed', (event) => {
      updateProviderTranscript(providerId, {
        committedText: event.data.text,
      });
    });

    // Final transcript
    adapter.on('transcript_final', (event) => {
      const duration = Date.now() - recordingStartTimeRef.current;

      updateProviderTranscript(providerId, {
        finalText: event.data.text,
      });
      updateProviderDuration(providerId, duration);
      updateProviderStatus(providerId, 'processing');

      // Get word timings if available
      const words = adapter.getWordTimings();
      if (words.length > 0) {
        updateProviderWords(providerId, words);
      }

      // Compute scores
      computeScores(providerId);
    });

    // Word timing events
    adapter.on('word_timing', () => {
      const currentWords = adapter.getWordTimings();
      updateProviderWords(providerId, currentWords);
    });

    // Error events
    adapter.on('error', (event) => {
      setProviderError(providerId, event.data.message);
    });
  }, [
    updateProviderStatus,
    updateProviderTranscript,
    updateProviderWords,
    updateProviderDuration,
    setProviderError,
    computeScores,
  ]);

  // Start recording
  const startRecording = useCallback(async () => {
    errorRef.current = null;

    try {
      // Update store state
      storeStartRecording();
      recordingStartTimeRef.current = Date.now();

      // Request microphone permission
      const stream = await requestMicPermission();
      mediaStreamRef.current = stream;

      // Fetch tokens in parallel
      const [openaiToken, elevenlabsToken] = await Promise.allSettled([
        fetchOpenAIToken(),
        fetchElevenLabsToken(),
      ]);

      // Create and configure OpenAI adapter
      if (openaiToken.status === 'fulfilled') {
        const adapter = new OpenAIRealtimeAdapter();
        adapter.configure({
          websocketUrl: openaiToken.value.websocketUrl,
          token: openaiToken.value.token,
          tokenExpiresAt: openaiToken.value.expiresAt,
          connectTimeoutMs: appConfig.timeouts.connectMs,
          finalizationTimeoutMs: appConfig.timeouts.finalizationMs,
          debugLogging: appConfig.featureFlags.debugLogging,
        });
        setupProviderEvents(adapter, 'openai');
        openaiAdapterRef.current = adapter;

        try {
          await adapter.connect();
        } catch (e) {
          setProviderError('openai', e instanceof Error ? e.message : 'Connection failed');
        }
      } else {
        setProviderError('openai', openaiToken.reason?.message || 'Token fetch failed');
      }

      // Create and configure ElevenLabs adapter
      if (elevenlabsToken.status === 'fulfilled') {
        const adapter = createElevenLabsAdapter();
        adapter.configure({
          websocketUrl: elevenlabsToken.value.websocketUrl,
          token: elevenlabsToken.value.token,
          tokenExpiresAt: elevenlabsToken.value.expiresAt,
          connectTimeoutMs: appConfig.timeouts.connectMs,
          finalizationTimeoutMs: appConfig.timeouts.finalizationMs,
          debugLogging: appConfig.featureFlags.debugLogging,
        });
        setupProviderEvents(adapter, 'elevenlabs');
        elevenlabsAdapterRef.current = adapter;

        try {
          await adapter.connect();
        } catch (e) {
          setProviderError('elevenlabs', e instanceof Error ? e.message : 'Connection failed');
        }
      } else {
        setProviderError('elevenlabs', elevenlabsToken.reason?.message || 'Token fetch failed');
      }

      // Create audio chunker
      const chunker = createAudioChunker(
        stream,
        (chunk: ArrayBuffer) => {
          // Send to both providers
          if (openaiAdapterRef.current?.isConnected()) {
            openaiAdapterRef.current.sendAudio(chunk);
          }
          if (elevenlabsAdapterRef.current?.isConnected()) {
            elevenlabsAdapterRef.current.sendAudio(chunk);
          }
        },
        {
          sampleRate: 16000,
          chunkSize: 4096,
          mono: true,
        }
      );

      audioChunkerRef.current = chunker;
      chunker.start();

      // Set up max recording timeout
      const maxDuration = appConfig.timeouts.maxRecordingMs;
      setTimeout(() => {
        if (useSessionStore.getState().recordingState === 'listening') {
          stopRecording();
        }
      }, maxDuration);

    } catch (error) {
      console.error('Failed to start recording:', error);
      errorRef.current = error instanceof Error ? error.message : 'Recording failed';

      // Clean up on error
      cleanup();
      storeStopRecording();
    }
  }, [storeStartRecording, setupProviderEvents, setProviderError]);

  // Stop recording
  const stopRecording = useCallback(() => {
    storeStopRecording();

    // Stop audio chunker
    if (audioChunkerRef.current) {
      audioChunkerRef.current.stop();
      audioChunkerRef.current = null;
    }

    // Stop microphone
    if (mediaStreamRef.current) {
      stopMicStream(mediaStreamRef.current);
      mediaStreamRef.current = null;
    }

    // Signal end of audio to providers
    if (openaiAdapterRef.current?.isConnected()) {
      openaiAdapterRef.current.endAudio();
    }
    if (elevenlabsAdapterRef.current?.isConnected()) {
      elevenlabsAdapterRef.current.endAudio();
    }

    // Wait for finalization or timeout
    const finalizationTimeout = appConfig.timeouts.finalizationMs;

    setTimeout(() => {
      const state = useSessionStore.getState();

      // If providers haven't completed, force completion with last known transcript
      if (state.openaiResult.status !== 'completed') {
        const openaiTranscript = state.openaiResult.transcript;
        if (openaiTranscript.committedText || openaiTranscript.interimText) {
          useSessionStore.getState().updateProviderTranscript('openai', {
            finalText: openaiTranscript.committedText || openaiTranscript.interimText,
          });
          computeScores('openai');
        }
      }

      if (state.elevenlabsResult.status !== 'completed') {
        const elevenlabsTranscript = state.elevenlabsResult.transcript;
        if (elevenlabsTranscript.committedText || elevenlabsTranscript.interimText) {
          useSessionStore.getState().updateProviderTranscript('elevenlabs', {
            finalText: elevenlabsTranscript.committedText || elevenlabsTranscript.interimText,
          });
          computeScores('elevenlabs');
        }
      }

      // Ensure recording state is completed
      setRecordingCompleted();

      // Clean up adapters
      cleanup();
    }, finalizationTimeout);

  }, [storeStopRecording, computeScores, setRecordingCompleted]);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (openaiAdapterRef.current) {
      openaiAdapterRef.current.dispose();
      openaiAdapterRef.current = null;
    }
    if (elevenlabsAdapterRef.current) {
      elevenlabsAdapterRef.current.dispose();
      elevenlabsAdapterRef.current = null;
    }
    if (audioChunkerRef.current) {
      audioChunkerRef.current.stop();
      audioChunkerRef.current = null;
    }
    if (mediaStreamRef.current) {
      stopMicStream(mediaStreamRef.current);
      mediaStreamRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    startRecording,
    stopRecording,
    isRecording: recordingState === 'listening',
    error: errorRef.current,
  };
}

export default useDualSTT;
