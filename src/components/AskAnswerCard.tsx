import type { AskAnswer } from "@/lib/schemas";
import { ConfidenceBadge } from "@/components/ConfidenceBadge";
import { NotVerifiedBadge } from "@/components/NotVerifiedBadge";

export function askStepId(index: number): string {
  return `step-${index}`;
}

interface AskAnswerCardProps {
  question: string;
  answerText: string;
  isStreaming: boolean;
  result: AskAnswer | null;
  selectedStepId: string | null;
  onSelectStep: (id: string) => void;
}

export function AskAnswerCard({
  question,
  answerText,
  isStreaming,
  result,
  selectedStepId,
  onSelectStep,
}: AskAnswerCardProps) {
  return (
    <div className="rounded-2xl border border-line bg-paper-raised p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">You asked</p>
      <p className="mt-1 font-display text-base font-medium text-ink">{question}</p>

      <div className="mt-4 border-t border-line pt-4">
        <p className="text-sm leading-relaxed text-ink">
          {answerText}
          {isStreaming && (
            <span
              aria-hidden="true"
              className="ml-0.5 inline-block h-4 w-0.5 -translate-y-0.5 animate-pulse bg-harbor align-middle"
            />
          )}
        </p>

        {result && (
          <>
            <div className="mt-3 flex flex-wrap gap-2">
              <ConfidenceBadge level={result.confidence} />
            </div>

            {result.suggestLawyer && (
              <p className="mt-3 rounded-lg border border-dashed border-brass/50 bg-brass-soft px-3 py-2 text-xs text-ink">
                This situation is worth discussing with a lawyer before you decide anything.
              </p>
            )}

            {result.steps.length > 0 && (
              <ol className="mt-4 space-y-2 border-t border-line pt-4">
                {result.steps.map((step, index) => {
                  const id = askStepId(index);
                  const isSelected = id === selectedStepId;
                  return (
                    <li key={id} className="flex gap-2.5 text-sm">
                      <span className="mt-0.5 shrink-0 font-display text-xs font-semibold text-ink-soft">
                        {index + 1}.
                      </span>
                      <div>
                        <p className="text-ink">{step.text}</p>
                        <div className="mt-1 flex items-center gap-2">
                          {step.verified ? (
                            <button
                              type="button"
                              onClick={() => onSelectStep(id)}
                              aria-pressed={isSelected}
                              className={`rounded px-1.5 py-0.5 font-mono text-xs transition-colors ${
                                isSelected
                                  ? "bg-harbor text-paper-raised"
                                  : "bg-brass-soft text-ink hover:bg-brass/40"
                              }`}
                            >
                              &ldquo;{step.quote}&rdquo;
                            </button>
                          ) : (
                            <NotVerifiedBadge />
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </>
        )}
      </div>
    </div>
  );
}
