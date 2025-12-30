/**
 * BankLoader Component
 *
 * UI for loading question banks via JSON paste or file upload.
 * Following style guide: Input_Text pattern, card layout, validation feedback.
 */

import { useState, useRef, useCallback } from "react";
import clsx from "clsx";
import type { QuestionBank } from "@rsta/shared";

export interface BankLoaderProps {
  /** Callback when a valid bank is loaded */
  onBankLoaded: (bank: QuestionBank) => void;
  /** Optional additional CSS classes */
  className?: string;
}

interface ValidationState {
  status: "idle" | "valid" | "error";
  message?: string;
}

function validateQuestionBank(data: unknown): QuestionBank {
  if (!data || typeof data !== "object") {
    throw new Error("Invalid JSON: Expected an object");
  }

  const obj = data as Record<string, unknown>;

  if (typeof obj.name !== "string" || !obj.name) {
    throw new Error("Missing or invalid 'name' field");
  }

  if (typeof obj.version !== "string" || !obj.version) {
    throw new Error("Missing or invalid 'version' field");
  }

  if (!Array.isArray(obj.questions) || obj.questions.length === 0) {
    throw new Error("Missing or empty 'questions' array");
  }

  // Validate each question
  for (let i = 0; i < obj.questions.length; i++) {
    const q = obj.questions[i] as Record<string, unknown>;

    if (typeof q.id !== "string") {
      throw new Error(`Question ${i + 1}: Missing 'id'`);
    }

    if (typeof q.prompt !== "string") {
      throw new Error(`Question ${i + 1}: Missing 'prompt'`);
    }

    if (!Array.isArray(q.options) || q.options.length !== 4) {
      throw new Error(`Question ${i + 1}: 'options' must be an array of 4 strings`);
    }

    if (typeof q.correctIndex !== "number" || q.correctIndex < 0 || q.correctIndex > 3) {
      throw new Error(`Question ${i + 1}: 'correctIndex' must be 0, 1, 2, or 3`);
    }
  }

  return obj as unknown as QuestionBank;
}

export function BankLoader({ onBankLoaded, className }: BankLoaderProps) {
  const [jsonText, setJsonText] = useState("");
  const [validation, setValidation] = useState<ValidationState>({ status: "idle" });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleValidate = useCallback(() => {
    if (!jsonText.trim()) {
      setValidation({ status: "error", message: "Please paste JSON content" });
      return;
    }

    try {
      const parsed = JSON.parse(jsonText);
      const bank = validateQuestionBank(parsed);
      setValidation({
        status: "valid",
        message: `Valid bank: "${bank.name}" with ${bank.questions.length} questions`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Invalid JSON format";
      setValidation({ status: "error", message });
    }
  }, [jsonText]);

  const handleLoad = useCallback(() => {
    try {
      const parsed = JSON.parse(jsonText);
      const bank = validateQuestionBank(parsed);
      onBankLoaded(bank);
      setValidation({
        status: "valid",
        message: "Bank loaded successfully!",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load bank";
      setValidation({ status: "error", message });
    }
  }, [jsonText, onBankLoaded]);

  const handleFileUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setJsonText(content);

        // Auto-validate on file load
        try {
          const parsed = JSON.parse(content);
          const bank = validateQuestionBank(parsed);
          setValidation({
            status: "valid",
            message: `Valid bank: "${bank.name}" with ${bank.questions.length} questions`,
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Invalid JSON format";
          setValidation({ status: "error", message });
        }
      };
      reader.onerror = () => {
        setValidation({ status: "error", message: "Failed to read file" });
      };
      reader.readAsText(file);

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    []
  );

  const handleBrowseClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <div
      className={clsx(
        "rounded-card bg-slate-800 p-6",
        "shadow-elevation-1",
        className
      )}
    >
      {/* Header */}
      <h2 className="mb-4 text-heading-3 font-semibold text-slate-200">
        Load Question Bank
      </h2>

      {/* Divider */}
      <div className="mb-4 h-px bg-slate-600" />

      {/* File Upload Option */}
      <div className="mb-4">
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          onChange={handleFileUpload}
          className="hidden"
        />
        <button
          type="button"
          onClick={handleBrowseClick}
          className={clsx(
            "flex w-full items-center justify-center gap-2 rounded-button border-2 border-dashed border-slate-600 p-4",
            "text-slate-400 transition-colors duration-state",
            "hover:border-slate-500 hover:bg-slate-700 hover:text-slate-200"
          )}
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          <span>Upload JSON file</span>
        </button>
      </div>

      {/* Or divider */}
      <div className="mb-4 flex items-center gap-4">
        <div className="flex-1 h-px bg-slate-600" />
        <span className="text-body-s text-slate-500">or paste JSON</span>
        <div className="flex-1 h-px bg-slate-600" />
      </div>

      {/* JSON Textarea */}
      <textarea
        value={jsonText}
        onChange={(e) => setJsonText(e.target.value)}
        placeholder='{ "name": "My Bank", "version": "1.0", "questions": [...] }'
        className={clsx(
          "mb-4 w-full rounded-input border bg-slate-700 p-4",
          "font-mono text-mono-m text-slate-200",
          "placeholder:text-slate-500",
          "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900",
          "resize-y min-h-[160px]",
          {
            "border-slate-600 focus:ring-cyan-info": validation.status !== "error",
            "border-red-critical focus:ring-red-critical": validation.status === "error",
          }
        )}
      />

      {/* Validation Feedback */}
      {validation.status !== "idle" && (
        <div
          className={clsx("mb-4 rounded-button p-3 text-body-s", {
            "bg-green-success/10 border border-green-success/30 text-green-light":
              validation.status === "valid",
            "bg-red-critical/10 border border-red-critical/30 text-red-light":
              validation.status === "error",
          })}
        >
          {validation.message}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleValidate}
          className={clsx(
            "flex-1 rounded-button border border-slate-600 px-4 py-2.5",
            "text-body-s font-medium text-slate-200",
            "transition-colors duration-state",
            "hover:bg-slate-700 hover:border-slate-500",
            "focus:outline-none focus:ring-2 focus:ring-cyan-info focus:ring-offset-2 focus:ring-offset-slate-900"
          )}
        >
          Validate
        </button>
        <button
          type="button"
          onClick={handleLoad}
          disabled={validation.status !== "valid"}
          className={clsx(
            "flex-1 rounded-button px-4 py-2.5",
            "text-body-s font-semibold transition-all duration-state",
            "focus:outline-none focus:ring-2 focus:ring-cyan-info focus:ring-offset-2 focus:ring-offset-slate-900",
            {
              "bg-cyan-info text-slate-900 hover:bg-cyan-light":
                validation.status === "valid",
              "bg-slate-600 text-slate-400 cursor-not-allowed":
                validation.status !== "valid",
            }
          )}
        >
          Load Bank
        </button>
      </div>
    </div>
  );
}

export default BankLoader;
