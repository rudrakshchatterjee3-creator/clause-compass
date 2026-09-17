import { NextResponse } from "next/server";
import { generateStructured, AiError } from "@/lib/ai/generateStructured";
import { BRIEF_SYSTEM_PROMPT, buildBriefContents } from "@/lib/ai/prompts";
import { briefRequestSchema, type ApiError } from "@/lib/schemas/api";
import { briefSchema } from "@/lib/schemas/brief";

export async function POST(request: Request): Promise<NextResponse> {
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
    });
  } catch (error) {
    if (error instanceof AiError) {
      return errorResponse(error.code, error.message, aiErrorStatus(error.code));
    }
    return errorResponse("internal_error", "Failed to generate the brief", 500);
  }

  return NextResponse.json({ brief, generatedAt: new Date().toISOString() });
}

function errorResponse(code: string, message: string, status: number): NextResponse<ApiError> {
  return NextResponse.json({ error: { code, message } }, { status });
}

function aiErrorStatus(code: AiError["code"]): number {
  switch (code) {
    case "timeout":
      return 504;
    case "invalid_response":
    case "request_failed":
      return 502;
  }
}
