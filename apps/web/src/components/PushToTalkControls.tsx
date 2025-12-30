/**
 * PushToTalkControls Component
 *
 * Voice input controls with Talk/End buttons, recording timer, and provider status.
 * Following style guide: MicButton states, animation patterns, status indicators.
 */

import clsx from "clsx";
import type { ProviderStatus } from "@rsta/shared";

export interface ProviderStatusInfo {
  openai: ProviderStatus;
  elevenlabs: ProviderStatus;
}

export interface PushToTalkControlsProps {
  /** Callback when Talk button is pressed */
  onTalkStart: () => void;
  /** Callback when End button is pressed */
  onTalkEnd: () => void;
  /** Whether currently recording */
  isRecording: boolean;
  /** Recording duration in milliseconds */
  durationMs: number;
  /** Whether controls are disabled */
  disabled?: boolean;
  /** Provider connection statuses */
  providerStatus?: ProviderStatusInfo;
  /** Optional additional CSS classes */
  className?: string;
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function getStatusColor(status: ProviderStatus): string {
  switch (status) {
    case "idle":
      return "bg-slate-500";
    case "connecting":
      return "bg-amber-warning animate-pulse";
    case "listening":
      return "bg-cyan-info animate-pulse";
    case "processing":
      return "bg-cyan-info";
    case "completed":
      return "bg-green-success";
    case "error":
    case "timeout":
      return "bg-red-critical";
    default:
      return "bg-slate-500";
  }
}

function getStatusLabel(status: ProviderStatus): string {
  switch (status) {
    case "idle":
      return "Idle";
    case "connecting":
      return "Connecting...";
    case "listening":
      return "Listening";
    case "processing":
      return "Processing...";
    case "completed":
      return "Completed";
    case "error":
      return "Error";
    case "timeout":
      return "Timeout";
    default:
      return "Unknown";
  }
}

export function PushToTalkControls({
  onTalkStart,
  onTalkEnd,
  isRecording,
  durationMs,
  disabled = false,
  providerStatus,
  className,
}: PushToTalkControlsProps) {
  return (
    <div
      className={clsx(
        "rounded-card bg-slate-800 p-6",
        "shadow-elevation-1",
        className
      )}
    >
      {/* Recording Timer */}
      <div className="mb-6 text-center">
        <div
          className={clsx(
            "inline-flex items-center gap-2 rounded-button px-4 py-2",
            isRecording ? "bg-cyan-info/20" : "bg-slate-700"
          )}
        >
          {/* Recording indicator dot */}
          {isRecording && (
            <span className="h-3 w-3 rounded-full bg-red-critical animate-pulse" />
          )}
          <span
            className={clsx(
              "font-mono text-2xl font-bold tabular-nums",
              isRecording ? "text-cyan-light" : "text-slate-400"
            )}
          >
            {formatDuration(durationMs)}
          </span>
        </div>
      </div>

      {/* Talk / End Buttons */}
      <div className="mb-6 flex justify-center gap-4">
        {!isRecording ? (
          <button
            type="button"
            onClick={onTalkStart}
            disabled={disabled}
            className={clsx(
              "flex items-center gap-3 rounded-card px-8 py-4",
              "text-body-l font-semibold transition-all duration-state",
              "focus:outline-none focus:ring-2 focus:ring-cyan-info focus:ring-offset-2 focus:ring-offset-slate-900",
              {
                // Enabled state - Cyan primary button
                "bg-cyan-info text-slate-900 hover:bg-cyan-light active:opacity-90":
                  !disabled,
                // Disabled state
                "cursor-not-allowed bg-slate-600 text-slate-400": disabled,
              }
            )}
          >
            {/* Microphone icon */}
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
              />
            </svg>
            Talk
          </button>
        ) : (
          <button
            type="button"
            onClick={onTalkEnd}
            className={clsx(
              "flex items-center gap-3 rounded-card px-8 py-4",
              "bg-red-critical text-white",
              "text-body-l font-semibold transition-all duration-state",
              "hover:bg-red-light hover:text-slate-900 active:opacity-90",
              "focus:outline-none focus:ring-2 focus:ring-red-critical focus:ring-offset-2 focus:ring-offset-slate-900",
              // Listening animation - scale pulse
              "animate-pulse-slow"
            )}
          >
            {/* Stop icon */}
            <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="6" width="12" height="12" rx="1" />
            </svg>
            End
          </button>
        )}
      </div>

      {/* Provider Status Indicators */}
      {providerStatus && (
        <div className="flex justify-center gap-6">
          {/* OpenAI Status */}
          <div className="flex items-center gap-2">
            <span
              className={clsx(
                "h-2.5 w-2.5 rounded-full",
                getStatusColor(providerStatus.openai)
              )}
            />
            <span className="text-sm text-slate-400">
              OpenAI: {getStatusLabel(providerStatus.openai)}
            </span>
          </div>

          {/* ElevenLabs Status */}
          <div className="flex items-center gap-2">
            <span
              className={clsx(
                "h-2.5 w-2.5 rounded-full",
                getStatusColor(providerStatus.elevenlabs)
              )}
            />
            <span className="text-sm text-slate-400">
              ElevenLabs: {getStatusLabel(providerStatus.elevenlabs)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default PushToTalkControls;
