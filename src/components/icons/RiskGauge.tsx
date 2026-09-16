import type { RiskLevel } from "@/lib/schemas";

interface RiskGaugeProps {
  level: RiskLevel;
  className?: string;
}

const NEEDLE_TIP: Record<RiskLevel, string> = {
  low: "5.94 8.5",
  medium: "12 5",
  high: "18.06 8.5",
};

const NEEDLE_COLOR: Record<RiskLevel, string> = {
  low: "var(--paper-risk-low)",
  medium: "var(--paper-risk-medium)",
  high: "var(--paper-risk-high)",
};

/**
 * A three-zone dial (low / medium / high) with a needle over the active
 * zone — Clause Compass's risk indicator, read by shape and color together.
 */
export function RiskGauge({ level, className }: RiskGaugeProps) {
  const [tipX, tipY] = NEEDLE_TIP[level].split(" ");

  return (
    <svg viewBox="0 0 24 15" aria-hidden="true" className={className}>
      <path
        d="M 3 12 A 9 9 0 0 1 7.5 4.2"
        fill="none"
        stroke="var(--paper-risk-low)"
        strokeWidth="2.4"
        strokeLinecap="round"
        opacity={level === "low" ? 1 : 0.3}
      />
      <path
        d="M 7.5 4.2 A 9 9 0 0 1 16.5 4.2"
        fill="none"
        stroke="var(--paper-risk-medium)"
        strokeWidth="2.4"
        strokeLinecap="round"
        opacity={level === "medium" ? 1 : 0.3}
      />
      <path
        d="M 16.5 4.2 A 9 9 0 0 1 21 12"
        fill="none"
        stroke="var(--paper-risk-high)"
        strokeWidth="2.4"
        strokeLinecap="round"
        opacity={level === "high" ? 1 : 0.3}
      />
      <line
        x1="12"
        y1="12"
        x2={tipX}
        y2={tipY}
        stroke={NEEDLE_COLOR[level]}
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle cx="12" cy="12" r="1.4" fill={NEEDLE_COLOR[level]} />
    </svg>
  );
}
