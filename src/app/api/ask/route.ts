import { NextResponse } from "next/server";
import { askRequestSchema, type ApiError, type AskStreamEvent } from "@/lib/schemas/api";
import { askDetailDraftSchema, type AskAnswer, type AskStep } from "@/lib/schemas/askAnswer";
import { generateStreamingText } from "@/lib/ai/generateStreamingText";
import { generateStructured, AiError } from "@/lib/ai/generateStructured";
import {
  ASK_ANSWER_SYSTEM_PROMPT,
  buildAskContents,
  buildAskDetailSystemPrompt,
} from "@/lib/ai/prompts";
import { verifyQuoteFields } from "@/lib/grounding/verify";
import { encodeNdjsonLine, NDJSON_CONTENT_TYPE } from "@/lib/streaming/ndjson";

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("invalid_request", "Expected a JSON body", 400);
  }

  const parsed = askRequestSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(
      "invalid_request",
      parsed.error.issues[0]?.message ?? "Invalid request",
      400,
    );
  }

  const { documentText, question, history } = parsed.data;
  const contents = buildAskContents({ documentText, question, history });

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (event: AskStreamEvent) => controller.enqueue(encodeNdjsonLine(event));
      let answer = "";

      try {
        for await (const chunk of generateStreamingText({
          prompt: contents,
          systemInstruction: ASK_ANSWER_SYSTEM_PROMPT,
        })) {
          answer += chunk;
          emit({ type: "answer_chunk", text: chunk });
        }

        if (!answer.trim()) {
          throw new AiError("invalid_response", "Model returned an empty answer");
        }

        const detail = await generateStructured({
          schema: askDetailDraftSchema,
          prompt: contents,
          systemInstruction: buildAskDetailSystemPrompt(answer),
        });

        const steps: AskStep[] = verifyQuoteFields(documentText, detail.steps);

        const result: AskAnswer = {
          answerable: detail.answerable,
          answer,
          steps,
          confidence: detail.confidence,
          suggestLawyer: detail.suggestLawyer,
        };

        emit({ type: "result", result });
      } catch (error) {
        if (error instanceof AiError) {
          emit({ type: "error", error: { code: error.code, message: error.message } });
        } else {
          emit({
            type: "error",
            error: { code: "internal_error", message: "Failed to answer the question" },
          });
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": NDJSON_CONTENT_TYPE,
      "Cache-Control": "no-store",
    },
  });
}

function errorResponse(code: string, message: string, status: number): NextResponse<ApiError> {
  return NextResponse.json({ error: { code, message } }, { status });
}
