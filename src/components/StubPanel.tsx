import { CompassIcon } from "@/components/icons/CompassIcon";

interface StubPanelProps {
  title: string;
  description: string;
}

export function StubPanel({ title, description }: StubPanelProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line bg-paper-raised px-6 py-14 text-center">
      <CompassIcon className="h-8 w-8 text-brass" />
      <p className="font-display text-lg font-medium text-ink">{title}</p>
      <p className="max-w-sm text-sm text-ink-soft">{description}</p>
    </div>
  );
}
