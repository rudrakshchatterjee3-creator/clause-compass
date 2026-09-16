interface CompassIconProps {
  className?: string;
}

export function CompassIcon({ className }: CompassIconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <path
        d="M12 2.5v2.4M12 19.1v2.4M2.5 12h2.4M19.1 12h2.4"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <path d="M12 6.2 14.1 12 12 17.8 9.9 12Z" fill="var(--paper-brass)" />
      <path d="M12 6.2 14.1 12 12 12Z" fill="var(--paper-ink)" opacity="0.8" />
      <circle cx="12" cy="12" r="1" fill="var(--paper-ink)" />
    </svg>
  );
}
