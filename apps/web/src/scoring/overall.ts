/**
 * Overall Score Calculation
 *
 * Combines clarity, pace, and structure scores into a weighted overall score.
 *
 * Formula: round(0.40 * clarity + 0.30 * pace + 0.30 * structure)
 *
 * Weights are sourced from PRD and app_config.json:
 * - Clarity: 40%
 * - Pace: 30%
 * - Structure: 30%
 */

// Scoring weights (matching app_config.json)
const WEIGHTS = {
  clarity: 0.40,
  pace: 0.30,
  structure: 0.30,
} as const;

/**
 * Clamps a value between min and max
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Calculates the weighted overall score
 * @param clarity - Clarity score (0-100)
 * @param pace - Pace score (0-100)
 * @param structure - Structure score (0-100)
 * @returns Overall score (0-100), rounded to nearest integer
 */
export function calculateOverall(
  clarity: number,
  pace: number,
  structure: number
): number {
  // Ensure all inputs are within valid range
  const clampedClarity = clamp(clarity, 0, 100);
  const clampedPace = clamp(pace, 0, 100);
  const clampedStructure = clamp(structure, 0, 100);

  // Calculate weighted sum
  const weighted =
    WEIGHTS.clarity * clampedClarity +
    WEIGHTS.pace * clampedPace +
    WEIGHTS.structure * clampedStructure;

  // Round to nearest integer and clamp to 0-100
  return Math.round(clamp(weighted, 0, 100));
}
