import "server-only";
import { z, type ZodTypeAny } from "zod";

export interface JsonSchema {
  type: "object" | "array" | "string" | "number" | "boolean";
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  enum?: string[];
  description?: string;
}

/**
 * Converts a zod object/array/primitive schema into plain JSON Schema, used
 * to tell the model the exact shape to return. Only covers the shapes our AI
 * output schemas actually use (object, array, string, number, boolean, enum,
 * optional) — anything else throws so a gap is caught in development.
 */
export function zodToJsonSchema(schema: ZodTypeAny): JsonSchema {
  const typeName = schema._def.typeName as z.ZodFirstPartyTypeKind;

  switch (typeName) {
    case z.ZodFirstPartyTypeKind.ZodObject: {
      const shape = (schema as z.ZodObject<z.ZodRawShape>).shape;
      const properties: Record<string, JsonSchema> = {};
      const required: string[] = [];

      for (const [key, value] of Object.entries(shape)) {
        const fieldSchema = value as ZodTypeAny;
        properties[key] = zodToJsonSchema(fieldSchema);
        if (!fieldSchema.isOptional()) {
          required.push(key);
        }
      }

      return {
        type: "object",
        properties,
        required: required.length > 0 ? required : undefined,
        ...descriptionOf(schema),
      };
    }

    case z.ZodFirstPartyTypeKind.ZodArray: {
      const element = (schema as z.ZodArray<ZodTypeAny>).element;
      return {
        type: "array",
        items: zodToJsonSchema(element),
        ...descriptionOf(schema),
      };
    }

    case z.ZodFirstPartyTypeKind.ZodString:
      return { type: "string", ...descriptionOf(schema) };

    case z.ZodFirstPartyTypeKind.ZodNumber:
      return { type: "number", ...descriptionOf(schema) };

    case z.ZodFirstPartyTypeKind.ZodBoolean:
      return { type: "boolean", ...descriptionOf(schema) };

    case z.ZodFirstPartyTypeKind.ZodEnum: {
      const options = (schema as z.ZodEnum<[string, ...string[]]>).options;
      return { type: "string", enum: [...options], ...descriptionOf(schema) };
    }

    case z.ZodFirstPartyTypeKind.ZodOptional:
      return zodToJsonSchema((schema as z.ZodOptional<ZodTypeAny>).unwrap());

    default:
      throw new Error(`zodToJsonSchema: unsupported schema type "${typeName}"`);
  }
}

function descriptionOf(schema: ZodTypeAny): { description?: string } {
  return schema.description ? { description: schema.description } : {};
}
