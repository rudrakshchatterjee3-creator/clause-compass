import { describe, it, expect } from "vitest";
import {
  askAnswerSchema,
  askStepDraftSchema,
  askDetailDraftSchema,
} from "@/lib/schemas/askAnswer";

describe("askAnswerSchema", () => {
  it("accepts an answerable response with verified steps", () => {
    const answer = {
      answerable: true,
      answer: "If you end the lease early, you owe a $500 fee.",
      steps: [
        {
          text: "You pay a $500 early termination fee.",
          quote: "$500 early termination fee",
          start: 10,
          end: 33,
          verified: true,
        },
      ],
      confidence: "high",
      suggestLawyer: false,
    };
    expect(askAnswerSchema.parse(answer)).toEqual(answer);
  });

  it("accepts an unverified step with no start/end", () => {
    const answer = {
      answerable: true,
      answer: "x",
      steps: [{ text: "x", quote: "x", verified: false }],
      confidence: "low",
      suggestLawyer: false,
    };
    expect(() => askAnswerSchema.parse(answer)).not.toThrow();
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

  it("rejects a step missing its verified flag", () => {
    const answer = {
      answerable: true,
      answer: "x",
      steps: [{ text: "missing verified", quote: "q" }],
      confidence: "medium",
      suggestLawyer: false,
    };
    expect(() => askAnswerSchema.parse(answer)).toThrow();
  });
});

describe("askStepDraftSchema", () => {
  it("accepts just text and quote, without grounding fields", () => {
    const draft = { text: "You owe a fee.", quote: "a fee" };
    expect(askStepDraftSchema.parse(draft)).toEqual(draft);
  });

  it("rejects a draft that includes verified", () => {
    expect(() =>
      askStepDraftSchema.strict().parse({ text: "x", quote: "x", verified: true }),
    ).toThrow();
  });
});

describe("askDetailDraftSchema", () => {
  it("accepts the shape the model must produce for the detail call", () => {
    const draft = {
      answerable: true,
      steps: [{ text: "x", quote: "x" }],
      confidence: "medium",
      suggestLawyer: false,
    };
    expect(() => askDetailDraftSchema.parse(draft)).not.toThrow();
  });

  it("rejects a missing confidence field", () => {
    const draft = { answerable: true, steps: [], suggestLawyer: false };
    expect(() => askDetailDraftSchema.parse(draft)).toThrow();
  });
});
