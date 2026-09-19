import { describe, it, expect } from "vitest";
import { readSseData } from "@/lib/ai/sse";

function streamFromChunks(chunks: Uint8Array[]): ReadableStream<Uint8Array> {
  let index = 0;
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (index < chunks.length) {
        controller.enqueue(chunks[index]!);
        index += 1;
      } else {
        controller.close();
      }
    },
  });
}

async function collect(gen: AsyncGenerator<string>): Promise<string[]> {
  const out: string[] = [];
  for await (const value of gen) out.push(value);
  return out;
}

describe("readSseData", () => {
  it("yields each event's data payload", async () => {
    const stream = streamFromChunks([
      new TextEncoder().encode('data: {"a":1}\n\ndata: {"a":2}\n\n'),
    ]);
    expect(await collect(readSseData(stream))).toEqual(['{"a":1}', '{"a":2}']);
  });

  it("skips the closing [DONE] sentinel", async () => {
    const stream = streamFromChunks([new TextEncoder().encode('data: {"a":1}\n\ndata: [DONE]\n\n')]);
    expect(await collect(readSseData(stream))).toEqual(['{"a":1}']);
  });

  it("skips blank lines and non-data lines", async () => {
    const stream = streamFromChunks([
      new TextEncoder().encode(': comment\n\ndata: {"a":1}\n\n\n'),
    ]);
    expect(await collect(readSseData(stream))).toEqual(['{"a":1}']);
  });

  it("parses a data line split across multiple chunks", async () => {
    const full = 'data: {"a":1}\n\n';
    const mid = Math.floor(full.length / 2);
    const stream = streamFromChunks([
      new TextEncoder().encode(full.slice(0, mid)),
      new TextEncoder().encode(full.slice(mid)),
    ]);
    expect(await collect(readSseData(stream))).toEqual(['{"a":1}']);
  });

  it("yields nothing for an empty stream", async () => {
    const stream = streamFromChunks([]);
    expect(await collect(readSseData(stream))).toEqual([]);
  });
});
