import "server-only";
import { z } from "zod";

const envSchema = z.object({
  GROQ_API_KEY: z.string().min(1, "GROQ_API_KEY is required"),
  GROQ_MODEL: z.string().min(1, "GROQ_MODEL is required"),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | undefined;

/**
 * Validates and returns the server env on first use. Lazy on purpose:
 * `next build` imports every route module to collect page data, and a build
 * shouldn't need real secrets. A missing or empty key still fails loudly, on
 * the first request that actually needs it.
 */
export function getEnv(): Env {
  cached ??= envSchema.parse({
    GROQ_API_KEY: process.env.GROQ_API_KEY,
    GROQ_MODEL: process.env.GROQ_MODEL,
  });
  return cached;
}
