/**
 * Question Engine - Navigation and Validation Logic
 *
 * Provides utility functions for question bank navigation:
 * - Getting current question
 * - Validating question bank structure
 * - Checking session completion status
 * - Progress calculation
 */

import type { QuestionBank, Question } from "@rsta/shared";

// ============================================================================
// Validation
// ============================================================================

/**
 * Validation result for question bank
 */
export interface ValidationResult {
  /** Whether the bank is valid */
  isValid: boolean;
  /** Error messages if invalid */
  errors: string[];
  /** Warning messages (non-blocking) */
  warnings: string[];
}

/**
 * Validates a question bank structure
 * @param bank - The question bank to validate
 * @returns Validation result with errors and warnings
 */
export function validateQuestionBank(bank: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check basic structure
  if (!bank || typeof bank !== "object") {
    return { isValid: false, errors: ["Invalid bank: expected an object"], warnings };
  }

  const obj = bank as Record<string, unknown>;

  // Check required fields
  if (typeof obj.name !== "string" || !obj.name.trim()) {
    errors.push("Missing or empty 'name' field");
  }

  if (typeof obj.version !== "string" || !obj.version.trim()) {
    errors.push("Missing or empty 'version' field");
  }

  // Check questions array
  if (!Array.isArray(obj.questions)) {
    errors.push("Missing 'questions' array");
    return { isValid: false, errors, warnings };
  }

  if (obj.questions.length === 0) {
    errors.push("Question bank has no questions");
    return { isValid: false, errors, warnings };
  }

  // Validate each question
  const questionIds = new Set<string>();

  for (let i = 0; i < obj.questions.length; i++) {
    const q = obj.questions[i] as Record<string, unknown>;
    const qPrefix = `Question ${i + 1}`;

    // Check id
    if (typeof q.id !== "string" || !q.id.trim()) {
      errors.push(`${qPrefix}: Missing or empty 'id'`);
    } else {
      if (questionIds.has(q.id)) {
        errors.push(`${qPrefix}: Duplicate question id '${q.id}'`);
      }
      questionIds.add(q.id);
    }

    // Check prompt
    if (typeof q.prompt !== "string" || !q.prompt.trim()) {
      errors.push(`${qPrefix}: Missing or empty 'prompt'`);
    }

    // Check options
    if (!Array.isArray(q.options)) {
      errors.push(`${qPrefix}: Missing 'options' array`);
    } else if (q.options.length !== 4) {
      errors.push(`${qPrefix}: 'options' must have exactly 4 items (has ${q.options.length})`);
    } else {
      for (let j = 0; j < q.options.length; j++) {
        if (typeof q.options[j] !== "string" || !q.options[j].trim()) {
          errors.push(`${qPrefix}: Option ${j + 1} is missing or empty`);
        }
      }
    }

    // Check correctIndex
    if (typeof q.correctIndex !== "number") {
      errors.push(`${qPrefix}: Missing 'correctIndex'`);
    } else if (q.correctIndex < 0 || q.correctIndex > 3) {
      errors.push(`${qPrefix}: 'correctIndex' must be 0, 1, 2, or 3 (is ${q.correctIndex})`);
    }

    // Check expectedSpokenAnswer (optional but recommended)
    if (!q.expectedSpokenAnswer) {
      warnings.push(`${qPrefix}: Missing 'expectedSpokenAnswer' - will use selected option`);
    } else if (typeof q.expectedSpokenAnswer !== "string") {
      errors.push(`${qPrefix}: 'expectedSpokenAnswer' must be a string`);
    }

    // Check structureMode
    const validModes = ["full", "ack_short", "clarify_request"];
    if (!q.structureMode) {
      warnings.push(`${qPrefix}: Missing 'structureMode' - will default to 'full'`);
    } else if (!validModes.includes(q.structureMode as string)) {
      errors.push(
        `${qPrefix}: Invalid 'structureMode' (${q.structureMode}), must be one of: ${validModes.join(", ")}`
      );
    }

    // Check expectedKeywords (optional)
    if (q.expectedKeywords !== undefined) {
      if (!Array.isArray(q.expectedKeywords)) {
        errors.push(`${qPrefix}: 'expectedKeywords' must be an array`);
      } else {
        for (let j = 0; j < q.expectedKeywords.length; j++) {
          if (typeof q.expectedKeywords[j] !== "string") {
            errors.push(`${qPrefix}: Keyword ${j + 1} is not a string`);
          }
        }
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================================================
// Question Access
// ============================================================================

/**
 * Gets the current question from the bank
 * @param bank - The question bank
 * @param index - Current question index
 * @returns The question at the index, or null if invalid
 */
export function getCurrentQuestion(
  bank: QuestionBank | null,
  index: number
): Question | null {
  if (!bank || index < 0 || index >= bank.questions.length) {
    return null;
  }
  return bank.questions[index];
}

/**
 * Gets a question by its ID
 * @param bank - The question bank
 * @param id - Question ID to find
 * @returns The question with matching ID, or null if not found
 */
export function getQuestionById(
  bank: QuestionBank | null,
  id: string
): Question | null {
  if (!bank) return null;
  return bank.questions.find((q) => q.id === id) ?? null;
}

/**
 * Gets the index of a question by its ID
 * @param bank - The question bank
 * @param id - Question ID to find
 * @returns The index of the question, or -1 if not found
 */
export function getQuestionIndexById(
  bank: QuestionBank | null,
  id: string
): number {
  if (!bank) return -1;
  return bank.questions.findIndex((q) => q.id === id);
}

// ============================================================================
// Navigation Helpers
// ============================================================================

/**
 * Checks if there is a next question available
 * @param bank - The question bank
 * @param currentIndex - Current question index
 * @returns True if next question exists
 */
export function hasNextQuestion(
  bank: QuestionBank | null,
  currentIndex: number
): boolean {
  if (!bank) return false;
  return currentIndex < bank.questions.length - 1;
}

/**
 * Checks if there is a previous question available
 * @param currentIndex - Current question index
 * @returns True if previous question exists
 */
export function hasPreviousQuestion(currentIndex: number): boolean {
  return currentIndex > 0;
}

/**
 * Calculates the next valid question index
 * @param bank - The question bank
 * @param currentIndex - Current question index
 * @returns Next index or current if at end
 */
export function getNextQuestionIndex(
  bank: QuestionBank | null,
  currentIndex: number
): number {
  if (!bank || currentIndex >= bank.questions.length - 1) {
    return currentIndex;
  }
  return currentIndex + 1;
}

/**
 * Calculates the previous valid question index
 * @param currentIndex - Current question index
 * @returns Previous index or current if at start
 */
export function getPreviousQuestionIndex(currentIndex: number): number {
  if (currentIndex <= 0) {
    return 0;
  }
  return currentIndex - 1;
}

// ============================================================================
// Session Progress
// ============================================================================

/**
 * Progress information for the session
 */
export interface SessionProgress {
  /** Current question number (1-based) */
  current: number;
  /** Total number of questions */
  total: number;
  /** Percentage complete (0-100) */
  percentage: number;
  /** Whether at first question */
  isFirst: boolean;
  /** Whether at last question */
  isLast: boolean;
}

/**
 * Calculates session progress
 * @param bank - The question bank
 * @param currentIndex - Current question index
 * @returns Progress information
 */
export function getSessionProgress(
  bank: QuestionBank | null,
  currentIndex: number
): SessionProgress {
  if (!bank || bank.questions.length === 0) {
    return {
      current: 0,
      total: 0,
      percentage: 0,
      isFirst: true,
      isLast: true,
    };
  }

  const total = bank.questions.length;
  const current = Math.min(Math.max(currentIndex + 1, 1), total);
  const percentage = Math.round((current / total) * 100);

  return {
    current,
    total,
    percentage,
    isFirst: currentIndex === 0,
    isLast: currentIndex === total - 1,
  };
}

/**
 * Checks if the session is complete (at last question with completed recording)
 * @param bank - The question bank
 * @param currentIndex - Current question index
 * @param recordingCompleted - Whether recording is completed
 * @returns True if session is complete
 */
export function isSessionComplete(
  bank: QuestionBank | null,
  currentIndex: number,
  recordingCompleted: boolean
): boolean {
  if (!bank || bank.questions.length === 0) {
    return false;
  }
  return currentIndex === bank.questions.length - 1 && recordingCompleted;
}

// ============================================================================
// Answer Checking
// ============================================================================

/**
 * Checks if the selected choice is correct
 * @param bank - The question bank
 * @param currentIndex - Current question index
 * @param selectedIndex - Selected choice index (0-3)
 * @returns True if correct, false if incorrect, null if no selection
 */
export function isAnswerCorrect(
  bank: QuestionBank | null,
  currentIndex: number,
  selectedIndex: number | null
): boolean | null {
  if (selectedIndex === null) return null;

  const question = getCurrentQuestion(bank, currentIndex);
  if (!question) return null;

  return selectedIndex === question.correctIndex;
}

/**
 * Gets the correct answer text for the current question
 * @param bank - The question bank
 * @param currentIndex - Current question index
 * @returns The correct answer text, or null if no question
 */
export function getCorrectAnswer(
  bank: QuestionBank | null,
  currentIndex: number
): string | null {
  const question = getCurrentQuestion(bank, currentIndex);
  if (!question) return null;

  return question.options[question.correctIndex];
}

/**
 * Gets the expected spoken answer for scoring
 * @param bank - The question bank
 * @param currentIndex - Current question index
 * @returns The expected spoken answer, falling back to correct option
 */
export function getExpectedSpokenAnswer(
  bank: QuestionBank | null,
  currentIndex: number
): string | null {
  const question = getCurrentQuestion(bank, currentIndex);
  if (!question) return null;

  return question.expectedSpokenAnswer || question.options[question.correctIndex];
}

export default {
  validateQuestionBank,
  getCurrentQuestion,
  getQuestionById,
  getQuestionIndexById,
  hasNextQuestion,
  hasPreviousQuestion,
  getNextQuestionIndex,
  getPreviousQuestionIndex,
  getSessionProgress,
  isSessionComplete,
  isAnswerCorrect,
  getCorrectAnswer,
  getExpectedSpokenAnswer,
};
