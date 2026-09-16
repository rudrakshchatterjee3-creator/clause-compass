import { describe, it, expect } from "vitest";
import { askAnswerSchema } from "@/lib/schemas/askAnswer";

describe("askAnswerSchema", () => {
  it("accepts an answerable response with steps", () => {
    const answer = {
      answerable: true,
      answer: "If you end the lease early, you owe a $500 fee.",
      steps: [{ text: "You pay a $500 early termination fee.", quote: "$500 early termination fee" }],
      confidence: "high",
      suggestLawyer: false,
    };
    expect(askAnswerSchema.parse(answer)).toEqual(answer);
  });

  it("accepts an unanswerable response with no steps", () => {
    const answer = {
      answerable: false,
      answer: "The document doesn't say.",
      steps: [],
      confidence: "low",
      suggestLawyer: true,
    };
    expect(() => askAnswerSchema.parse(answer)).not.toThrow();
  });

  it("rejects an unknown confidence level", () => {
    const answer = {
      answerable: true,
      answer: "x",
      steps: [],
      confidence: "certain",
      suggestLawyer: false,
    };
    expect(() => askAnswerSchema.parse(answer)).toThrow();
  });

  it("rejects a step missing its quote", () => {
    const answer = {
      answerable: true,
      answer: "x",
      steps: [{ text: "missing quote" }],
      confidence: "medium",
      suggestLawyer: false,
    };
    expect(() => askAnswerSchema.parse(answer)).toThrow();
  });
});
