import type { AskAnswer } from "@/lib/schemas";

export interface ApiErrorInfo {
  code: string;
  message: string;
}

export interface RedactionSummaryDto {
  type: string;
  count: number;
}

export type AskTurnStatus = "streaming" | "done" | "error";

export interface AskTurn {
  id: string;
  question: string;
  answer: string;
  result: AskAnswer | null;
  status: AskTurnStatus;
  error: ApiErrorInfo | null;
  redactions: RedactionSummaryDto[];
}
