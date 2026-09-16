"use client";

import { useEffect, useMemo, useRef } from "react";
import type { Clause } from "@/lib/schemas";

interface Segment {
  text: string;
  clauseId?: string;
}

function buildSegments(text: string, clauses: Clause[]): Segment[] {
  const spans = clauses
    .filter(
      (clause): clause is Clause & { start: number; end: number } =>
        clause.verified && clause.start !== undefined && clause.end !== undefined,
    )
    .sort((a, b) => a.start - b.start);

  const segments: Segment[] = [];
  let cursor = 0;

  for (const clause of spans) {
    const start = Math.max(clause.start, cursor);
    const end = clause.end;
    if (end <= start) continue;
    if (start > cursor) segments.push({ text: text.slice(cursor, start) });
    segments.push({ text: text.slice(start, end), clauseId: clause.id });
    cursor = end;
  }

  if (cursor < text.length) segments.push({ text: text.slice(cursor) });

  return segments;
}

interface DocumentPaneProps {
  text: string;
  clauses: Clause[];
  selectedClauseId: string | null;
  onSelect: (id: string) => void;
}

export function DocumentPane({ text, clauses, selectedClauseId, onSelect }: DocumentPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const segments = useMemo(() => buildSegments(text, clauses), [text, clauses]);

  useEffect(() => {
    if (!selectedClauseId || !containerRef.current) return;
    const el = containerRef.current.querySelector<HTMLElement>(
      `[data-clause-id="${selectedClauseId}"]`,
    );
    el?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      block: "center",
    });
  }, [selectedClauseId]);

  return (
    <div
      ref={containerRef}
      className="max-h-[70vh] overflow-y-auto rounded-xl border border-line bg-paper-raised p-5 font-mono text-sm leading-relaxed whitespace-pre-wrap break-words text-ink"
    >
      {segments.map((segment, index) =>
        segment.clauseId ? (
          <mark
            key={index}
            data-clause-quote="true"
            data-clause-id={segment.clauseId}
            data-selected={segment.clauseId === selectedClauseId}
            tabIndex={0}
            role="button"
            aria-pressed={segment.clauseId === selectedClauseId}
            onClick={() => onSelect(segment.clauseId as string)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelect(segment.clauseId as string);
              }
            }}
          >
            {segment.text}
          </mark>
        ) : (
          <span key={index}>{segment.text}</span>
        ),
      )}
    </div>
  );
}
