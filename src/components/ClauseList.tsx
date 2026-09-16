"use client";

import { useEffect, useMemo, useRef } from "react";
import type { Clause, ClauseType, RiskLevel } from "@/lib/schemas";
import { ClauseCard } from "@/components/ClauseCard";
import { CLAUSE_TYPE_LABELS } from "@/components/clauseTypeLabels";

const RISK_FILTERS: { id: RiskLevel | "all"; label: string }[] = [
  { id: "all", label: "All risk" },
  { id: "high", label: "High" },
  { id: "medium", label: "Medium" },
  { id: "low", label: "Low" },
];

interface ClauseListProps {
  clauses: Clause[];
  selectedClauseId: string | null;
  onSelect: (id: string) => void;
  riskFilter: RiskLevel | "all";
  typeFilter: ClauseType | "all";
  onRiskFilterChange: (value: RiskLevel | "all") => void;
  onTypeFilterChange: (value: ClauseType | "all") => void;
}

export function ClauseList({
  clauses,
  selectedClauseId,
  onSelect,
  riskFilter,
  typeFilter,
  onRiskFilterChange,
  onTypeFilterChange,
}: ClauseListProps) {
  const listRef = useRef<HTMLUListElement>(null);

  const typesPresent = useMemo(
    () => Array.from(new Set(clauses.map((clause) => clause.type))),
    [clauses],
  );

  const filtered = useMemo(
    () =>
      clauses.filter(
        (clause) =>
          (riskFilter === "all" || clause.risk.level === riskFilter) &&
          (typeFilter === "all" || clause.type === typeFilter),
      ),
    [clauses, riskFilter, typeFilter],
  );

  useEffect(() => {
    if (!selectedClauseId || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(`#clause-card-${selectedClauseId}`);
    el?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      block: "nearest",
    });
  }, [selectedClauseId]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-3 border-b border-line pb-3">
        <fieldset className="flex flex-wrap items-center gap-1.5">
          <legend className="sr-only">Filter by risk</legend>
          {RISK_FILTERS.map((option) => (
            <button
              key={option.id}
              type="button"
              aria-pressed={riskFilter === option.id}
              onClick={() => onRiskFilterChange(option.id)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                riskFilter === option.id
                  ? "bg-harbor text-paper-raised"
                  : "bg-paper text-ink-soft hover:text-ink"
              }`}
            >
              {option.label}
            </button>
          ))}
        </fieldset>

        <label className="ml-auto flex items-center gap-2 text-xs text-ink-soft">
          Type
          <select
            value={typeFilter}
            onChange={(event) => onTypeFilterChange(event.target.value as ClauseType | "all")}
            className="rounded-md border border-line bg-paper-raised px-2 py-1 text-xs text-ink"
          >
            <option value="all">All types</option>
            {typesPresent.map((type) => (
              <option key={type} value={type}>
                {CLAUSE_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </label>
      </div>

      {filtered.length === 0 ? (
        <p className="py-10 text-center text-sm text-ink-soft">
          No clauses match these filters.
        </p>
      ) : (
        <ul ref={listRef} className="mt-3 flex-1 space-y-2.5 overflow-y-auto pr-1 lg:max-h-[65vh]">
          {filtered.map((clause) => (
            <ClauseCard
              key={clause.id}
              clause={clause}
              isSelected={clause.id === selectedClauseId}
              onSelect={onSelect}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
