/**
 * Filler Word Detection
 *
 * Detects and counts filler words in transcripts using
 * the FILLER_WORDS list from shared types.
 */

import { FILLER_WORDS, type FillerCount } from "@rsta/shared";

/**
 * Detects filler words in the given text
 * @param text - The text to analyze for filler words
 * @returns Array of FillerCount objects with word and count
 */
export function detectFillers(text: string): FillerCount[] {
  if (!text) {
    return [];
  }

  const normalizedText = text.toLowerCase();
  const fillerCounts: FillerCount[] = [];

  for (const filler of FILLER_WORDS) {
    // Create a regex that matches the filler word as a whole word
    // Use word boundaries to avoid matching within other words
    // Handle multi-word fillers like "you know"
    const escapedFiller = filler.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`\\b${escapedFiller}\\b`, "gi");

    const matches = normalizedText.match(regex);
    const count = matches ? matches.length : 0;

    if (count > 0) {
      fillerCounts.push({
        word: filler,
        count,
      });
    }
  }

  // Sort by count descending for consistent output
  return fillerCounts.sort((a, b) => b.count - a.count);
}

/**
 * Counts the total number of filler word occurrences
 * @param fillers - Array of FillerCount objects
 * @returns Total count of all filler words
 */
export function countTotalFillers(fillers: FillerCount[]): number {
  return fillers.reduce((total, filler) => total + filler.count, 0);
}
