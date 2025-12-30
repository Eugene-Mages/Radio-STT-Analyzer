/**
 * ChoicesGrid Component
 *
 * Displays 4 selectable MCQ options (A-D) with proper state styling.
 * Following style guide: Option states, Cyan selection, keyboard accessible.
 */

import clsx from "clsx";

export interface ChoicesGridProps {
  /** Array of exactly 4 option strings */
  options: [string, string, string, string];
  /** Currently selected option index (0-3), or null if none */
  selectedIndex: number | null;
  /** Callback when an option is selected */
  onSelect: (index: 0 | 1 | 2 | 3) => void;
  /** Whether selection is disabled */
  disabled?: boolean;
  /** Optional additional CSS classes */
  className?: string;
}

const OPTION_LETTERS = ["A", "B", "C", "D"] as const;

export function ChoicesGrid({
  options,
  selectedIndex,
  onSelect,
  disabled = false,
  className,
}: ChoicesGridProps) {
  return (
    <div className={clsx("grid gap-3", className)}>
      {options.map((option, index) => {
        const isSelected = selectedIndex === index;
        const optionIndex = index as 0 | 1 | 2 | 3;

        return (
          <button
            key={index}
            type="button"
            onClick={() => !disabled && onSelect(optionIndex)}
            disabled={disabled}
            className={clsx(
              // Base card styling
              "flex items-start gap-4 rounded-button p-4 text-left",
              "transition-all duration-state ease-out",
              // Focus state per accessibility guide
              "focus:outline-none focus:ring-2 focus:ring-cyan-info focus:ring-offset-2 focus:ring-offset-slate-900",
              {
                // Default state
                "border border-slate-600 bg-slate-700": !isSelected && !disabled,
                // Hover state (when not selected or disabled)
                "hover:border-slate-500 hover:bg-slate-600": !isSelected && !disabled,
                // Selected state - Cyan border with glow
                "border-2 border-cyan-info bg-slate-700 shadow-focus":
                  isSelected && !disabled,
                // Disabled state
                "cursor-not-allowed border border-slate-700 bg-slate-800 opacity-50":
                  disabled,
              }
            )}
            aria-pressed={isSelected}
            aria-disabled={disabled}
          >
            {/* Letter badge */}
            <span
              className={clsx(
                "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded",
                "text-body-s font-bold",
                "transition-colors duration-state",
                {
                  // Default badge
                  "bg-slate-600 text-slate-300": !isSelected,
                  // Selected badge - Cyan
                  "bg-cyan-info text-slate-900": isSelected && !disabled,
                }
              )}
            >
              {OPTION_LETTERS[index]}
            </span>

            {/* Option text */}
            <span
              className={clsx("text-body-m leading-relaxed", {
                "text-slate-200": !disabled,
                "text-slate-500": disabled,
              })}
            >
              {option}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default ChoicesGrid;
