/**
 * RSTA Scoring Engine
 *
 * Re-exports all scoring functions for convenient import.
 *
 * Usage:
 *   import { calculateClarity, calculatePace, calculateStructure, calculateOverall } from '@/scoring';
 *   // or
 *   import * as scoring from '@/scoring';
 */

// Text normalization
export { normalizeText } from "./normalize";

// Similarity calculation
export { calculateSimilarity } from "./similarity";

// Filler word detection
export { detectFillers, countTotalFillers } from "./fillers";

// Clarity scoring
export { calculateClarity } from "./clarity";

// Pace scoring
export { calculatePace } from "./pace";

// Structure scoring
export { calculateStructure } from "./structure";

// Overall score calculation
export { calculateOverall } from "./overall";
