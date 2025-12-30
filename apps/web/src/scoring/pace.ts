/**
 * Pace Scoring
 *
 * Calculates pace score (0-100) based on:
 * - Words per minute (WPM) - ideal range 120-160
 * - Pause detection from word timing gaps
 *
 * Penalties:
 * - WPM outside 120-160 ideal range (cap -40)
 * - -3 per pause >700ms (cap -30)
 * - -5 per long pause >1500ms (cap -30)
 */

import type { WordTiming, PaceBreakdown } from "@rsta/shared";

// Configuration constants (matching app_config.json)
const IDEAL_WPM_MIN = 120;
const IDEAL_WPM_MAX = 160;
const PAUSE_THRESHOLD_MS = 700;
const LONG_PAUSE_THRESHOLD_MS = 1500;

// Penalty constants
const WPM_PENALTY_CAP = 40;
const PAUSE_PENALTY_EACH = 3;
const PAUSE_PENALTY_CAP = 30;
const LONG_PAUSE_PENALTY_EACH = 5;
const LONG_PAUSE_PENALTY_CAP = 30;

/**
 * Clamps a value between min and max
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Detects pauses from word timing data
 * @param words - Array of word timings
 * @returns Object with pause counts and longest pause
 */
function detectPauses(words: WordTiming[]): {
  pauseCount: number;
  longPauseCount: number;
  longestPauseMs: number;
} {
  if (words.length < 2) {
    return { pauseCount: 0, longPauseCount: 0, longestPauseMs: 0 };
  }

  let pauseCount = 0;
  let longPauseCount = 0;
  let longestPauseMs = 0;

  for (let i = 1; i < words.length; i++) {
    const gap = words[i].startMs - words[i - 1].endMs;

    if (gap > LONG_PAUSE_THRESHOLD_MS) {
      // Long pause (>1500ms) - counts as both a pause and a long pause
      longPauseCount++;
      longestPauseMs = Math.max(longestPauseMs, gap);
    } else if (gap > PAUSE_THRESHOLD_MS) {
      // Regular pause (>700ms, <=1500ms)
      pauseCount++;
      longestPauseMs = Math.max(longestPauseMs, gap);
    }
  }

  return { pauseCount, longPauseCount, longestPauseMs };
}

/**
 * Calculates WPM penalty based on deviation from ideal range
 * @param wpm - Words per minute
 * @returns Penalty value (0 to WPM_PENALTY_CAP)
 */
function calculateWpmPenalty(wpm: number): number {
  if (wpm >= IDEAL_WPM_MIN && wpm <= IDEAL_WPM_MAX) {
    // Within ideal range - no penalty
    return 0;
  }

  // Calculate deviation from ideal range
  let deviation: number;
  if (wpm < IDEAL_WPM_MIN) {
    deviation = IDEAL_WPM_MIN - wpm;
  } else {
    deviation = wpm - IDEAL_WPM_MAX;
  }

  // Apply penalty: 1 point per WPM deviation, capped at 40
  // This means 40 WPM deviation from ideal range = max penalty
  return Math.min(deviation, WPM_PENALTY_CAP);
}

/**
 * Calculates the pace score for a recording
 * @param words - Array of word timings from transcription
 * @param durationMs - Total duration of recording in milliseconds
 * @returns Object containing score (0-100) and detailed breakdown
 */
export function calculatePace(
  words: WordTiming[],
  durationMs: number
): { score: number; breakdown: PaceBreakdown } {
  // Calculate word count
  const wordCount = words.length;

  // Calculate WPM
  // WPM = (wordCount / durationMs) * 60000
  const wpm =
    durationMs > 0 ? Math.round((wordCount / durationMs) * 60000) : 0;

  // Detect pauses
  const { pauseCount, longPauseCount, longestPauseMs } = detectPauses(words);

  // Calculate penalties
  const wpmPenalty = calculateWpmPenalty(wpm);

  // Pause penalty: -3 per pause, capped at -30
  const pausePenalty = Math.min(pauseCount * PAUSE_PENALTY_EACH, PAUSE_PENALTY_CAP);

  // Long pause penalty: -5 per long pause, capped at -30
  const longPausePenalty = Math.min(
    longPauseCount * LONG_PAUSE_PENALTY_EACH,
    LONG_PAUSE_PENALTY_CAP
  );

  // Calculate total penalty
  const totalPenalty = wpmPenalty + pausePenalty + longPausePenalty;

  // Calculate final score: 100 - total penalty
  const rawScore = 100 - totalPenalty;
  const score = Math.round(clamp(rawScore, 0, 100));

  return {
    score,
    breakdown: {
      wpm,
      idealWpmMin: IDEAL_WPM_MIN,
      idealWpmMax: IDEAL_WPM_MAX,
      pauseCount,
      longPauseCount,
      longestPauseMs,
      durationMs,
      wordCount,
    },
  };
}
