interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
  onStartOver: () => void;
}

export function ErrorState({ message, onRetry, onStartOver }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="mx-auto flex max-w-lg flex-col items-center gap-4 rounded-2xl border border-risk-high/30 bg-risk-high-bg px-6 py-10 text-center"
    >
      <p className="font-display text-lg font-semibold text-risk-high">
        Something went wrong
      </p>
      <p className="text-sm text-ink">{message}</p>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="rounded-full bg-harbor px-5 py-2 text-sm font-medium text-paper-raised transition-colors hover:bg-harbor/90"
          >
            Try again
          </button>
        )}
        <button
          type="button"
          onClick={onStartOver}
          className="rounded-full border border-line bg-paper-raised px-5 py-2 text-sm font-medium text-ink transition-colors hover:border-harbor"
        >
          Choose a different file
        </button>
      </div>
    </div>
  );
}
