import "server-only";

/** Reads an SSE byte stream, yielding each event's raw `data:` payload (skips blank lines and the closing "[DONE]"). */
export async function* readSseData(stream: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      let newlineIndex: number;
      while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, newlineIndex).trim();
        buffer = buffer.slice(newlineIndex + 1);
        if (!line.startsWith("data:")) continue;

        const payload = line.slice("data:".length).trim();
        if (payload === "" || payload === "[DONE]") continue;
        yield payload;
      }
    }
  } finally {
    reader.releaseLock();
  }
}
