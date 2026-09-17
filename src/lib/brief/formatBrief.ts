import type { Brief } from "@/lib/schemas";

export interface FormatBriefParams {
  docTitle: string;
  brief: Brief;
  generatedAt: string;
  disclaimer: string;
}

function formatDate(generatedAt: string): string {
  return new Date(generatedAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

const SECTIONS: { key: keyof Brief; heading: string }[] = [
  { key: "keyRisks", heading: "Key risks" },
  { key: "questionsForLawyer", heading: "Questions for your lawyer" },
  { key: "documentsToGather", heading: "Documents to gather" },
  { key: "deadlines", heading: "Deadlines" },
];

export function formatBriefAsMarkdown(params: FormatBriefParams): string {
  const { docTitle, brief, generatedAt, disclaimer } = params;
  const lines = [`# Lawyer-Prep Brief: ${docTitle}`, `Generated ${formatDate(generatedAt)}`, ""];

  for (const section of SECTIONS) {
    lines.push(`## ${section.heading}`, "");
    for (const item of brief[section.key]) lines.push(`- [ ] ${item}`);
    lines.push("");
  }

  lines.push(`> ${disclaimer}`);
  return lines.join("\n");
}

export function formatBriefAsPlainText(params: FormatBriefParams): string {
  const { docTitle, brief, generatedAt, disclaimer } = params;
  const lines = [`LAWYER-PREP BRIEF: ${docTitle}`, `Generated ${formatDate(generatedAt)}`, ""];

  for (const section of SECTIONS) {
    lines.push(section.heading.toUpperCase(), "");
    for (const item of brief[section.key]) lines.push(`- ${item}`);
    lines.push("");
  }

  lines.push(disclaimer);
  return lines.join("\n");
}
