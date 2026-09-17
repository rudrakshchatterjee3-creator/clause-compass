"use client";

import { useRef, type ChangeEvent } from "react";
import { COMPARE_BASELINES } from "@/lib/compare/baselines";

const ACCEPT = "application/pdf,text/plain,text/markdown,.pdf,.txt,.md,.markdown";

interface ComparePickerProps {
  onPickFile: (file: File) => void;
  onPickBaseline: (baselineId: string, label: string) => void;
}

export function ComparePicker({ onPickFile, onPickBaseline }: ComparePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) onPickFile(file);
    event.target.value = "";
  }

  return (
    <div className="rounded-2xl border border-line bg-paper-raised p-6 text-center">
      <p className="font-display text-lg font-medium text-ink">Compare this document</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-ink-soft">
        Upload a second document, or compare against a fair baseline template.
      </p>

      <input
        ref={inputRef}
        id="compare-file-input"
        type="file"
        accept={ACCEPT}
        aria-label="Upload a second document to compare"
        tabIndex={-1}
        onChange={handleInputChange}
        className="sr-only"
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="mt-4 inline-flex items-center rounded-full bg-harbor px-5 py-2 text-sm font-medium text-paper-raised transition-colors hover:bg-harbor/90"
      >
        Upload a second document
      </button>

      <div className="mt-5 flex flex-wrap items-center justify-center gap-2 border-t border-line pt-5">
        <span className="text-sm text-ink-soft">Or compare against:</span>
        {COMPARE_BASELINES.map((baseline) => (
          <button
            key={baseline.id}
            type="button"
            onClick={() => onPickBaseline(baseline.id, baseline.label)}
            className="rounded-full border border-line bg-paper px-3 py-1.5 text-xs font-medium text-harbor transition-colors hover:border-harbor"
          >
            {baseline.label}
          </button>
        ))}
      </div>
    </div>
  );
}
