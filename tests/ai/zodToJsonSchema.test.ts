import { describe, it, expect } from "vitest";
import { z } from "zod";
import { zodToJsonSchema } from "@/lib/ai/zodToJsonSchema";
import { clauseDraftSchema } from "@/lib/schemas/clause";
import { analysisDraftSchema } from "@/lib/schemas/analysis";

describe("zodToJsonSchema", () => {
  it("converts primitives", () => {
    expect(zodToJsonSchema(z.string())).toEqual({ type: "string" });
    expect(zodToJsonSchema(z.number())).toEqual({ type: "number" });
    expect(zodToJsonSchema(z.boolean())).toEqual({ type: "boolean" });
  });

  it("converts an enum to a string schema with an enum list", () => {
    const schema = z.enum(["low", "medium", "high"]);
    expect(zodToJsonSchema(schema)).toEqual({
      type: "string",
      enum: ["low", "medium", "high"],
    });
  });

  it("converts an array to items schema", () => {
    const schema = z.array(z.string());
    expect(zodToJsonSchema(schema)).toEqual({
      type: "array",
      items: { type: "string" },
    });
  });

  it("converts an object, marking optional fields as not required", () => {
    const schema = z.object({
      required: z.string(),
      optional: z.number().optional(),
    });
    expect(zodToJsonSchema(schema)).toEqual({
      type: "object",
      properties: {
        required: { type: "string" },
        optional: { type: "number" },
      },
      required: ["required"],
    });
  });

  it("omits required entirely when every field is optional", () => {
    const schema = z.object({ optional: z.string().optional() });
    const result = zodToJsonSchema(schema);
    expect(result.required).toBeUndefined();
  });

  it("carries a .describe() description through", () => {
    const schema = z.string().describe("a field description");
    expect(zodToJsonSchema(schema)).toEqual({
      type: "string",
      description: "a field description",
    });
  });

  it("throws for an unsupported schema type", () => {
    expect(() => zodToJsonSchema(z.date())).toThrow(/unsupported schema type/);
  });

  it("converts the real clause draft schema without throwing", () => {
    const result = zodToJsonSchema(clauseDraftSchema);
    expect(result.type).toBe("object");
    expect(result.properties?.obligations?.type).toBe("array");
    expect(result.properties?.risk?.type).toBe("object");
    expect(result.required).toContain("quote");
  });

  it("converts the real analysis draft schema without throwing", () => {
    const result = zodToJsonSchema(analysisDraftSchema);
    expect(result.type).toBe("object");
    expect(result.properties?.clauses?.type).toBe("array");
    expect(result.properties?.clauses?.items?.type).toBe("object");
  });
});
