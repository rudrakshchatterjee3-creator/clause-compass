interface RedactionSummary {
  type: string;
  count: number;
}

const TYPE_LABEL: Record<string, { singular: string; plural: string }> = {
  email: { singular: "email address", plural: "email addresses" },
  phone: { singular: "phone number", plural: "phone numbers" },
  card: { singular: "card number", plural: "card numbers" },
  aadhaar: { singular: "ID number", plural: "ID numbers" },
  pan: { singular: "ID number", plural: "ID numbers" },
};

function describe(redaction: RedactionSummary): string {
  const label = TYPE_LABEL[redaction.type] ?? { singular: "item", plural: "items" };
  const noun = redaction.count === 1 ? label.singular : label.plural;
  return `${redaction.count} ${noun}`;
}

interface RedactionNoticeProps {
  redactions: RedactionSummary[];
}

export function RedactionNotice({ redactions }: RedactionNoticeProps) {
  if (redactions.length === 0) return null;

  return (
    <p className="rounded-lg border border-dashed border-brass/50 bg-brass-soft px-3 py-2 text-xs text-ink">
      Redacted before sending to the AI: {redactions.map(describe).join(", ")}.
    </p>
  );
}
