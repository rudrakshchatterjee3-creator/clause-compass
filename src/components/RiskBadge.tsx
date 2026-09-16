import type { RiskLevel } from "@/lib/schemas";
import { RiskGauge } from "@/components/icons/RiskGauge";

const RISK_LABEL: Record<RiskLevel, string> = {
  low: "Low risk",
  medium: "Medium risk",
  high: "High risk",
};

const RISK_STYLES: Record<RiskLevel, string> = {
  low: "bg-risk-low-bg text-risk-low",
  medium: "bg-risk-medium-bg text-risk-medium",
  high: "bg-risk-high-bg text-risk-high",
};

interface RiskBadgeProps {
  level: RiskLevel;
}

export function RiskBadge({ level }: RiskBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${RISK_STYLES[level]}`}
    >
      <RiskGauge level={level} className="h-3.5 w-auto" />
      {RISK_LABEL[level]}
    </span>
  );
}
