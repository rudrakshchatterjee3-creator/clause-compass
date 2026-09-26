import { NextResponse } from "next/server";
import { generateStructured, AiError } from "@/lib/ai/generateStructured";
import { BRIEF_SYSTEM_PROMPT, buildBriefContents } from "@/lib/ai/prompts";
import { briefRequestSchema } from "@/lib/schemas/api";
import { briefSchema } from "@/lib/schemas/brief";
import { RateLimiter, getClientIp } from "@/lib/security/rateLimit";
import { logRouteError } from "@/lib/security/logger";
import { errorResponse, aiErrorStatus } from "@/lib/api/response";

const ROUTE = "brief";
// Four short lists — far below the default budget.
const BRIEF_MAX_TOKENS = 4000;
const rateLimiter = new RateLimiter({ limit: 10, windowMs: 60_000 });

export async function POST(request: Request): Promise<NextResponse> {
  const rate = rateLimiter.check(getClientIp(request));
  if (!rate.allowed) {
    return errorResponse(
      "rate_limited",
      "Too many requests. Please wait before trying again.",
      429,
      rate.retryAfterSeconds,
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("invalid_request", "Expected a JSON body", 400);
  }

  const parsed = briefRequestSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(
      "invalid_request",
      parsed.error.issues[0]?.message ?? "Invalid request",
      400,
    );
  }

  const { analysis, qaHistory } = parsed.data;

  let brief;
  try {
    brief = await generateStructured({
      schema: briefSchema,
      prompt: buildBriefContents({ analysis, qaHistory }),
      systemInstruction: BRIEF_SYSTEM_PROMPT,
      maxTokens: BRIEF_MAX_TOKENS,
    });
  } catch (error) {
    if (error instanceof AiError) {
      logRouteError({ route: ROUTE, code: error.code, status: aiErrorStatus(error.code) }, error);
      return errorResponse(
        error.code,
        error.message,
        aiErrorStatus(error.code),
        error.retryAfterSeconds,
      );
    }
    logRouteError({ route: ROUTE, code: "internal_error", status: 500 }, error);
    return errorResponse("internal_error", "Failed to generate the brief", 500);
  }

  return NextResponse.json({ brief, generatedAt: new Date().toISOString() });
}
