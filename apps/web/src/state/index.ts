/**
 * RSTA State Management
 *
 * Central state management using Zustand.
 * Re-exports the session store and question engine utilities.
 */

// Session store and hooks
export {
  useSessionStore,
  useCurrentQuestionIndex,
  useSelectedChoiceIndex,
  useRecordingState,
  useOpenAIResult,
  useElevenLabsResult,
  useQuestionBank,
  type SessionStore,
  type SessionState,
  type SessionActions,
  type ProviderId,
} from "./sessionStore";

// Question engine utilities
export {
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
  type ValidationResult,
  type SessionProgress,
} from "./questionEngine";
