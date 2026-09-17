interface PiiToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function PiiToggle({ checked, onChange }: PiiToggleProps) {
  return (
    <label className="mt-4 flex items-center justify-center gap-2 text-xs text-ink-soft">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-3.5 w-3.5 rounded border-line accent-harbor"
      />
      Redact emails, phone numbers, and ID numbers before sending to the AI
    </label>
  );
}
