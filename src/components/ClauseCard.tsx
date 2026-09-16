import type { Clause } from "@/lib/schemas";
import { RiskBadge } from "@/components/RiskBadge";
import { NotVerifiedBadge } from "@/components/NotVerifiedBadge";
import { CLAUSE_TYPE_LABELS } from "@/components/clauseTypeLabels";

interface ClauseCardProps {
  clause: Clause;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

export function ClauseCard({ clause, isSelected, onSelect }: ClauseCardProps) {
  return (
    <li>
      <button
        type="button"
        id={`clause-card-${clause.id}`}
        onClick={() => onSelect(clause.id)}
        aria-current={isSelected}
        className={`w-full rounded-xl border p-4 text-left transition-colors ${
          isSelected
            ? "border-harbor bg-harbor-soft"
            : "border-line bg-paper-raised hover:border-harbor/60"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">
              {CLAUSE_TYPE_LABELS[clause.type]}
            </p>
            <h3 className="mt-0.5 font-display text-base font-semibold text-ink">
              {clause.title}
            </h3>
          </div>
        </div>

        <p className="mt-2 text-sm leading-relaxed text-ink">{clause.plainEnglish}</p>

        <div className="mt-3 flex flex-wrap gap-2">
          <RiskBadge level={clause.risk.level} />
          {!clause.verified && <NotVerifiedBadge />}
        </div>
      </button>
    </li>
  );
}
