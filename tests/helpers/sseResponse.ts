/** Builds a fetch-style Response whose body streams OpenAI-style SSE delta chunks. */
export function sseStreamResponse(chunks: (string | undefined)[], status = 200): Response {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const content of chunks) {
        const chunk = { choices: [{ delta: content === undefined ? {} : { content } }] };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
      }
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });
  return new Response(body, { status });
}

/** A single-chunk SSE response — for mocking a jsonMode (structured) chatCompletion call. */
export function sseJsonResponse(content: string, status = 200): Response {
  return sseStreamResponse([content], status);
}
