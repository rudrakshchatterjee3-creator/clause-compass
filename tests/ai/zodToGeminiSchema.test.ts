import { describe, it, expect } from "vitest";
import { z } from "zod";
import { Type } from "@google/genai";
import { zodToGeminiSchema } from "@/lib/ai/zodToGeminiSchema";
import { clauseDraftSchema } from "@/lib/schemas/clause";
import { analysisDraftSchema } from "@/lib/schemas/analysis";

describe("zodToGeminiSchema", () => {
  it("converts primitives", () => {
    expect(zodToGeminiSchema(z.string())).toEqual({ type: Type.STRING });
    expect(zodToGeminiSchema(z.number())).toEqual({ type: Type.NUMBER });
    expect(zodToGeminiSchema(z.boolean())).toEqual({ type: Type.BOOLEAN });
  });

  it("converts an enum to a string schema with an enum list", () => {
    const schema = z.enum(["low", "medium", "high"]);
    expect(zodToGeminiSchema(schema)).toEqual({
      type: Type.STRING,
      enum: ["low", "medium", "high"],
    });
  });

  it("converts an array to items schema", () => {
    const schema = z.array(z.string());
    expect(zodToGeminiSchema(schema)).toEqual({
      type: Type.ARRAY,
      items: { type: Type.STRING },
    });
  });

  it("converts an object, marking optional fields as not required", () => {
    const schema = z.object({
      required: z.string(),
      optional: z.number().optional(),
    });
    expect(zodToGeminiSchema(schema)).toEqual({
      type: Type.OBJECT,
      properties: {
        required: { type: Type.STRING },
        optional: { type: Type.NUMBER },
      },
      required: ["required"],
    });
  });

  it("omits required entirely when every field is optional", () => {
    const schema = z.object({ optional: z.string().optional() });
    const result = zodToGeminiSchema(schema);
    expect(result.required).toBeUndefined();
  });

  it("carries a .describe() description through", () => {
    const schema = z.string().describe("a field description");
    expect(zodToGeminiSchema(schema)).toEqual({
      type: Type.STRING,
      description: "a field description",
    });
  });

  it("throws for an unsupported schema type", () => {
    expect(() => zodToGeminiSchema(z.date())).toThrow(/unsupported schema type/);
  });

  it("converts the real clause draft schema without throwing", () => {
    const result = zodToGeminiSchema(clauseDraftSchema);
    expect(result.type).toBe(Type.OBJECT);
    expect(result.properties?.obligations?.type).toBe(Type.ARRAY);
    expect(result.properties?.risk?.type).toBe(Type.OBJECT);
    expect(result.required).toContain("quote");
  });

  it("converts the real analysis draft schema without throwing", () => {
    const result = zodToGeminiSchema(analysisDraftSchema);
    expect(result.type).toBe(Type.OBJECT);
    expect(result.properties?.clauses?.type).toBe(Type.ARRAY);
    expect(result.properties?.clauses?.items?.type).toBe(Type.OBJECT);
  });
});
