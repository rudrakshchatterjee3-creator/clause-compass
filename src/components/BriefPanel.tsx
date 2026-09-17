"use client";

import { useState } from "react";
import type { Brief } from "@/lib/schemas";
import type { ApiErrorInfo } from "@/components/askTypes";
import { LoadingState } from "@/components/LoadingState";
import { ErrorState } from "@/components/ErrorState";
import { CompassIcon } from "@/components/icons/CompassIcon";
import { formatBriefAsMarkdown, formatBriefAsPlainText } from "@/lib/brief/formatBrief";

const BRIEF_STAGES = ["Reviewing the risks…", "Drafting questions for a lawyer…"];

const SECTIONS: { key: keyof Brief; heading: string }[] = [
  { key: "keyRisks", heading: "Key risks" },
  { key: "questionsForLawyer", heading: "Questions for your lawyer" },
  { key: "documentsToGather", heading: "Documents to gather" },
  { key: "deadlines", heading: "Deadlines" },
];

interface BriefPanelProps {
  status: "idle" | "loading" | "success" | "error";
  brief: Brief | null;
  generatedAt: string | null;
  docTitle: string;
  disclaimer: string;
  error: ApiErrorInfo | null;
  onGenerate: () => void;
  onRetry: () => void;
}

export function BriefPanel({
  status,
  brief,
  generatedAt,
  docTitle,
  disclaimer,
  error,
  onGenerate,
  onRetry,
}: BriefPanelProps) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [copyLabel, setCopyLabel] = useState("Copy as text");

  if (status === "loading") {
    return <LoadingState stages={BRIEF_STAGES} />;
  }

  if (status === "error") {
    return (
      <ErrorState message={error?.message ?? "Something went wrong."} onRetry={onRetry} onStartOver={onRetry} />
    );
  }

  if (status !== "success" || !brief || !generatedAt) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line bg-paper-raised px-6 py-14 text-center">
        <CompassIcon className="h-8 w-8 text-brass" />
        <p className="font-display text-lg font-medium text-ink">Prepare for a lawyer</p>
        <p className="max-w-sm text-sm text-ink-soft">
          Generate a one-page brief: key risks, questions to ask, documents to gather, and any
          deadlines — ready to print or share.
        </p>
        <button
          type="button"
          onClick={onGenerate}
          className="mt-2 rounded-full bg-harbor px-5 py-2 text-sm font-medium text-paper-raised transition-colors hover:bg-harbor/90"
        >
          Generate brief
        </button>
      </div>
    );
  }

  const formatParams = { docTitle, brief, generatedAt, disclaimer };
  const generatedDate = new Date(generatedAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(formatBriefAsPlainText(formatParams));
      setCopyLabel("Copied!");
      setTimeout(() => setCopyLabel("Copy as text"), 2000);
    } catch {
      setCopyLabel("Couldn't copy");
      setTimeout(() => setCopyLabel("Copy as text"), 2000);
    }
  }

  function handleDownload() {
    const blob = new Blob([formatBriefAsMarkdown(formatParams)], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "lawyer-prep-brief.md";
    link.click();
    URL.revokeObjectURL(url);
  }

  function toggleChecked(id: string) {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <div>
      <div className="no-print mb-4 flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={handleCopy}
          className="rounded-full border border-line bg-paper-raised px-4 py-1.5 text-sm font-medium text-ink transition-colors hover:border-harbor"
        >
          {copyLabel}
        </button>
        <button
          type="button"
          onClick={handleDownload}
          className="rounded-full border border-line bg-paper-raised px-4 py-1.5 text-sm font-medium text-ink transition-colors hover:border-harbor"
        >
          Download .md
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-full bg-harbor px-4 py-1.5 text-sm font-medium text-paper-raised transition-colors hover:bg-harbor/90"
        >
          Print / Save PDF
        </button>
      </div>

      <div className="printable-brief rounded-2xl border border-line bg-paper-raised p-6">
        <h2 className="font-display text-xl font-semibold text-ink">
          Lawyer-Prep Brief: {docTitle}
        </h2>
        <p className="mt-1 text-xs text-ink-soft">Generated {generatedDate}</p>

        {SECTIONS.map((section) => (
          <div key={section.key} className="mt-5 border-t border-line pt-4 first:border-t-0 first:pt-0">
            <h3 className="font-display text-sm font-semibold uppercase tracking-wide text-ink-soft">
              {section.heading}
            </h3>
            <ul className="mt-2 space-y-1.5">
              {brief[section.key].map((item, index) => {
                const id = `${section.key}-${index}`;
                return (
                  <li key={id} className="flex items-start gap-2 text-sm text-ink">
                    <input
                      type="checkbox"
                      id={id}
                      checked={Boolean(checked[id])}
                      onChange={() => toggleChecked(id)}
                      className="no-print mt-0.5 h-4 w-4 shrink-0 rounded border-line accent-harbor"
                    />
                    <label
                      htmlFor={id}
                      className={checked[id] ? "text-ink-soft line-through" : undefined}
                    >
                      {item}
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}

        <p className="mt-6 border-t border-line pt-4 text-xs text-ink-soft">{disclaimer}</p>
      </div>
    </div>
  );
}
