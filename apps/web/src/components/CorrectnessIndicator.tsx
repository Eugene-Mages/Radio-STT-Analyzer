/**
 * CorrectnessIndicator Component
 *
 * Shows whether the selected answer was correct or incorrect,
 * and displays the correct option text.
 * Following style guide: Success/Error colors, feedback animations.
 */

import clsx from "clsx";

export interface CorrectnessIndicatorProps {
  /** Whether the answer was correct */
  isCorrect: boolean;
  /** The text of the correct option */
  correctOptionText: string;
  /** The letter of the correct option (A, B, C, D) */
  correctOptionLetter?: string;
  /** Optional additional CSS classes */
  className?: string;
}

export function CorrectnessIndicator({
  isCorrect,
  correctOptionText,
  correctOptionLetter,
  className,
}: CorrectnessIndicatorProps) {
  return (
    <div
      className={clsx(
        "rounded-card p-4",
        "border",
        // Animate entrance
        "animate-fade-in",
        {
          // Correct styling
          "bg-green-success/10 border-green-success/30": isCorrect,
          // Incorrect styling
          "bg-red-critical/10 border-red-critical/30": !isCorrect,
        },
        className
      )}
    >
      {/* Status Header */}
      <div className="mb-3 flex items-center gap-3">
        {isCorrect ? (
          <>
            {/* Checkmark icon */}
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-success">
              <svg
                className="h-5 w-5 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={3}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <span className="text-heading-3 font-semibold text-green-light">Correct!</span>
          </>
        ) : (
          <>
            {/* X icon */}
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-critical">
              <svg
                className="h-5 w-5 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={3}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <span className="text-heading-3 font-semibold text-red-light">Incorrect</span>
          </>
        )}
      </div>

      {/* Correct Answer Display (always shown) */}
      <div className="rounded-button bg-slate-800/50 p-3">
        <p className="mb-1 text-caption uppercase tracking-wide text-slate-400">
          Correct Answer
        </p>
        <div className="flex items-start gap-3">
          {correctOptionLetter && (
            <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded bg-green-success/20 text-body-s font-bold text-green-light">
              {correctOptionLetter}
            </span>
          )}
          <p className="rt-phrase text-body-m text-slate-200">{correctOptionText}</p>
        </div>
      </div>
    </div>
  );
}

export default CorrectnessIndicator;
