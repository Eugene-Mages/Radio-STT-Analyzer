/**
 * Main Application Component
 *
 * Radio Speech-To-Text Analyzer (RSTA)
 * Wires together all components with Zustand state management
 * and dual STT provider integration.
 */

import { useEffect, useRef, useCallback } from 'react';

// Components
import {
  QuestionPanel,
  ChoicesGrid,
  PushToTalkControls,
  ProviderPanel,
  NextQuestionButton,
  CorrectnessIndicator,
  BankLoader,
} from './components';

// State
import { useSessionStore } from './state/sessionStore';

// Hooks
import { useDualSTT } from './hooks/useDualSTT';

// Types
import type { QuestionBank } from '@rsta/shared';

// Data
import defaultQuestionBank from './data/question_bank.json';

// ============================================================================
// OPTION LETTERS
// ============================================================================

const OPTION_LETTERS = ['A', 'B', 'C', 'D'] as const;

// ============================================================================
// APP COMPONENT
// ============================================================================

function App() {
  // ---- Session State ----
  const questionBank = useSessionStore((state) => state.questionBank);
  const currentQuestionIndex = useSessionStore((state) => state.currentQuestionIndex);
  const selectedChoiceIndex = useSessionStore((state) => state.selectedChoiceIndex);
  const recordingState = useSessionStore((state) => state.recordingState);
  const recordingDurationMs = useSessionStore((state) => state.recordingDurationMs);
  const openaiResult = useSessionStore((state) => state.openaiResult);
  const elevenlabsResult = useSessionStore((state) => state.elevenlabsResult);

  // ---- Session Actions ----
  const loadBank = useSessionStore((state) => state.loadBank);
  const selectChoice = useSessionStore((state) => state.selectChoice);
  const nextQuestion = useSessionStore((state) => state.nextQuestion);
  const getCurrentQuestion = useSessionStore((state) => state.getCurrentQuestion);
  const isCorrect = useSessionStore((state) => state.isCorrect);
  const canTalk = useSessionStore((state) => state.canTalk);
  const canNext = useSessionStore((state) => state.canNext);
  const getProgress = useSessionStore((state) => state.getProgress);
  const isSessionComplete = useSessionStore((state) => state.isSessionComplete);

  // ---- Dual STT Hook ----
  const { startRecording, stopRecording, isRecording, error: sttError } = useDualSTT();

  // ---- Recording Duration Timer ----
  const durationIntervalRef = useRef<number | null>(null);
  const updateRecordingDuration = useSessionStore((state) => state.updateRecordingDuration);
  const recordingStartTime = useSessionStore((state) => state.recordingStartTime);

  useEffect(() => {
    if (recordingState === 'listening' && recordingStartTime) {
      durationIntervalRef.current = window.setInterval(() => {
        const elapsed = Date.now() - recordingStartTime;
        updateRecordingDuration(elapsed);
      }, 100);
    } else {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
    }

    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, [recordingState, recordingStartTime, updateRecordingDuration]);

  // ---- Auto-load Default Bank ----
  useEffect(() => {
    if (!questionBank) {
      loadBank(defaultQuestionBank as QuestionBank);
    }
  }, [questionBank, loadBank]);

  // ---- Computed Values ----
  const currentQuestion = getCurrentQuestion();
  const progress = getProgress();
  const correctnessResult = isCorrect();
  const talkEnabled = canTalk();
  const nextEnabled = canNext();
  const sessionComplete = isSessionComplete();
  const isLastQuestion = currentQuestionIndex === (questionBank?.questions.length ?? 1) - 1;

  // ---- Handlers ----
  const handleBankLoad = useCallback((bank: QuestionBank) => {
    loadBank(bank);
  }, [loadBank]);

  const handleChoiceSelect = useCallback((index: 0 | 1 | 2 | 3) => {
    selectChoice(index);
  }, [selectChoice]);

  const handleTalkStart = useCallback(async () => {
    await startRecording();
  }, [startRecording]);

  const handleTalkEnd = useCallback(() => {
    stopRecording();
  }, [stopRecording]);

  const handleNextQuestion = useCallback(() => {
    nextQuestion();
  }, [nextQuestion]);

  // ---- Render Loading State ----
  if (!questionBank || !currentQuestion) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-8">
        <div className="w-full max-w-lg">
          <h1 className="text-display-m font-bold text-slate-200 text-center mb-8">
            Radio Speech-To-Text Analyzer
          </h1>
          <BankLoader onBankLoaded={handleBankLoad} />
        </div>
      </div>
    );
  }

  // ---- Render Session Complete State ----
  if (sessionComplete && recordingState === 'completed') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-8">
        <div className="w-full max-w-lg text-center">
          <div className="mb-8">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-success/20 flex items-center justify-center">
              <svg className="w-10 h-10 text-green-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-display-m font-bold text-slate-200 mb-2">
              Session Complete!
            </h1>
            <p className="text-body-l text-slate-400">
              You've completed all {progress.total} questions.
            </p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="btn-primary px-8 py-3"
          >
            Start New Session
          </button>
        </div>
      </div>
    );
  }

  // ---- Main Application Render ----
  return (
    <div className="min-h-screen bg-slate-900 text-slate-200">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-800/50 px-6 py-4">
        <div className="mx-auto max-w-7xl flex items-center justify-between">
          <div>
            <h1 className="text-heading-2 font-bold text-slate-200">
              Radio Speech-To-Text Analyzer
            </h1>
            <p className="text-body-s text-slate-400 mt-1">
              RSAF Ground Radio/Telephone Training
            </p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-body-s text-slate-400">
              {questionBank.name}
            </span>
            <span className="rounded-button bg-slate-700 px-3 py-1 text-body-s font-medium text-cyan-light tabular-nums">
              {progress.current} / {progress.total}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Question + Choices */}
          <div className="lg:col-span-5 space-y-6">
            {/* Question Panel */}
            <QuestionPanel
              prompt={currentQuestion.prompt}
              currentIndex={progress.current}
              totalQuestions={progress.total}
            />

            {/* Expected Phrase (if available) */}
            {currentQuestion.expectedSpokenAnswer && (
              <div className="rounded-card bg-slate-800 p-4 border border-slate-700">
                <p className="text-caption uppercase tracking-wider text-slate-400 mb-2">
                  Expected Phrase
                </p>
                <p className="rt-phrase text-mono-m text-cyan-light">
                  "{currentQuestion.expectedSpokenAnswer}"
                </p>
              </div>
            )}

            {/* Choices Grid */}
            <div className="rounded-card bg-slate-800 p-5">
              <h3 className="text-heading-3 font-semibold text-slate-200 mb-4">
                Select Your Response
              </h3>
              <ChoicesGrid
                options={currentQuestion.options as [string, string, string, string]}
                selectedIndex={selectedChoiceIndex}
                onSelect={handleChoiceSelect}
                disabled={recordingState !== 'idle'}
              />
            </div>

            {/* Correctness Indicator (after completed) */}
            {recordingState === 'completed' && correctnessResult !== null && (
              <CorrectnessIndicator
                isCorrect={correctnessResult}
                correctOptionText={currentQuestion.options[currentQuestion.correctIndex]}
                correctOptionLetter={OPTION_LETTERS[currentQuestion.correctIndex]}
              />
            )}
          </div>

          {/* Center Column: Push-to-Talk Controls */}
          <div className="lg:col-span-2 flex items-start justify-center">
            <div className="sticky top-8 w-full">
              <PushToTalkControls
                onTalkStart={handleTalkStart}
                onTalkEnd={handleTalkEnd}
                isRecording={isRecording}
                durationMs={recordingDurationMs}
                disabled={!talkEnabled}
                providerStatus={{
                  openai: openaiResult.status,
                  elevenlabs: elevenlabsResult.status,
                }}
              />

              {/* STT Error Display */}
              {sttError && (
                <div className="mt-4 rounded-button bg-red-critical/10 border border-red-critical/30 p-3">
                  <p className="text-body-s text-red-light">{sttError}</p>
                </div>
              )}

              {/* Help Text */}
              <div className="mt-4 text-center">
                <p className="text-caption text-slate-500">
                  {!talkEnabled && recordingState === 'idle'
                    ? 'Select a choice to enable recording'
                    : recordingState === 'idle'
                    ? 'Press Talk to start recording'
                    : recordingState === 'listening'
                    ? 'Speak clearly, then press End'
                    : recordingState === 'processing'
                    ? 'Processing your response...'
                    : 'Recording complete'}
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Provider Panels */}
          <div className="lg:col-span-5 space-y-6">
            {/* Provider Comparison Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-heading-3 font-semibold text-slate-200">
                STT Comparison
              </h2>
              {recordingState === 'completed' && (
                <span className="text-caption text-slate-400">
                  Side-by-side results
                </span>
              )}
            </div>

            {/* OpenAI Panel */}
            <ProviderPanel
              providerId="openai"
              result={openaiResult}
              isRecording={isRecording}
            />

            {/* ElevenLabs Panel */}
            <ProviderPanel
              providerId="elevenlabs"
              result={elevenlabsResult}
              isRecording={isRecording}
            />

            {/* Next Question Button */}
            {recordingState === 'completed' && (
              <div className="flex justify-end pt-4">
                <NextQuestionButton
                  onClick={handleNextQuestion}
                  disabled={!nextEnabled && !sessionComplete}
                  isLastQuestion={isLastQuestion}
                />
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-700 bg-slate-800/50 px-6 py-4">
        <div className="mx-auto max-w-7xl flex items-center justify-between text-caption text-slate-500">
          <span>RSTA v1.0.0 - Radio Speech-To-Text Analyzer</span>
          <span>MAGES STUDIO</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
