"use client";

import { ComparePicker } from "@/components/ComparePicker";
import { LoadingState } from "@/components/LoadingState";
import { ErrorState } from "@/components/ErrorState";
import { ComparisonList } from "@/components/ComparisonList";
import type { Comparison } from "@/lib/schemas";
import type { ApiErrorInfo } from "@/components/askTypes";

const COMPARE_STAGES = ["Reading both documents…", "Lining up matching clauses…", "Checking quotes…"];

interface ComparePanelProps {
  status: "idle" | "loading" | "success" | "error";
  comparison: Comparison | null;
  docBLabel: string | null;
  error: ApiErrorInfo | null;
  onlyChanges: boolean;
  onToggleOnlyChanges: () => void;
  onPickFile: (file: File) => void;
  onPickBaseline: (baselineId: string, label: string) => void;
  onRetry: () => void;
  onReset: () => void;
}

export function ComparePanel({
  status,
  comparison,
  docBLabel,
  error,
  onlyChanges,
  onToggleOnlyChanges,
  onPickFile,
  onPickBaseline,
  onRetry,
  onReset,
}: ComparePanelProps) {
  if (status === "loading") {
    return <LoadingState stages={COMPARE_STAGES} />;
  }

  if (status === "error") {
    return (
      <ErrorState
        message={error?.message ?? "Something went wrong."}
        onRetry={onRetry}
        onStartOver={onReset}
      />
    );
  }

  if (status === "success" && comparison && docBLabel) {
    return (
      <div>
        <div className="mb-4 flex justify-end">
          <button
            type="button"
            onClick={onReset}
            className="rounded-full border border-line bg-paper-raised px-4 py-1.5 text-sm font-medium text-ink transition-colors hover:border-harbor"
          >
            Compare with something else
          </button>
        </div>
        <ComparisonList
          comparison={comparison}
          docALabel="Your document"
          docBLabel={docBLabel}
          onlyChanges={onlyChanges}
          onToggleOnlyChanges={onToggleOnlyChanges}
        />
      </div>
    );
  }

  return <ComparePicker onPickFile={onPickFile} onPickBaseline={onPickBaseline} />;
}
