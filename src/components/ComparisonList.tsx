import { useMemo } from "react";
import type { Comparison, ComparisonStatus } from "@/lib/schemas";
import { ComparisonItemCard } from "@/components/ComparisonItemCard";

const GROUP_ORDER: { status: ComparisonStatus; heading: string }[] = [
  { status: "changed", heading: "Changed" },
  { status: "added", heading: "Added" },
  { status: "removed", heading: "Removed" },
  { status: "same", heading: "Same" },
];

interface ComparisonListProps {
  comparison: Comparison;
  docALabel: string;
  docBLabel: string;
  onlyChanges: boolean;
  onToggleOnlyChanges: () => void;
}

export function ComparisonList({
  comparison,
  docALabel,
  docBLabel,
  onlyChanges,
  onToggleOnlyChanges,
}: ComparisonListProps) {
  const groups = useMemo(() => {
    return GROUP_ORDER.map(({ status, heading }) => ({
      status,
      heading,
      items: comparison.items.filter((item) => item.status === status),
    })).filter((group) => group.items.length > 0 && (!onlyChanges || group.status !== "same"));
  }, [comparison.items, onlyChanges]);

  return (
    <div>
      <div className="flex items-center justify-between gap-3 border-b border-line pb-3">
        <p className="text-sm leading-relaxed text-ink-soft">{comparison.summary}</p>
      </div>

      <label className="mt-3 flex items-center gap-2 text-sm text-ink">
        <input
          type="checkbox"
          checked={onlyChanges}
          onChange={onToggleOnlyChanges}
          className="h-4 w-4 rounded border-line accent-harbor"
        />
        Only show changes
      </label>

      {groups.length === 0 ? (
        <p className="py-10 text-center text-sm text-ink-soft">
          {onlyChanges ? "No changes to show." : "No topics found to compare."}
        </p>
      ) : (
        <div className="mt-4 space-y-6">
          {groups.map((group) => (
            <section key={group.status}>
              <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-ink-soft">
                {group.heading}{" "}
                <span className="font-body font-normal normal-case text-ink-soft/70">
                  ({group.items.length})
                </span>
              </h2>
              <ul className="mt-2 space-y-2.5">
                {group.items.map((item, index) => (
                  <ComparisonItemCard
                    key={`${group.status}-${index}`}
                    item={item}
                    docALabel={docALabel}
                    docBLabel={docBLabel}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
