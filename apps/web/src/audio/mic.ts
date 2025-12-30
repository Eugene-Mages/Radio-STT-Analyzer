/**
 * Microphone Capture Module
 * Handles microphone permission and MediaStream management
 */

export interface MicrophoneError {
  code: 'PERMISSION_DENIED' | 'NOT_FOUND' | 'NOT_SUPPORTED' | 'UNKNOWN';
  message: string;
}

/**
 * Audio constraints optimized for speech-to-text
 * 16kHz mono is typical for STT APIs
 */
const AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  sampleRate: 16000,
  channelCount: 1,
};

/**
 * Checks if the browser supports getUserMedia
 */
export function isMicrophoneSupported(): boolean {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

/**
 * Requests microphone permission and returns a MediaStream
 * @throws MicrophoneError if permission is denied or not supported
 */
export async function requestMicPermission(): Promise<MediaStream> {
  if (!isMicrophoneSupported()) {
    throw {
      code: 'NOT_SUPPORTED',
      message: 'Microphone access is not supported in this browser',
    } as MicrophoneError;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: AUDIO_CONSTRAINTS,
      video: false,
    });
    return stream;
  } catch (error) {
    if (error instanceof DOMException) {
      switch (error.name) {
        case 'NotAllowedError':
        case 'PermissionDeniedError':
          throw {
            code: 'PERMISSION_DENIED',
            message: 'Microphone permission was denied. Please allow microphone access to use this feature.',
          } as MicrophoneError;

        case 'NotFoundError':
        case 'DevicesNotFoundError':
          throw {
            code: 'NOT_FOUND',
            message: 'No microphone found. Please connect a microphone and try again.',
          } as MicrophoneError;

        default:
          throw {
            code: 'UNKNOWN',
            message: `Failed to access microphone: ${error.message}`,
          } as MicrophoneError;
      }
    }

    throw {
      code: 'UNKNOWN',
      message: error instanceof Error ? error.message : 'Unknown error accessing microphone',
    } as MicrophoneError;
  }
}

/**
 * Stops all tracks on a MediaStream and releases the microphone
 * @param stream The MediaStream to stop
 */
export function stopMicStream(stream: MediaStream): void {
  if (!stream) return;

  stream.getTracks().forEach((track) => {
    track.stop();
  });
}

/**
 * Checks the current microphone permission state without prompting
 * Returns 'granted', 'denied', 'prompt', or null if not supported
 */
export async function checkMicPermission(): Promise<PermissionState | null> {
  if (!navigator.permissions) {
    return null;
  }

  try {
    const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
    return result.state;
  } catch {
    // Some browsers don't support querying microphone permission
    return null;
  }
}
