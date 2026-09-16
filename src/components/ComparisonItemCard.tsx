import type { ComparisonItem } from "@/lib/schemas";
import { FavoursBadge } from "@/components/FavoursBadge";
import { NotVerifiedBadge } from "@/components/NotVerifiedBadge";

const STATUS_LABEL: Record<ComparisonItem["status"], string> = {
  changed: "Changed",
  added: "Added",
  removed: "Removed",
  same: "Same",
};

interface QuoteColumnProps {
  label: string;
  quote: ComparisonItem["docA"];
  emptyText: string;
}

function QuoteColumn({ label, quote, emptyText }: QuoteColumnProps) {
  return (
    <div className="flex-1 rounded-lg border border-line bg-paper p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{label}</p>
      {quote ? (
        <>
          <p className="mt-1.5 font-mono text-xs leading-relaxed text-ink">
            &ldquo;{quote.quote}&rdquo;
          </p>
          {!quote.verified && (
            <div className="mt-1.5">
              <NotVerifiedBadge />
            </div>
          )}
        </>
      ) : (
        <p className="mt-1.5 text-xs italic text-ink-soft">{emptyText}</p>
      )}
    </div>
  );
}

interface ComparisonItemCardProps {
  item: ComparisonItem;
  docALabel: string;
  docBLabel: string;
}

export function ComparisonItemCard({ item, docALabel, docBLabel }: ComparisonItemCardProps) {
  return (
    <li className="rounded-xl border border-line bg-paper-raised p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">
            {STATUS_LABEL[item.status]}
          </p>
          <h3 className="mt-0.5 font-display text-base font-semibold text-ink">{item.topic}</h3>
        </div>
        <FavoursBadge favours={item.favours} docALabel={docALabel} docBLabel={docBLabel} />
      </div>

      <p className="mt-2 text-sm leading-relaxed text-ink">{item.explanation}</p>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <QuoteColumn label={docALabel} quote={item.docA} emptyText="Not in this document" />
        <QuoteColumn label={docBLabel} quote={item.docB} emptyText="Not in this document" />
      </div>
    </li>
  );
}
