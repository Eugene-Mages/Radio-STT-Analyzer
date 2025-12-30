/**
 * Audio Chunker Module
 * Chunks audio stream for WebSocket streaming to STT providers
 * Uses AudioWorklet with ScriptProcessorNode fallback
 */

export type ChunkerState = 'idle' | 'active' | 'stopped' | 'error';

export interface AudioChunker {
  start(): void;
  stop(): void;
  getState(): ChunkerState;
}

export interface ChunkerOptions {
  /** Target sample rate for output (default: 16000) */
  sampleRate?: number;
  /** Chunk size in samples (default: 4096) */
  chunkSize?: number;
  /** Mono output (default: true) */
  mono?: boolean;
}

const DEFAULT_OPTIONS: Required<ChunkerOptions> = {
  sampleRate: 16000,
  chunkSize: 4096,
  mono: true,
};

/**
 * Creates an AudioChunker that processes audio from a MediaStream
 * and calls onChunk with PCM audio data as ArrayBuffer
 *
 * @param stream The MediaStream from getUserMedia
 * @param onChunk Callback invoked with each audio chunk
 * @param options Configuration options
 */
export function createAudioChunker(
  stream: MediaStream,
  onChunk: (chunk: ArrayBuffer) => void,
  options: ChunkerOptions = {}
): AudioChunker {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let state: ChunkerState = 'idle';
  let audioContext: AudioContext | null = null;
  let source: MediaStreamAudioSourceNode | null = null;
  let processor: ScriptProcessorNode | AudioWorkletNode | null = null;

  /**
   * Converts Float32Array audio samples to Int16 PCM ArrayBuffer
   */
  function float32ToInt16(float32Array: Float32Array): ArrayBuffer {
    const buffer = new ArrayBuffer(float32Array.length * 2);
    const view = new DataView(buffer);

    for (let i = 0; i < float32Array.length; i++) {
      // Clamp to [-1, 1] and convert to Int16
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }

    return buffer;
  }

  /**
   * Resamples audio from source sample rate to target sample rate
   */
  function resample(input: Float32Array, fromRate: number, toRate: number): Float32Array {
    if (fromRate === toRate) {
      return input;
    }

    const ratio = fromRate / toRate;
    const outputLength = Math.floor(input.length / ratio);
    const output = new Float32Array(outputLength);

    for (let i = 0; i < outputLength; i++) {
      const srcIndex = i * ratio;
      const srcIndexFloor = Math.floor(srcIndex);
      const srcIndexCeil = Math.min(srcIndexFloor + 1, input.length - 1);
      const t = srcIndex - srcIndexFloor;

      // Linear interpolation
      output[i] = input[srcIndexFloor] * (1 - t) + input[srcIndexCeil] * t;
    }

    return output;
  }

  /**
   * Starts audio processing using ScriptProcessorNode (deprecated but widely supported)
   */
  function startWithScriptProcessor(): void {
    if (!audioContext || !source) return;

    // ScriptProcessorNode requires buffer size to be power of 2
    const bufferSize = opts.chunkSize;
    processor = audioContext.createScriptProcessor(bufferSize, 1, 1);

    processor.onaudioprocess = (event: AudioProcessingEvent) => {
      if (state !== 'active') return;

      const inputData = event.inputBuffer.getChannelData(0);

      // Resample if needed
      const resampled = resample(inputData, audioContext!.sampleRate, opts.sampleRate);

      // Convert to Int16 PCM
      const chunk = float32ToInt16(resampled);

      onChunk(chunk);
    };

    source.connect(processor);
    processor.connect(audioContext.destination);
  }

  return {
    start(): void {
      if (state === 'active') {
        return;
      }

      try {
        // Create AudioContext
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
          sampleRate: opts.sampleRate,
        });

        // Create source from stream
        source = audioContext.createMediaStreamSource(stream);

        // Use ScriptProcessorNode (AudioWorklet would require additional setup)
        startWithScriptProcessor();

        state = 'active';
      } catch (error) {
        state = 'error';
        console.error('Failed to start audio chunker:', error);
        throw error;
      }
    },

    stop(): void {
      if (state === 'stopped') {
        return;
      }

      state = 'stopped';

      // Disconnect and cleanup
      if (processor) {
        processor.disconnect();
        processor = null;
      }

      if (source) {
        source.disconnect();
        source = null;
      }

      if (audioContext) {
        audioContext.close().catch(console.error);
        audioContext = null;
      }
    },

    getState(): ChunkerState {
      return state;
    },
  };
}

/**
 * Creates an AudioWorklet-based chunker (more performant but requires additional setup)
 * Falls back to ScriptProcessorNode if AudioWorklet is not available
 */
export async function createAudioWorkletChunker(
  stream: MediaStream,
  onChunk: (chunk: ArrayBuffer) => void,
  workletUrl: string,
  options: ChunkerOptions = {}
): Promise<AudioChunker> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Check if AudioWorklet is supported
  if (!(window.AudioWorkletNode && window.AudioContext)) {
    console.warn('AudioWorklet not supported, falling back to ScriptProcessorNode');
    return createAudioChunker(stream, onChunk, options);
  }

  let state: ChunkerState = 'idle';
  let audioContext: AudioContext | null = null;
  let source: MediaStreamAudioSourceNode | null = null;
  let workletNode: AudioWorkletNode | null = null;

  return {
    async start(): Promise<void> {
      if (state === 'active') {
        return;
      }

      try {
        audioContext = new AudioContext({ sampleRate: opts.sampleRate });

        // Load the audio worklet module
        await audioContext.audioWorklet.addModule(workletUrl);

        source = audioContext.createMediaStreamSource(stream);

        workletNode = new AudioWorkletNode(audioContext, 'audio-chunker-processor', {
          processorOptions: {
            chunkSize: opts.chunkSize,
            sampleRate: opts.sampleRate,
          },
        });

        workletNode.port.onmessage = (event) => {
          if (state === 'active' && event.data.chunk) {
            onChunk(event.data.chunk);
          }
        };

        source.connect(workletNode);
        workletNode.connect(audioContext.destination);

        state = 'active';
      } catch (error) {
        state = 'error';
        console.error('Failed to start AudioWorklet chunker:', error);
        throw error;
      }
    },

    stop(): void {
      if (state === 'stopped') {
        return;
      }

      state = 'stopped';

      if (workletNode) {
        workletNode.disconnect();
        workletNode = null;
      }

      if (source) {
        source.disconnect();
        source = null;
      }

      if (audioContext) {
        audioContext.close().catch(console.error);
        audioContext = null;
      }
    },

    getState(): ChunkerState {
      return state;
    },
  };
}
