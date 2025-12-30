/**
 * useMicrophone Hook
 * React hook for managing microphone access and MediaStream
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  requestMicPermission,
  stopMicStream,
  checkMicPermission,
  isMicrophoneSupported,
  type MicrophoneError,
} from '../audio/mic';

export type MicPermissionState = 'unknown' | 'granted' | 'denied' | 'prompt' | 'requesting';

export interface UseMicrophoneState {
  /** Current permission state */
  permissionState: MicPermissionState;
  /** Whether we have an active MediaStream */
  hasStream: boolean;
  /** Whether we're currently requesting permission */
  isRequesting: boolean;
  /** Whether microphone is supported in this browser */
  isSupported: boolean;
  /** Current error, if any */
  error: MicrophoneError | null;
  /** The active MediaStream, if available */
  stream: MediaStream | null;
}

export interface UseMicrophoneActions {
  /** Request microphone permission and get a MediaStream */
  requestPermission: () => Promise<MediaStream | null>;
  /** Release the current MediaStream */
  release: () => void;
  /** Clear any current error */
  clearError: () => void;
  /** Check current permission state without prompting */
  checkPermission: () => Promise<void>;
}

export type UseMicrophoneReturn = UseMicrophoneState & UseMicrophoneActions;

/**
 * Hook for managing microphone access
 *
 * @example
 * ```tsx
 * const { stream, hasStream, isRequesting, error, requestPermission, release } = useMicrophone();
 *
 * const handleStartRecording = async () => {
 *   const micStream = await requestPermission();
 *   if (micStream) {
 *     // Start using the stream
 *   }
 * };
 * ```
 */
export function useMicrophone(): UseMicrophoneReturn {
  const [permissionState, setPermissionState] = useState<MicPermissionState>('unknown');
  const [isRequesting, setIsRequesting] = useState(false);
  const [error, setError] = useState<MicrophoneError | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const isSupported = isMicrophoneSupported();

  // Check permission on mount
  useEffect(() => {
    checkPermission();
  }, []);

  // Cleanup stream on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        stopMicStream(streamRef.current);
        streamRef.current = null;
      }
    };
  }, []);

  /**
   * Checks current permission state without prompting
   */
  const checkPermission = useCallback(async () => {
    const state = await checkMicPermission();
    if (state) {
      setPermissionState(state as MicPermissionState);
    }
  }, []);

  /**
   * Requests microphone permission and returns the MediaStream
   */
  const requestPermission = useCallback(async (): Promise<MediaStream | null> => {
    if (isRequesting) {
      return null;
    }

    // If we already have a stream, return it
    if (streamRef.current) {
      return streamRef.current;
    }

    setIsRequesting(true);
    setPermissionState('requesting');
    setError(null);

    try {
      const newStream = await requestMicPermission();

      streamRef.current = newStream;
      setStream(newStream);
      setPermissionState('granted');

      // Listen for track ended events
      newStream.getTracks().forEach((track) => {
        track.onended = () => {
          // Track was stopped externally
          if (streamRef.current === newStream) {
            streamRef.current = null;
            setStream(null);
          }
        };
      });

      return newStream;
    } catch (err) {
      const micError = err as MicrophoneError;
      setError(micError);

      if (micError.code === 'PERMISSION_DENIED') {
        setPermissionState('denied');
      } else {
        setPermissionState('unknown');
      }

      return null;
    } finally {
      setIsRequesting(false);
    }
  }, [isRequesting]);

  /**
   * Releases the current MediaStream
   */
  const release = useCallback(() => {
    if (streamRef.current) {
      stopMicStream(streamRef.current);
      streamRef.current = null;
      setStream(null);
    }
  }, []);

  /**
   * Clears the current error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // State
    permissionState,
    hasStream: stream !== null,
    isRequesting,
    isSupported,
    error,
    stream,

    // Actions
    requestPermission,
    release,
    clearError,
    checkPermission,
  };
}
