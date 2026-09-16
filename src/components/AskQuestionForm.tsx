"use client";

const MAX_QUESTION_LENGTH = 500;

interface AskQuestionFormProps {
  question: string;
  onQuestionChange: (value: string) => void;
  onSubmit: (question: string) => void;
  disabled: boolean;
  suggestions: string[];
}

export function AskQuestionForm({
  question,
  onQuestionChange,
  onSubmit,
  disabled,
  suggestions,
}: AskQuestionFormProps) {
  const trimmed = question.trim();

  return (
    <div>
      {suggestions.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              disabled={disabled}
              onClick={() => onSubmit(suggestion)}
              className="rounded-full border border-line bg-paper-raised px-3 py-1.5 text-xs font-medium text-harbor transition-colors hover:border-harbor disabled:opacity-60"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (trimmed && !disabled) onSubmit(trimmed);
        }}
        className="flex flex-col gap-2"
      >
        <label htmlFor="ask-question-input" className="sr-only">
          Ask what happens if…
        </label>
        <textarea
          id="ask-question-input"
          value={question}
          maxLength={MAX_QUESTION_LENGTH}
          disabled={disabled}
          onChange={(event) => onQuestionChange(event.target.value)}
          placeholder="What happens if I…"
          rows={2}
          className="w-full resize-none rounded-xl border border-line bg-paper-raised p-3 text-sm text-ink placeholder:text-ink-soft/70 disabled:opacity-60"
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-ink-soft">
            {question.length}/{MAX_QUESTION_LENGTH}
          </span>
          <button
            type="submit"
            disabled={disabled || !trimmed}
            className="rounded-full bg-harbor px-5 py-2 text-sm font-medium text-paper-raised transition-colors hover:bg-harbor/90 disabled:opacity-60"
          >
            {disabled ? "Thinking…" : "Ask"}
          </button>
        </div>
      </form>
    </div>
  );
}
