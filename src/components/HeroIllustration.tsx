import { RiskGauge } from "@/components/icons/RiskGauge";

/** Decorative preview of an annotated contract — purely illustrative. */
export function HeroIllustration() {
  return (
    <div aria-hidden="true" className="relative mx-auto w-full max-w-xs select-none">
      <div className="-rotate-2 rounded-lg border border-line bg-paper-raised p-5 shadow-[0_18px_40px_-24px_rgba(27,36,48,0.35)]">
        <div className="mb-4 h-2 w-2/5 rounded-full bg-ink/20" />
        <div className="space-y-2.5">
          <div className="h-1.5 w-full rounded-full bg-ink/10" />
          <div className="h-1.5 w-11/12 rounded-full bg-brass-soft ring-1 ring-brass/40" />
          <div className="h-1.5 w-full rounded-full bg-ink/10" />
          <div className="h-1.5 w-4/5 rounded-full bg-ink/10" />
          <div className="h-1.5 w-11/12 rounded-full bg-harbor-soft ring-1 ring-harbor/40" />
          <div className="h-1.5 w-3/4 rounded-full bg-ink/10" />
          <div className="h-1.5 w-full rounded-full bg-ink/10" />
        </div>
      </div>
      <div className="absolute -bottom-4 -right-3 flex items-center gap-1.5 rounded-full border border-line bg-paper-raised px-3 py-1.5 text-xs font-medium text-risk-medium shadow-[0_10px_24px_-16px_rgba(27,36,48,0.4)]">
        <RiskGauge level="medium" className="h-3.5 w-auto" />
        Medium risk
      </div>
    </div>
  );
}
