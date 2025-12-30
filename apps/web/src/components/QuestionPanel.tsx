/**
 * QuestionPanel Component
 *
 * Displays the current scenario/prompt text and question progress indicator.
 * Following style guide: Slate backgrounds, Inter typography, clear hierarchy.
 */

import clsx from "clsx";

export interface QuestionPanelProps {
  /** The scenario or question prompt text */
  prompt: string;
  /** Current question number (1-indexed for display) */
  currentIndex: number;
  /** Total number of questions */
  totalQuestions: number;
  /** Optional additional CSS classes */
  className?: string;
}

export function QuestionPanel({
  prompt,
  currentIndex,
  totalQuestions,
  className,
}: QuestionPanelProps) {
  return (
    <div
      className={clsx(
        // Card styling per style guide
        "rounded-card bg-slate-800 p-6",
        // Elevation-1 shadow
        "shadow-elevation-1",
        className
      )}
    >
      {/* Header with question counter */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-heading-3 font-semibold text-slate-200">Question</h2>
        <span
          className={clsx(
            "rounded-button px-3 py-1",
            "bg-slate-700 text-body-s font-medium text-slate-400"
          )}
        >
          Question {currentIndex} / {totalQuestions}
        </span>
      </div>

      {/* Divider */}
      <div className="mb-4 h-px bg-slate-600" />

      {/* Prompt text */}
      <p className="rt-phrase text-body-l leading-relaxed text-slate-200">
        {prompt}
      </p>
    </div>
  );
}

export default QuestionPanel;
