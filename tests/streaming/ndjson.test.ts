import { describe, it, expect } from "vitest";
import { encodeNdjsonLine, parseNdjsonStream, NDJSON_CONTENT_TYPE } from "@/lib/streaming/ndjson";

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

describe("NDJSON_CONTENT_TYPE", () => {
  it("is the expected media type", () => {
    expect(NDJSON_CONTENT_TYPE).toBe("application/x-ndjson");
  });
});

describe("encodeNdjsonLine", () => {
  it("serializes a value with a trailing newline", () => {
    const bytes = encodeNdjsonLine({ type: "answer_chunk", text: "hi" });
    expect(new TextDecoder().decode(bytes)).toBe('{"type":"answer_chunk","text":"hi"}\n');
  });
});

describe("parseNdjsonStream", () => {
  it("parses multiple lines delivered in a single chunk", async () => {
    const stream = streamFromChunks([
      new TextEncoder().encode('{"a":1}\n{"a":2}\n{"a":3}\n'),
    ]);
    const events: unknown[] = [];
    for await (const event of parseNdjsonStream(stream)) events.push(event);
    expect(events).toEqual([{ a: 1 }, { a: 2 }, { a: 3 }]);
  });

  it("parses a JSON line split across multiple chunks", async () => {
    const full = '{"type":"answer_chunk","text":"hello world"}\n';
    const mid = Math.floor(full.length / 2);
    const stream = streamFromChunks([
      new TextEncoder().encode(full.slice(0, mid)),
      new TextEncoder().encode(full.slice(mid)),
    ]);
    const events: unknown[] = [];
    for await (const event of parseNdjsonStream(stream)) events.push(event);
    expect(events).toEqual([{ type: "answer_chunk", text: "hello world" }]);
  });

  it("yields a final line that has no trailing newline", async () => {
    const stream = streamFromChunks([new TextEncoder().encode('{"a":1}\n{"a":2}')]);
    const events: unknown[] = [];
    for await (const event of parseNdjsonStream(stream)) events.push(event);
    expect(events).toEqual([{ a: 1 }, { a: 2 }]);
  });

  it("skips blank lines", async () => {
    const stream = streamFromChunks([new TextEncoder().encode('{"a":1}\n\n{"a":2}\n')]);
    const events: unknown[] = [];
    for await (const event of parseNdjsonStream(stream)) events.push(event);
    expect(events).toEqual([{ a: 1 }, { a: 2 }]);
  });

  it("yields nothing for an empty stream", async () => {
    const stream = streamFromChunks([]);
    const events: unknown[] = [];
    for await (const event of parseNdjsonStream(stream)) events.push(event);
    expect(events).toEqual([]);
  });

  it("round-trips events produced by encodeNdjsonLine", async () => {
    const values = [{ type: "answer_chunk", text: "a" }, { type: "result", result: { ok: true } }];
    const bytes = values.map((value) => encodeNdjsonLine(value));
    const stream = streamFromChunks(bytes);
    const events: unknown[] = [];
    for await (const event of parseNdjsonStream(stream)) events.push(event);
    expect(events).toEqual(values);
  });
});
