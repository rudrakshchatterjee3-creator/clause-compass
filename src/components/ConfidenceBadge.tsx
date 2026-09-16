import type { Confidence } from "@/lib/schemas";

const CONFIDENCE_LABEL: Record<Confidence, string> = {
  low: "Low confidence",
  medium: "Medium confidence",
  high: "High confidence",
};

const CONFIDENCE_STYLES: Record<Confidence, string> = {
  low: "border-line text-ink-soft",
  medium: "border-brass/50 text-brass",
  high: "border-harbor/50 text-harbor",
};

interface ConfidenceBadgeProps {
  level: Confidence;
}

export function ConfidenceBadge({ level }: ConfidenceBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${CONFIDENCE_STYLES[level]}`}
    >
      {CONFIDENCE_LABEL[level]}
    </span>
  );
}
