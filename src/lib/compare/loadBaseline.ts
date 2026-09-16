import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { COMPARE_BASELINES } from "./baselines";

export class BaselineNotFoundError extends Error {
  constructor(baselineId: string) {
    super(`Unknown baseline id: ${baselineId}`);
    this.name = "BaselineNotFoundError";
  }
}

export async function loadBaselineText(baselineId: string): Promise<string> {
  const baseline = COMPARE_BASELINES.find((option) => option.id === baselineId);
  if (!baseline) {
    throw new BaselineNotFoundError(baselineId);
  }

  const filePath = path.join(process.cwd(), "public", "baselines", baseline.file);
  const text = await readFile(filePath, "utf-8");
  return text.trim();
}
