"use client";

import { useEffect, useMemo, useRef } from "react";

export interface HighlightSpan {
  id: string;
  start?: number;
  end?: number;
  verified: boolean;
}

interface Segment {
  text: string;
  spanId?: string;
}

function buildSegments(text: string, spans: HighlightSpan[]): Segment[] {
  const located = spans
    .filter(
      (span): span is HighlightSpan & { start: number; end: number } =>
        span.verified && span.start !== undefined && span.end !== undefined,
    )
    .sort((a, b) => a.start - b.start);

  const segments: Segment[] = [];
  let cursor = 0;

  for (const span of located) {
    const start = Math.max(span.start, cursor);
    const end = span.end;
    if (end <= start) continue;
    if (start > cursor) segments.push({ text: text.slice(cursor, start) });
    segments.push({ text: text.slice(start, end), spanId: span.id });
    cursor = end;
  }

  if (cursor < text.length) segments.push({ text: text.slice(cursor) });

  return segments;
}

interface DocumentPaneProps {
  text: string;
  spans: HighlightSpan[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function DocumentPane({ text, spans, selectedId, onSelect }: DocumentPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const segments = useMemo(() => buildSegments(text, spans), [text, spans]);

  useEffect(() => {
    if (!selectedId || !containerRef.current) return;
    const el = containerRef.current.querySelector<HTMLElement>(`[data-span-id="${selectedId}"]`);
    el?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      block: "center",
    });
  }, [selectedId]);

  return (
    <div
      ref={containerRef}
      className="max-h-[70vh] overflow-y-auto rounded-xl border border-line bg-paper-raised p-5 font-mono text-sm leading-relaxed whitespace-pre-wrap break-words text-ink"
    >
      {segments.map((segment, index) =>
        segment.spanId ? (
          <mark
            key={index}
            data-quote-span="true"
            data-span-id={segment.spanId}
            data-selected={segment.spanId === selectedId}
            tabIndex={0}
            role="button"
            aria-pressed={segment.spanId === selectedId}
            onClick={() => onSelect(segment.spanId as string)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelect(segment.spanId as string);
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
