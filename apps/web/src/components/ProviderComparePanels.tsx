/**
 * ProviderComparePanels Component
 *
 * Container for side-by-side comparison of OpenAI and ElevenLabs results.
 * Following style guide: Two-column layout pattern.
 */

import clsx from "clsx";
import type { ProviderResult } from "@rsta/shared";
import { ProviderPanel } from "./ProviderPanel";

export interface ProviderComparePanelsProps {
  /** OpenAI provider result */
  openaiResult: ProviderResult | null;
  /** ElevenLabs provider result */
  elevenlabsResult: ProviderResult | null;
  /** Whether currently recording */
  isRecording: boolean;
  /** Optional additional CSS classes */
  className?: string;
}

export function ProviderComparePanels({
  openaiResult,
  elevenlabsResult,
  isRecording,
  className,
}: ProviderComparePanelsProps) {
  return (
    <div
      className={clsx(
        // Two-column grid layout
        "grid gap-4 md:grid-cols-2",
        className
      )}
    >
      {/* OpenAI Panel (Left) */}
      <ProviderPanel
        providerId="openai"
        result={openaiResult}
        isRecording={isRecording}
      />

      {/* ElevenLabs Panel (Right) */}
      <ProviderPanel
        providerId="elevenlabs"
        result={elevenlabsResult}
        isRecording={isRecording}
      />
    </div>
  );
}

export default ProviderComparePanels;
