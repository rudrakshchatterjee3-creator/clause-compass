import { describe, it, expect } from "vitest";
import { formatBriefAsMarkdown, formatBriefAsPlainText } from "@/lib/brief/formatBrief";

const params = {
  docTitle: "Residential Lease Agreement",
  brief: {
    keyRisks: ["Uncapped late fee"],
    questionsForLawyer: ["Is the arbitration clause enforceable here?"],
    documentsToGather: ["Prior lease agreement"],
    deadlines: ["Renewal notice due 60 days before term end"],
  },
  generatedAt: "2026-09-17T12:00:00.000Z",
  disclaimer: "This tool gives information, not legal advice.",
};

describe("formatBriefAsMarkdown", () => {
  it("includes the title, a checklist per section, and the disclaimer", () => {
    const markdown = formatBriefAsMarkdown(params);
    expect(markdown).toContain("# Lawyer-Prep Brief: Residential Lease Agreement");
    expect(markdown).toContain("## Key risks");
    expect(markdown).toContain("- [ ] Uncapped late fee");
    expect(markdown).toContain("## Questions for your lawyer");
    expect(markdown).toContain("## Documents to gather");
    expect(markdown).toContain("## Deadlines");
    expect(markdown).toContain(params.disclaimer);
  });
});

describe("formatBriefAsPlainText", () => {
  it("includes the title, each item, and the disclaimer without markdown syntax", () => {
    const text = formatBriefAsPlainText(params);
    expect(text).toContain("LAWYER-PREP BRIEF: Residential Lease Agreement");
    expect(text).toContain("- Uncapped late fee");
    expect(text).not.toContain("[ ]");
    expect(text).not.toContain("##");
    expect(text).toContain(params.disclaimer);
  });
});
