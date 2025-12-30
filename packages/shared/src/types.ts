/**
 * RSTA Shared Types
 *
 * Core type definitions used across web app and shared packages.
 * These types define the structure for questions, scoring, and provider results.
 */

// ============================================================================
// Filler Words
// ============================================================================

/**
 * Common filler words to detect in speech
 */
export const FILLER_WORDS = [
  "um",
  "uh",
  "er",
  "ah",
  "like",
  "you know",
  "basically",
  "actually",
  "literally",
  "so",
  "well",
  "right",
  "okay",
  "i mean",
] as const;

// ============================================================================
// Question Bank Types
// ============================================================================

/**
 * Structure mode for radio communication scoring
 */
export type StructureMode = "full" | "ack_short" | "clarify_request";

/**
 * Single question in the question bank
 */
export interface Question {
  /** Unique question identifier */
  id: string;
  /** Question prompt/scenario */
  prompt: string;
  /** Array of 4 answer options */
  options: [string, string, string, string];
  /** Index of the correct option (0-3) */
  correctIndex: number;
  /** Expected spoken answer text */
  expectedSpokenAnswer: string;
  /** Structure mode for scoring */
  structureMode: StructureMode;
  /** Keywords expected in the response */
  expectedKeywords?: string[];
}

/**
 * Question bank containing multiple questions
 */
export interface QuestionBank {
  /** Bank name */
  name: string;
  /** Bank version */
  version: string;
  /** Array of questions */
  questions: Question[];
}

// ============================================================================
// Word Timing Types
// ============================================================================

/**
 * Timing information for a single word
 */
export interface WordTiming {
  /** The word that was spoken */
  word: string;
  /** Start time in milliseconds */
  startMs: number;
  /** End time in milliseconds */
  endMs: number;
  /** Confidence score (0-1) if available */
  confidence?: number;
}

// ============================================================================
// Filler Count Types
// ============================================================================

/**
 * Count of a specific filler word
 */
export interface FillerCount {
  /** The filler word */
  word: string;
  /** Number of occurrences */
  count: number;
}

// ============================================================================
// Scoring Breakdown Types
// ============================================================================

/**
 * Clarity scoring breakdown
 */
export interface ClarityBreakdown {
  /** Similarity score (0-1) */
  similarityScore: number;
  /** Penalty for filler words (0-25) */
  fillerPenalty: number;
  /** Detected filler words with counts */
  fillers: FillerCount[];
  /** Normalized transcript text */
  normalizedTranscript: string;
  /** Normalized expected text */
  normalizedExpected: string;
}

/**
 * Pace scoring breakdown
 */
export interface PaceBreakdown {
  /** Words per minute */
  wpm: number;
  /** Minimum ideal WPM */
  idealWpmMin: number;
  /** Maximum ideal WPM */
  idealWpmMax: number;
  /** Number of pauses (>700ms) */
  pauseCount: number;
  /** Number of long pauses (>1500ms) */
  longPauseCount: number;
  /** Longest pause in milliseconds */
  longestPauseMs: number;
  /** Total duration in milliseconds */
  durationMs: number;
  /** Total word count */
  wordCount: number;
}

/**
 * Structure scoring breakdown
 */
export interface StructureBreakdown {
  /** Structure mode used */
  mode: StructureMode;
  /** Whether receiver callsign is present */
  receiverPresent: boolean;
  /** Whether sender identification is present */
  senderPresent: boolean;
  /** Whether intent/message is present */
  intentPresent: boolean;
  /** Whether closing phrase is present */
  closingPresent: boolean;
  /** Type of closing phrase */
  closingType: "over" | "out" | "invalid" | "none";
  /** Whether elements are in correct order */
  orderCorrect: boolean;
  /** List of structure violations */
  violations: string[];
  /** Keywords found in the message */
  keywordsFound: string[];
  /** Keywords expected in the message */
  keywordsExpected: string[];
}

/**
 * Complete scoring breakdown with all metrics
 */
export interface ScoringBreakdown {
  clarity: ClarityBreakdown;
  pace: PaceBreakdown;
  structure: StructureBreakdown;
}

// ============================================================================
// Provider Types
// ============================================================================

/**
 * Provider status states
 */
export type ProviderStatus =
  | "idle"
  | "connecting"
  | "listening"
  | "processing"
  | "completed"
  | "error"
  | "timeout";

/**
 * Provider cost information
 */
export interface ProviderCost {
  /** Currency code (e.g., "USD") */
  currency: string;
  /** Cost amount */
  amount: number;
  /** Cost calculation method */
  method: "usage" | "estimate";
}

/**
 * Provider scoring metrics
 */
export interface ProviderMetrics {
  /** Clarity score (0-100) */
  clarity: number;
  /** Pace score (0-100) */
  pace: number;
  /** Structure score (0-100) */
  structure: number;
  /** Overall score (0-100) */
  overall: number;
}

/**
 * Transcript data from provider
 */
export interface ProviderTranscript {
  /** Interim (partial) transcript text */
  interimText: string;
  /** Committed transcript text */
  committedText: string;
  /** Final transcript text */
  finalText: string;
}

/**
 * Complete provider result
 */
export interface ProviderResult {
  /** Current status */
  status: ProviderStatus;
  /** Transcript data */
  transcript: ProviderTranscript;
  /** Word timings (if available) */
  words?: WordTiming[];
  /** Recording duration in milliseconds */
  durationMs: number;
  /** Detected filler words */
  fillers: FillerCount[];
  /** Scoring metrics (after processing) */
  metrics: ProviderMetrics | null;
  /** Detailed scoring breakdown (after processing) */
  breakdown: ScoringBreakdown | null;
  /** Cost information (after processing) */
  cost: ProviderCost | null;
  /** Any errors encountered */
  errors?: string[];
}

// ============================================================================
// Recording Types
// ============================================================================

/**
 * Recording state
 */
export type RecordingState = "idle" | "listening" | "processing" | "completed";

// ============================================================================
// Transcript State Types (for realtime providers)
// ============================================================================

/**
 * Transcript state during realtime transcription
 */
export interface TranscriptState {
  /** Current interim/partial transcript */
  interimText: string;
  /** Previously committed text */
  committedText: string;
  /** Final complete transcript */
  finalText: string;
  /** Whether transcription is finalized */
  isFinal: boolean;
}

// ============================================================================
// Realtime Event Types
// ============================================================================

/** Provider identification for realtime events */
export type ProviderId = "openai" | "elevenlabs";

/** Base realtime event */
export interface RealtimeEvent {
  /** Event type */
  type: string;
  /** Provider that emitted the event */
  providerId: ProviderId;
  /** Event timestamp */
  timestamp: number;
}

/** Transcript update event */
export interface TranscriptEvent extends RealtimeEvent {
  type: "transcript_interim" | "transcript_committed" | "transcript_final";
  data: {
    /** The transcript text */
    text: string;
    /** Whether this is the final transcript */
    isFinal: boolean;
    /** Transcript state */
    state: TranscriptState;
  };
}

/** Word timing event */
export interface WordTimingEvent extends RealtimeEvent {
  type: "word_timing";
  data: {
    /** The word that was spoken */
    word: string;
    /** Start time in milliseconds */
    startMs: number;
    /** End time in milliseconds */
    endMs: number;
    /** Confidence score (0-1) if available */
    confidence?: number;
  };
}

/** Error event */
export interface ErrorEvent extends RealtimeEvent {
  type: "error";
  data: {
    /** Error code */
    code: string;
    /** Error message */
    message: string;
    /** Whether the error is recoverable */
    recoverable: boolean;
    /** Optional details */
    details?: unknown;
  };
}

// ============================================================================
// API Request/Response Types
// ============================================================================

/**
 * Standard API error response
 */
export interface APIErrorResponse {
  /** Error message */
  error: string;
  /** Error code */
  code?: string;
  /** Additional details */
  details?: unknown;
}

/**
 * OpenAI token request
 */
export interface OpenAITokenRequest {
  /** Session ID for tracking */
  sessionId?: string;
  /** Session duration hint in seconds */
  durationHint?: number;
}

/**
 * OpenAI token response
 */
export interface OpenAITokenResponse {
  /** Ephemeral API key */
  token: string;
  /** Token expiration timestamp (milliseconds since epoch) */
  expiresAt: number;
  /** WebSocket URL for realtime connection */
  websocketUrl: string;
}

/**
 * ElevenLabs token request
 */
export interface ElevenLabsTokenRequest {
  /** Session ID for tracking */
  sessionId?: string;
  /** Session duration hint in seconds */
  durationHint?: number;
}

/**
 * ElevenLabs token response
 */
export interface ElevenLabsTokenResponse {
  /** Authentication token */
  token: string;
  /** Token expiration timestamp (milliseconds since epoch) */
  expiresAt: number;
  /** WebSocket URL for realtime connection */
  websocketUrl: string;
}
