/**
 * useRecording Hook
 * React hook for managing recording state with real-time duration updates
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { createRecorder, type Recorder, type RecorderStats } from '../audio/recorder';

export interface UseRecordingOptions {
  /** Maximum recording duration in milliseconds (default: 30000) */
  maxDurationMs?: number;
  /** Callback when recording starts */
  onStart?: () => void;
  /** Callback when recording stops */
  onStop?: (durationMs: number) => void;
  /** Callback when max duration is reached */
  onMaxDurationReached?: () => void;
  /** Update interval for duration tracking in ms (default: 100) */
  updateIntervalMs?: number;
}

export interface UseRecordingState {
  /** Whether currently recording */
  isRecording: boolean;
  /** Whether currently paused */
  isPaused: boolean;
  /** Current recording duration in milliseconds */
  durationMs: number;
  /** Recording start time (Unix timestamp) */
  startTime: number | null;
  /** Recording stop time (Unix timestamp) */
  stopTime: number | null;
  /** Progress towards max duration (0-1) */
  progress: number;
  /** Remaining time in milliseconds */
  remainingMs: number;
}

export interface UseRecordingActions {
  /** Start recording */
  startRecording: () => void;
  /** Stop recording */
  stopRecording: () => void;
  /** Pause recording */
  pauseRecording: () => void;
  /** Resume from paused state */
  resumeRecording: () => void;
  /** Reset recording state */
  resetRecording: () => void;
}

export type UseRecordingReturn = UseRecordingState & UseRecordingActions;

const DEFAULT_MAX_DURATION_MS = 30000; // 30 seconds from app_config

/**
 * Formats duration in milliseconds to MM:SS format
 */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Hook for managing recording state with real-time duration updates
 *
 * @example
 * ```tsx
 * const {
 *   isRecording,
 *   durationMs,
 *   progress,
 *   startRecording,
 *   stopRecording,
 * } = useRecording({
 *   maxDurationMs: 30000,
 *   onMaxDurationReached: () => console.log('Max duration reached!'),
 * });
 *
 * return (
 *   <div>
 *     <p>Duration: {formatDuration(durationMs)}</p>
 *     <progress value={progress} max={1} />
 *     <button onClick={isRecording ? stopRecording : startRecording}>
 *       {isRecording ? 'Stop' : 'Start'}
 *     </button>
 *   </div>
 * );
 * ```
 */
export function useRecording(options: UseRecordingOptions = {}): UseRecordingReturn {
  const {
    maxDurationMs = DEFAULT_MAX_DURATION_MS,
    onStart,
    onStop,
    onMaxDurationReached,
    updateIntervalMs = 100,
  } = options;

  const [state, setState] = useState<UseRecordingState>({
    isRecording: false,
    isPaused: false,
    durationMs: 0,
    startTime: null,
    stopTime: null,
    progress: 0,
    remainingMs: maxDurationMs,
  });

  const recorderRef = useRef<Recorder | null>(null);
  const maxDurationRef = useRef(maxDurationMs);

  // Update max duration ref when prop changes
  useEffect(() => {
    maxDurationRef.current = maxDurationMs;
  }, [maxDurationMs]);

  // Initialize recorder
  useEffect(() => {
    const recorder = createRecorder({
      maxDurationMs,
      updateIntervalMs,
      onMaxDurationReached: () => {
        onMaxDurationReached?.();
      },
    });

    recorderRef.current = recorder;

    // Subscribe to state changes
    const unsubscribe = recorder.onStateChange((stats: RecorderStats) => {
      const progress = Math.min(stats.durationMs / maxDurationRef.current, 1);
      const remainingMs = Math.max(maxDurationRef.current - stats.durationMs, 0);

      setState({
        isRecording: stats.isRecording,
        isPaused: stats.state === 'paused',
        durationMs: stats.durationMs,
        startTime: stats.startTime,
        stopTime: stats.stopTime,
        progress,
        remainingMs,
      });
    });

    return () => {
      unsubscribe();
      recorder.reset();
    };
  }, [maxDurationMs, updateIntervalMs, onMaxDurationReached]);

  /**
   * Starts recording
   */
  const startRecording = useCallback(() => {
    if (recorderRef.current && !state.isRecording) {
      recorderRef.current.start();
      onStart?.();
    }
  }, [state.isRecording, onStart]);

  /**
   * Stops recording
   */
  const stopRecording = useCallback(() => {
    if (recorderRef.current && (state.isRecording || state.isPaused)) {
      const duration = recorderRef.current.getDuration();
      recorderRef.current.stop();
      onStop?.(duration);
    }
  }, [state.isRecording, state.isPaused, onStop]);

  /**
   * Pauses recording
   */
  const pauseRecording = useCallback(() => {
    if (recorderRef.current && state.isRecording) {
      recorderRef.current.pause();
    }
  }, [state.isRecording]);

  /**
   * Resumes recording from paused state
   */
  const resumeRecording = useCallback(() => {
    if (recorderRef.current && state.isPaused) {
      recorderRef.current.resume();
    }
  }, [state.isPaused]);

  /**
   * Resets recording state
   */
  const resetRecording = useCallback(() => {
    if (recorderRef.current) {
      recorderRef.current.reset();
    }
  }, []);

  return {
    // State
    ...state,

    // Actions
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    resetRecording,
  };
}
