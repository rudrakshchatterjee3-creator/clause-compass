"use client";

import { useEffect, useState } from "react";
import { CompassIcon } from "@/components/icons/CompassIcon";

const DEFAULT_STAGES = [
  "Reading the document…",
  "Mapping the clauses…",
  "Checking obligations and risk…",
];

interface LoadingStateProps {
  stages?: string[];
}

export function LoadingState({ stages = DEFAULT_STAGES }: LoadingStateProps) {
  const [stageIndex, setStageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStageIndex((index) => Math.min(index + 1, stages.length - 1));
    }, 2500);
    return () => clearInterval(interval);
  }, [stages]);

  return (
    <div className="flex flex-col items-center gap-4 py-20 text-center">
      <CompassIcon className="h-12 w-12 text-harbor motion-safe:[animation:compass-spin_2.4s_linear_infinite]" />
      <p role="status" aria-live="polite" className="text-sm font-medium text-ink-soft">
        {stages[stageIndex]}
      </p>
    </div>
  );
}
