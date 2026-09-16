import "server-only";
import { z, type ZodTypeAny } from "zod";
import { Type, type Schema } from "@google/genai";

/**
 * Converts a zod object/array/primitive schema into the subset of OpenAPI
 * schema Gemini's `responseSchema` accepts. Only covers the shapes our AI
 * output schemas actually use (object, array, string, number, boolean, enum,
 * optional) — anything else throws so a gap is caught in development.
 */
export function zodToGeminiSchema(schema: ZodTypeAny): Schema {
  const typeName = schema._def.typeName as z.ZodFirstPartyTypeKind;

  switch (typeName) {
    case z.ZodFirstPartyTypeKind.ZodObject: {
      const shape = (schema as z.ZodObject<z.ZodRawShape>).shape;
      const properties: Record<string, Schema> = {};
      const required: string[] = [];

      for (const [key, value] of Object.entries(shape)) {
        const fieldSchema = value as ZodTypeAny;
        properties[key] = zodToGeminiSchema(fieldSchema);
        if (!fieldSchema.isOptional()) {
          required.push(key);
        }
      }

      return {
        type: Type.OBJECT,
        properties,
        required: required.length > 0 ? required : undefined,
        ...descriptionOf(schema),
      };
    }

    case z.ZodFirstPartyTypeKind.ZodArray: {
      const element = (schema as z.ZodArray<ZodTypeAny>).element;
      return {
        type: Type.ARRAY,
        items: zodToGeminiSchema(element),
        ...descriptionOf(schema),
      };
    }

    case z.ZodFirstPartyTypeKind.ZodString:
      return { type: Type.STRING, ...descriptionOf(schema) };

    case z.ZodFirstPartyTypeKind.ZodNumber:
      return { type: Type.NUMBER, ...descriptionOf(schema) };

    case z.ZodFirstPartyTypeKind.ZodBoolean:
      return { type: Type.BOOLEAN, ...descriptionOf(schema) };

    case z.ZodFirstPartyTypeKind.ZodEnum: {
      const options = (schema as z.ZodEnum<[string, ...string[]]>).options;
      return { type: Type.STRING, enum: [...options], ...descriptionOf(schema) };
    }

    case z.ZodFirstPartyTypeKind.ZodOptional:
      return zodToGeminiSchema((schema as z.ZodOptional<ZodTypeAny>).unwrap());

    default:
      throw new Error(`zodToGeminiSchema: unsupported schema type "${typeName}"`);
  }
}

function descriptionOf(schema: ZodTypeAny): { description?: string } {
  return schema.description ? { description: schema.description } : {};
}
