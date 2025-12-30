/**
 * Text Similarity Calculation
 *
 * Implements Levenshtein distance algorithm to calculate
 * the similarity ratio between two strings.
 */

/**
 * Calculates the Levenshtein distance between two strings
 * @param a - First string
 * @param b - Second string
 * @returns The minimum number of single-character edits required
 */
function levenshteinDistance(a: string, b: string): number {
  // Handle edge cases
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  // Create distance matrix
  // Use two rows for space optimization (we only need current and previous row)
  let previousRow = new Array<number>(b.length + 1);
  let currentRow = new Array<number>(b.length + 1);

  // Initialize first row (distance from empty string to each prefix of b)
  for (let j = 0; j <= b.length; j++) {
    previousRow[j] = j;
  }

  // Fill in the matrix
  for (let i = 1; i <= a.length; i++) {
    currentRow[0] = i;

    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;

      currentRow[j] = Math.min(
        previousRow[j] + 1, // deletion
        currentRow[j - 1] + 1, // insertion
        previousRow[j - 1] + cost // substitution
      );
    }

    // Swap rows
    [previousRow, currentRow] = [currentRow, previousRow];
  }

  // Result is in previousRow (after swap) at position b.length
  return previousRow[b.length];
}

/**
 * Calculates the similarity ratio between two strings
 * @param a - First string to compare
 * @param b - Second string to compare
 * @returns Similarity score between 0 (completely different) and 1 (identical)
 */
export function calculateSimilarity(a: string, b: string): number {
  // Handle edge cases
  if (a === b) return 1;
  if (a.length === 0 && b.length === 0) return 1;
  if (a.length === 0 || b.length === 0) return 0;

  const distance = levenshteinDistance(a, b);
  const maxLength = Math.max(a.length, b.length);

  // Similarity is 1 - (distance / maxLength)
  // This gives us a value between 0 and 1
  return 1 - distance / maxLength;
}
