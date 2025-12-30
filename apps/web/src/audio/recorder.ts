/**
 * Recording State Management Module
 * Tracks recording start/stop times and duration
 */

export type RecorderState = 'idle' | 'recording' | 'stopped' | 'paused';

export interface RecorderStats {
  isRecording: boolean;
  state: RecorderState;
  durationMs: number;
  startTime: number | null;
  stopTime: number | null;
}

export interface Recorder {
  /** Start recording */
  start(): void;
  /** Stop recording */
  stop(): void;
  /** Pause recording (time continues but isRecording = false) */
  pause(): void;
  /** Resume from paused state */
  resume(): void;
  /** Reset recorder to initial state */
  reset(): void;
  /** Get current recording statistics */
  getStats(): RecorderStats;
  /** Check if currently recording */
  isRecording(): boolean;
  /** Get current duration in milliseconds */
  getDuration(): number;
  /** Subscribe to state changes */
  onStateChange(callback: (stats: RecorderStats) => void): () => void;
}

export interface RecorderOptions {
  /** Maximum recording duration in milliseconds (default: 30000) */
  maxDurationMs?: number;
  /** Callback when max duration is reached */
  onMaxDurationReached?: () => void;
  /** Update interval for duration tracking in ms (default: 100) */
  updateIntervalMs?: number;
}

const DEFAULT_OPTIONS: Required<RecorderOptions> = {
  maxDurationMs: 30000, // 30 seconds from app_config
  onMaxDurationReached: () => {},
  updateIntervalMs: 100,
};

/**
 * Creates a Recorder instance for tracking recording state
 *
 * @param options Configuration options
 */
export function createRecorder(options: RecorderOptions = {}): Recorder {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  let state: RecorderState = 'idle';
  let startTime: number | null = null;
  let stopTime: number | null = null;
  let pausedDuration: number = 0;
  let pauseStartTime: number | null = null;
  let updateInterval: ReturnType<typeof setInterval> | null = null;
  const listeners: Set<(stats: RecorderStats) => void> = new Set();

  /**
   * Calculates current duration accounting for pauses
   */
  function calculateDuration(): number {
    if (startTime === null) {
      return 0;
    }

    const endPoint = stopTime ?? Date.now();
    let duration = endPoint - startTime - pausedDuration;

    // If currently paused, subtract ongoing pause
    if (state === 'paused' && pauseStartTime !== null) {
      duration -= Date.now() - pauseStartTime;
    }

    return Math.max(0, duration);
  }

  /**
   * Gets current statistics
   */
  function getStats(): RecorderStats {
    return {
      isRecording: state === 'recording',
      state,
      durationMs: calculateDuration(),
      startTime,
      stopTime,
    };
  }

  /**
   * Notifies all listeners of state change
   */
  function notifyListeners(): void {
    const stats = getStats();
    listeners.forEach((callback) => {
      try {
        callback(stats);
      } catch (error) {
        console.error('Error in recorder state change listener:', error);
      }
    });
  }

  /**
   * Starts the update interval for real-time duration tracking
   */
  function startUpdateInterval(): void {
    if (updateInterval !== null) {
      return;
    }

    updateInterval = setInterval(() => {
      const duration = calculateDuration();

      // Check for max duration
      if (duration >= opts.maxDurationMs) {
        stop();
        opts.onMaxDurationReached();
        return;
      }

      notifyListeners();
    }, opts.updateIntervalMs);
  }

  /**
   * Stops the update interval
   */
  function stopUpdateInterval(): void {
    if (updateInterval !== null) {
      clearInterval(updateInterval);
      updateInterval = null;
    }
  }

  /**
   * Starts recording
   */
  function start(): void {
    if (state === 'recording') {
      return;
    }

    if (state === 'idle' || state === 'stopped') {
      // Fresh start
      startTime = Date.now();
      stopTime = null;
      pausedDuration = 0;
      pauseStartTime = null;
    }

    state = 'recording';
    startUpdateInterval();
    notifyListeners();
  }

  /**
   * Stops recording
   */
  function stop(): void {
    if (state === 'idle' || state === 'stopped') {
      return;
    }

    // Handle if stopping from paused state
    if (state === 'paused' && pauseStartTime !== null) {
      pausedDuration += Date.now() - pauseStartTime;
      pauseStartTime = null;
    }

    stopTime = Date.now();
    state = 'stopped';
    stopUpdateInterval();
    notifyListeners();
  }

  /**
   * Pauses recording
   */
  function pause(): void {
    if (state !== 'recording') {
      return;
    }

    pauseStartTime = Date.now();
    state = 'paused';
    stopUpdateInterval();
    notifyListeners();
  }

  /**
   * Resumes from paused state
   */
  function resume(): void {
    if (state !== 'paused') {
      return;
    }

    if (pauseStartTime !== null) {
      pausedDuration += Date.now() - pauseStartTime;
      pauseStartTime = null;
    }

    state = 'recording';
    startUpdateInterval();
    notifyListeners();
  }

  /**
   * Resets recorder to initial state
   */
  function reset(): void {
    stopUpdateInterval();
    state = 'idle';
    startTime = null;
    stopTime = null;
    pausedDuration = 0;
    pauseStartTime = null;
    notifyListeners();
  }

  return {
    start,
    stop,
    pause,
    resume,
    reset,
    getStats,

    isRecording(): boolean {
      return state === 'recording';
    },

    getDuration(): number {
      return calculateDuration();
    },

    onStateChange(callback: (stats: RecorderStats) => void): () => void {
      listeners.add(callback);

      // Return unsubscribe function
      return () => {
        listeners.delete(callback);
      };
    },
  };
}
