import type { ClauseType } from "@/lib/schemas";

export const CLAUSE_TYPE_LABELS: Record<ClauseType, string> = {
  payment: "Payment",
  termination: "Termination",
  liability: "Liability",
  indemnity: "Indemnity",
  confidentiality: "Confidentiality",
  ip: "Intellectual property",
  non_compete: "Non-compete",
  dispute: "Dispute resolution",
  renewal: "Renewal",
  penalty: "Penalty",
  privacy: "Privacy",
  other: "Other",
};
