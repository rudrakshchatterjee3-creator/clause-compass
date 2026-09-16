export function NotVerifiedBadge() {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-ink-soft/50 px-2.5 py-1 text-xs font-medium text-ink-soft"
      title="This clause's quote could not be matched to the document text, so it hasn't been verified."
    >
      <svg viewBox="0 0 16 16" aria-hidden="true" className="h-3.5 w-3.5">
        <circle
          cx="8"
          cy="8"
          r="6.2"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeDasharray="2.4 2.2"
        />
        <path
          d="M8 5.6v2.6M8 10.6v.1"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
      </svg>
      Not verified
    </span>
  );
}
