interface SummaryCardProps {
  docTitle: string;
  parties: string[];
  summary: string;
  missingCommonClauses: string[];
}

export function SummaryCard({
  docTitle,
  parties,
  summary,
  missingCommonClauses,
}: SummaryCardProps) {
  return (
    <section
      aria-labelledby="summary-heading"
      className="rounded-2xl border border-line bg-paper-raised p-5 sm:p-6"
    >
      <h2 id="summary-heading" className="font-display text-xl font-semibold text-ink">
        {docTitle}
      </h2>

      {parties.length > 0 && (
        <p className="mt-2 text-sm text-ink-soft">
          <span className="font-medium text-ink">Parties: </span>
          {parties.join(", ")}
        </p>
      )}

      <p className="mt-3 text-sm leading-relaxed text-ink">{summary}</p>

      {missingCommonClauses.length > 0 && (
        <div className="mt-4 border-t border-line pt-4">
          <h3 className="text-sm font-semibold text-ink">Missing clauses to ask about</h3>
          <p className="mt-1 text-xs text-ink-soft">
            Documents like this usually include these, but this one doesn&apos;t mention them.
          </p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {missingCommonClauses.map((clause) => (
              <li
                key={clause}
                className="rounded-full border border-dashed border-brass/50 bg-brass-soft px-2.5 py-1 text-xs font-medium text-ink"
              >
                {clause}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
