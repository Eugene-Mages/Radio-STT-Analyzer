/**
 * ProviderPanel Component
 *
 * Single provider display showing status, real-time transcript, final results,
 * score breakdown, and cost estimate.
 * Following style guide: Card backgrounds, status colors, monospace transcripts.
 */

import clsx from "clsx";
import type { ProviderResult, ProviderStatus } from "@rsta/shared";
import { ScoreBreakdown } from "./ScoreBreakdown";

export interface ProviderPanelProps {
  /** Provider identifier */
  providerId: "openai" | "elevenlabs";
  /** Provider result data (null if not yet available) */
  result: ProviderResult | null;
  /** Whether currently recording */
  isRecording: boolean;
  /** Optional additional CSS classes */
  className?: string;
}

function getProviderDisplayName(providerId: "openai" | "elevenlabs"): string {
  return providerId === "openai" ? "OpenAI Realtime" : "ElevenLabs";
}

function getStatusDisplay(status: ProviderStatus): {
  label: string;
  colorClass: string;
} {
  switch (status) {
    case "idle":
      return { label: "Idle", colorClass: "text-slate-400 bg-slate-700" };
    case "connecting":
      return { label: "Connecting...", colorClass: "text-amber-light bg-amber-warning/20" };
    case "listening":
      return { label: "Listening", colorClass: "text-cyan-light bg-cyan-info/20" };
    case "processing":
      return { label: "Processing...", colorClass: "text-cyan-light bg-cyan-info/20" };
    case "completed":
      return { label: "Completed", colorClass: "text-green-light bg-green-success/20" };
    case "error":
      return { label: "Error", colorClass: "text-red-light bg-red-critical/20" };
    case "timeout":
      return { label: "Timeout", colorClass: "text-red-light bg-red-critical/20" };
    default:
      return { label: "Unknown", colorClass: "text-slate-400 bg-slate-700" };
  }
}

function formatCost(amount: number, currency: string): string {
  if (currency === "USD") {
    return `$${amount.toFixed(4)}`;
  }
  return `${amount.toFixed(4)} ${currency}`;
}

export function ProviderPanel({
  providerId,
  result,
  isRecording,
  className,
}: ProviderPanelProps) {
  const status = result?.status ?? "idle";
  const statusDisplay = getStatusDisplay(status);

  // Determine which transcript to show
  const interimText = result?.transcript?.interimText ?? "";
  const finalText = result?.transcript?.finalText ?? "";
  const displayTranscript = finalText || interimText;

  return (
    <div
      className={clsx(
        "flex flex-col rounded-card bg-slate-800 p-5",
        "shadow-elevation-1",
        className
      )}
    >
      {/* Header: Provider name + Status */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-heading-3 font-semibold text-slate-200">
          {getProviderDisplayName(providerId)}
        </h3>
        <span
          className={clsx(
            "rounded-button px-3 py-1 text-body-s font-medium",
            statusDisplay.colorClass
          )}
        >
          {statusDisplay.label}
        </span>
      </div>

      {/* Divider */}
      <div className="mb-4 h-px bg-slate-600" />

      {/* Real-time Transcript Area */}
      <div className="mb-4">
        <h4 className="mb-2 text-body-s font-medium text-slate-400">
          {status === "completed" ? "Final Transcript" : "Live Transcript"}
        </h4>
        <div
          className={clsx(
            "min-h-[80px] rounded-button bg-slate-700 p-4",
            "border border-slate-600"
          )}
        >
          {displayTranscript ? (
            <p className="rt-phrase text-body-m leading-relaxed text-slate-200">
              "{displayTranscript}"
            </p>
          ) : (
            <p className="rt-phrase text-body-m italic text-slate-500">
              {isRecording ? "Listening..." : "Waiting for input..."}
            </p>
          )}
        </div>
      </div>

      {/* Score Breakdown (only after completed) */}
      {result && status === "completed" && result.metrics && (
        <div className="mb-4">
          <ScoreBreakdown
            clarity={result.metrics.clarity}
            pace={result.metrics.pace}
            structure={result.metrics.structure}
            overall={result.metrics.overall}
            breakdown={result.breakdown ?? undefined}
            compact
          />
        </div>
      )}

      {/* Cost Display (only after completed) */}
      {result && status === "completed" && result.cost && (
        <div className="mt-auto flex items-center justify-between border-t border-slate-600 pt-4">
          <span className="text-body-s text-slate-400">Estimated Cost</span>
          <span className="font-mono text-body-s font-medium text-slate-200 tabular-nums">
            {formatCost(result.cost.amount, result.cost.currency)}
          </span>
        </div>
      )}

      {/* Error Display */}
      {result && result.errors && result.errors.length > 0 && (
        <div className="mt-4 rounded-button bg-red-critical/10 p-3 border border-red-critical/30">
          <p className="text-body-s text-red-light">
            {result.errors.join(", ")}
          </p>
        </div>
      )}
    </div>
  );
}

export default ProviderPanel;
