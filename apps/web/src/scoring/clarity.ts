/**
 * Clarity Scoring
 *
 * Calculates clarity score (0-100) based on:
 * - Text similarity between transcript and expected answer
 * - Filler word penalty
 *
 * Formula: clamp(similarity * 100 - min(25, fillerCount * 5), 0, 100)
 */

import type { ClarityBreakdown, FillerCount } from "@rsta/shared";
import { normalizeText } from "./normalize";
import { calculateSimilarity } from "./similarity";
import { detectFillers, countTotalFillers } from "./fillers";

/**
 * Clamps a value between min and max
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Calculates the clarity score for a transcript
 * @param transcript - The actual spoken transcript
 * @param expected - The expected/reference answer
 * @returns Object containing score (0-100) and detailed breakdown
 */
export function calculateClarity(
  transcript: string,
  expected: string
): { score: number; breakdown: ClarityBreakdown } {
  // Normalize both texts for comparison
  const normalizedTranscript = normalizeText(transcript);
  const normalizedExpected = normalizeText(expected);

  // Calculate similarity (0-1)
  const similarityScore = calculateSimilarity(
    normalizedTranscript,
    normalizedExpected
  );

  // Detect filler words in the original transcript
  const fillers: FillerCount[] = detectFillers(transcript);
  const totalFillers = countTotalFillers(fillers);

  // Calculate filler penalty: min(25, fillerCount * 5)
  // Each filler word costs 5 points, capped at 25
  const fillerPenalty = Math.min(25, totalFillers * 5);

  // Calculate final score: similarity * 100 - filler penalty
  // Clamped to 0-100 range
  const rawScore = similarityScore * 100 - fillerPenalty;
  const score = Math.round(clamp(rawScore, 0, 100));

  return {
    score,
    breakdown: {
      similarityScore,
      fillerPenalty,
      fillers,
      normalizedTranscript,
      normalizedExpected,
    },
  };
}
