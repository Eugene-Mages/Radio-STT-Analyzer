/**
 * NextQuestionButton Component
 *
 * Simple button to advance to the next question.
 * Following style guide: Button_Primary pattern, disabled state handling.
 */

import clsx from "clsx";

export interface NextQuestionButtonProps {
  /** Callback when button is clicked */
  onClick: () => void;
  /** Whether button is disabled (e.g., scoring not complete) */
  disabled?: boolean;
  /** Whether this is the last question (changes label) */
  isLastQuestion?: boolean;
  /** Optional additional CSS classes */
  className?: string;
}

export function NextQuestionButton({
  onClick,
  disabled = false,
  isLastQuestion = false,
  className,
}: NextQuestionButtonProps) {
  const label = isLastQuestion ? "Finish" : "Next Question";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        // Base button styling
        "flex items-center justify-center gap-2 rounded-card px-6 py-3",
        "text-body-m font-semibold transition-all duration-state",
        // Focus state
        "focus:outline-none focus:ring-2 focus:ring-cyan-info focus:ring-offset-2 focus:ring-offset-slate-900",
        {
          // Enabled state - Primary button (Cyan)
          "bg-cyan-info text-slate-900 hover:bg-cyan-light active:opacity-90":
            !disabled,
          // Hover scale
          "hover:scale-[1.02]": !disabled,
          // Disabled state
          "cursor-not-allowed bg-slate-600 text-slate-400": disabled,
        },
        className
      )}
    >
      <span>{label}</span>
      {/* Arrow icon */}
      <svg
        className={clsx("h-5 w-5", disabled && "opacity-50")}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M13 7l5 5m0 0l-5 5m5-5H6"
        />
      </svg>
    </button>
  );
}

export default NextQuestionButton;
