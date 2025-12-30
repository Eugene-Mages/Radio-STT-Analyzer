/**
 * Structure Scoring
 *
 * Calculates structure score (0-100) based on radio communication rubric.
 * Supports three structure modes:
 * - full: Complete radio transmission (receiver, sender, intent, closing)
 * - ack_short: Short acknowledgment (intent, closing)
 * - clarify_request: Clarification request (ATC, say again, closing)
 *
 * Penalties per PRD Section 7.3:
 * - Missing elements (mode-specific penalties)
 * - Order violations
 * - Wrong closing phrases
 */

import type { StructureMode, StructureBreakdown } from "@rsta/shared";
import appConfig from "../data/app_config.json";

// Get accepted receiver tokens from config
const ACCEPTED_RECEIVER_TOKENS = appConfig.acceptedReceiverTokens;

// Patterns for structure detection
const SENDER_PATTERNS = [
  /\b[a-z]+\s*\d{3,4}\b/i, // Callsign pattern like "Alpha 123" or "Bravo1234"
  /\bthis is\s+\w+/i, // "this is [callsign]"
];

const SAY_AGAIN_PATTERNS = [
  /\bsay again\b/i,
  /\bsay that again\b/i,
  /\brepeat\b/i,
  /\bsay one more time\b/i,
];

/**
 * Clamps a value between min and max
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Checks if text contains a receiver callsign
 */
function hasReceiver(text: string): boolean {
  const normalized = text.toLowerCase();
  return ACCEPTED_RECEIVER_TOKENS.some((token) =>
    normalized.includes(token.toLowerCase())
  );
}

/**
 * Checks if text contains a sender identification
 */
function hasSender(text: string): boolean {
  return SENDER_PATTERNS.some((pattern) => pattern.test(text));
}

/**
 * Checks if text contains intent/message content
 * For simplicity, we check if there's substantial content beyond callsigns
 */
function hasIntent(text: string, expectedKeywords?: string[]): {
  present: boolean;
  found: string[];
} {
  if (!expectedKeywords || expectedKeywords.length === 0) {
    // If no expected keywords, assume intent is present if there's content
    const words = text.trim().split(/\s+/);
    return { present: words.length > 2, found: [] };
  }

  const normalizedText = text.toLowerCase();
  const found: string[] = [];

  for (const keyword of expectedKeywords) {
    if (normalizedText.includes(keyword.toLowerCase())) {
      found.push(keyword);
    }
  }

  // Intent is present if at least half of expected keywords are found
  const present = found.length >= Math.ceil(expectedKeywords.length / 2);

  return { present, found };
}

/**
 * Checks for closing phrase and returns type
 */
function getClosingInfo(text: string): {
  present: boolean;
  type: "over" | "out" | "invalid" | "none";
  count: number;
} {
  const normalized = text.toLowerCase();
  const words = normalized.split(/\s+/);

  // Look for closing at the end of the message
  let count = 0;
  let foundType: "over" | "out" | "invalid" | "none" = "none";

  // Check for "over" and "out" anywhere in text
  const hasOver = /\bover\b/i.test(text);
  const hasOut = /\bout\b/i.test(text);

  if (hasOver) count++;
  if (hasOut) count++;

  // Determine the type based on what's found at the end
  const lastFewWords = words.slice(-3);
  const hasOverAtEnd = lastFewWords.some((w) => w === "over");
  const hasOutAtEnd = lastFewWords.some((w) => w === "out");

  if (hasOverAtEnd && hasOutAtEnd) {
    // Both at end - unusual but valid, prefer "out"
    foundType = "out";
  } else if (hasOutAtEnd) {
    foundType = "out";
  } else if (hasOverAtEnd) {
    foundType = "over";
  } else if (hasOver || hasOut) {
    // Has closing but not at end
    foundType = hasOut ? "out" : "over";
  }

  // Check for invalid closings (e.g., "over and out" together)
  if (/\bover\s+and\s+out\b/i.test(text)) {
    foundType = "invalid";
  }

  return {
    present: foundType !== "none",
    type: foundType,
    count,
  };
}

/**
 * Gets position indices for order checking
 */
function getElementPositions(text: string): {
  receiverPos: number;
  senderPos: number;
  closingPos: number;
} {
  const normalized = text.toLowerCase();

  // Find receiver position
  let receiverPos = -1;
  for (const token of ACCEPTED_RECEIVER_TOKENS) {
    const pos = normalized.indexOf(token.toLowerCase());
    if (pos !== -1 && (receiverPos === -1 || pos < receiverPos)) {
      receiverPos = pos;
    }
  }

  // Find sender position (look for callsign pattern)
  let senderPos = -1;
  for (const pattern of SENDER_PATTERNS) {
    const match = text.match(pattern);
    if (match && match.index !== undefined) {
      if (senderPos === -1 || match.index < senderPos) {
        senderPos = match.index;
      }
    }
  }

  // Find closing position
  let closingPos = -1;
  const overMatch = normalized.match(/\bover\b/);
  const outMatch = normalized.match(/\bout\b/);
  if (overMatch?.index !== undefined) closingPos = overMatch.index;
  if (outMatch?.index !== undefined) {
    if (closingPos === -1 || outMatch.index > closingPos) {
      closingPos = outMatch.index;
    }
  }

  return { receiverPos, senderPos, closingPos };
}

/**
 * Calculates structure score based on mode-specific rubric
 * @param transcript - The spoken transcript to analyze
 * @param mode - Structure mode: "full" | "ack_short" | "clarify_request"
 * @param expectedKeywords - Optional keywords expected in the message
 * @returns Object containing score (0-100) and detailed breakdown
 */
export function calculateStructure(
  transcript: string,
  mode: StructureMode,
  expectedKeywords?: string[]
): { score: number; breakdown: StructureBreakdown } {
  const violations: string[] = [];
  let totalPenalty = 0;

  // Detect elements
  const receiverPresent = hasReceiver(transcript);
  const senderPresent = hasSender(transcript);
  const intentResult = hasIntent(transcript, expectedKeywords);
  const closingInfo = getClosingInfo(transcript);
  const positions = getElementPositions(transcript);

  // Mode-specific penalties (PRD Section 7.3)
  switch (mode) {
    case "full":
      // Full mode: receiver -20, sender -20, intent -30, closing -20
      if (!receiverPresent) {
        totalPenalty += 20;
        violations.push("Missing receiver callsign");
      }
      if (!senderPresent) {
        totalPenalty += 20;
        violations.push("Missing sender identification");
      }
      if (!intentResult.present) {
        totalPenalty += 30;
        violations.push("Missing or incomplete intent/message");
      }
      if (!closingInfo.present) {
        totalPenalty += 20;
        violations.push("Missing closing phrase");
      }
      break;

    case "ack_short":
      // Ack short mode: intent -50, closing -50
      if (!intentResult.present) {
        totalPenalty += 50;
        violations.push("Missing acknowledgment intent");
      }
      if (!closingInfo.present) {
        totalPenalty += 50;
        violations.push("Missing closing phrase");
      }
      break;

    case "clarify_request":
      // Clarify request mode: ATC -30, say again -40, closing -30
      if (!receiverPresent) {
        totalPenalty += 30;
        violations.push("Missing ATC/receiver callsign");
      }

      // Check for "say again" phrase
      const hasSayAgain = SAY_AGAIN_PATTERNS.some((pattern) =>
        pattern.test(transcript)
      );
      if (!hasSayAgain) {
        totalPenalty += 40;
        violations.push("Missing 'say again' request");
      }

      if (!closingInfo.present) {
        totalPenalty += 30;
        violations.push("Missing closing phrase");
      }
      break;
  }

  // Order penalties (applicable to full mode)
  let orderCorrect = true;

  if (mode === "full" && receiverPresent && senderPresent) {
    // Receiver should come before sender
    if (
      positions.receiverPos !== -1 &&
      positions.senderPos !== -1 &&
      positions.senderPos < positions.receiverPos
    ) {
      totalPenalty += 10;
      violations.push("Receiver should come before sender");
      orderCorrect = false;
    }
  }

  // Closing should be at the end
  if (closingInfo.present && positions.closingPos !== -1) {
    const textLength = transcript.length;
    const closingEndPos = positions.closingPos + 10; // Approximate length of closing

    if (closingEndPos < textLength - 5) {
      // If there's significant content after closing
      const afterClosing = transcript.slice(positions.closingPos + 4).trim();
      if (afterClosing.length > 5 && !/^[.\s]*$/.test(afterClosing)) {
        totalPenalty += 10;
        violations.push("Closing phrase should be at the end");
        orderCorrect = false;
      }
    }
  }

  // Phrase penalties
  if (closingInfo.type === "invalid") {
    totalPenalty += 10;
    violations.push("Invalid closing phrase (e.g., 'over and out')");
  }

  if (closingInfo.count > 1) {
    totalPenalty += 5;
    violations.push("Multiple closing phrases detected");
  }

  // Calculate final score
  const rawScore = 100 - totalPenalty;
  const score = Math.round(clamp(rawScore, 0, 100));

  return {
    score,
    breakdown: {
      mode,
      receiverPresent,
      senderPresent,
      intentPresent: intentResult.present,
      closingPresent: closingInfo.present,
      closingType: closingInfo.type,
      orderCorrect,
      violations,
      keywordsFound: intentResult.found,
      keywordsExpected: expectedKeywords || [],
    },
  };
}
