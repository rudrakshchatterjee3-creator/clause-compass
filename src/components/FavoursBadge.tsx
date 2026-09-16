import type { Favours } from "@/lib/schemas";

interface FavoursBadgeProps {
  favours: Favours;
  docALabel: string;
  docBLabel: string;
}

export function FavoursBadge({ favours, docALabel, docBLabel }: FavoursBadgeProps) {
  if (favours === "neutral") {
    return (
      <span className="inline-flex items-center rounded-full border border-line px-2.5 py-1 text-xs font-medium text-ink-soft">
        No clear difference
      </span>
    );
  }

  const label = favours === "A" ? docALabel : docBLabel;
  const style =
    favours === "A" ? "border-harbor/50 text-harbor" : "border-brass/50 text-brass";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${style}`}
    >
      Better in {label}
    </span>
  );
}
