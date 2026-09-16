import type { Clause, ClauseType } from "@/lib/schemas";

const QUESTION_TEMPLATES: Partial<Record<ClauseType, string>> = {
  termination: "What happens if I end this early?",
  renewal: "What if I don't renew on time?",
  payment: "What if I pay late?",
  penalty: "What if I miss a payment?",
  non_compete: "What if I work for a competitor?",
  confidentiality: "What if I accidentally share confidential information?",
  dispute: "What if we disagree and can't resolve it?",
  liability: "What if something goes wrong and someone is harmed?",
  indemnity: "What if I'm asked to cover someone else's costs?",
  privacy: "What if my personal data is misused?",
  ip: "What if I want to reuse this work elsewhere?",
};

export function buildSuggestedQuestions(clauses: readonly Clause[], limit = 5): string[] {
  const types = Array.from(new Set(clauses.map((clause) => clause.type)));
  const questions: string[] = [];

  for (const type of types) {
    const question = QUESTION_TEMPLATES[type];
    if (question && !questions.includes(question)) {
      questions.push(question);
    }
    if (questions.length >= limit) break;
  }

  return questions;
}
