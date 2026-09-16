"use client";

import type { Clause } from "@/lib/schemas";
import { AskQuestionForm } from "@/components/AskQuestionForm";
import { AskAnswerCard, askStepId } from "@/components/AskAnswerCard";
import { DocumentPane, type HighlightSpan } from "@/components/DocumentPane";
import { buildSuggestedQuestions } from "@/components/suggestedQuestions";
import type { AskTurn } from "@/components/askTypes";

interface AskPanelProps {
  documentText: string;
  clauses: Clause[];
  turns: AskTurn[];
  question: string;
  onQuestionChange: (value: string) => void;
  onSubmit: (question: string) => void;
  selectedStepId: string | null;
  onSelectStep: (id: string) => void;
}

export function AskPanel({
  documentText,
  clauses,
  turns,
  question,
  onQuestionChange,
  onSubmit,
  selectedStepId,
  onSelectStep,
}: AskPanelProps) {
  const isBusy = turns.some((turn) => turn.status === "streaming");
  const suggestions = turns.length === 0 ? buildSuggestedQuestions(clauses) : [];

  const latestResult = [...turns].reverse().find((turn) => turn.result)?.result ?? null;
  const spans: HighlightSpan[] = (latestResult?.steps ?? []).map((step, index) => ({
    id: askStepId(index),
    start: step.start,
    end: step.end,
    verified: step.verified,
  }));

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_1fr]">
      <div className="flex flex-col gap-4">
        {turns.length === 0 && (
          <p className="text-sm text-ink-soft">
            Ask what happens under a specific situation — for example what you&apos;d owe if you
            ended the agreement early, or missed a payment.
          </p>
        )}

        <div className="space-y-4">
          {turns.map((turn) =>
            turn.status === "error" ? (
              <div
                key={turn.id}
                role="alert"
                className="rounded-2xl border border-risk-high/30 bg-risk-high-bg p-5"
              >
                <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">
                  You asked
                </p>
                <p className="mt-1 font-display text-base font-medium text-ink">
                  {turn.question}
                </p>
                <p className="mt-3 text-sm text-risk-high">
                  {turn.error?.message ?? "Something went wrong."}
                </p>
                <button
                  type="button"
                  onClick={() => onSubmit(turn.question)}
                  className="mt-3 rounded-full bg-harbor px-4 py-1.5 text-sm font-medium text-paper-raised transition-colors hover:bg-harbor/90"
                >
                  Try again
                </button>
              </div>
            ) : (
              <AskAnswerCard
                key={turn.id}
                question={turn.question}
                answerText={turn.answer}
                isStreaming={turn.status === "streaming"}
                result={turn.result}
                selectedStepId={turn.result === latestResult ? selectedStepId : null}
                onSelectStep={onSelectStep}
              />
            ),
          )}
        </div>

        <AskQuestionForm
          question={question}
          onQuestionChange={onQuestionChange}
          onSubmit={onSubmit}
          disabled={isBusy}
          suggestions={suggestions}
        />
      </div>

      <DocumentPane
        text={documentText}
        spans={spans}
        selectedId={selectedStepId}
        onSelect={onSelectStep}
      />
    </div>
  );
}
