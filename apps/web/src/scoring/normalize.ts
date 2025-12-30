/**
 * Text Normalization Utility
 *
 * Normalizes text for comparison by:
 * - Converting to lowercase
 * - Removing punctuation (keeping numbers and letters)
 * - Collapsing multiple whitespace to single space
 * - Trimming leading/trailing whitespace
 */

/**
 * Normalizes text for consistent comparison
 * @param text - The input text to normalize
 * @returns Normalized text (lowercase, no punctuation, collapsed whitespace)
 */
export function normalizeText(text: string): string {
  if (!text) {
    return "";
  }

  return (
    text
      // Convert to lowercase
      .toLowerCase()
      // Remove all punctuation, keeping only letters, numbers, and whitespace
      // Unicode-aware: keeps letters from all scripts
      .replace(/[^\p{L}\p{N}\s]/gu, "")
      // Collapse multiple whitespace characters to single space
      .replace(/\s+/g, " ")
      // Trim leading and trailing whitespace
      .trim()
  );
}
