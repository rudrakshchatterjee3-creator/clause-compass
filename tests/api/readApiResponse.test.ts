import { describe, it, expect } from "vitest";
import { z } from "zod";
import {
  INVALID_RESPONSE_ERROR,
  UNKNOWN_ERROR,
  readApiError,
  readApiResponse,
} from "@/lib/api/readApiResponse";

const schema = z.object({ value: z.number() });

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

describe("readApiResponse", () => {
  it("returns validated data for a matching success body", async () => {
    const result = await readApiResponse(jsonResponse({ value: 42 }), schema);
    expect(result).toEqual({ ok: true, data: { value: 42 } });
  });

  it("rejects a success body that doesn't match the schema", async () => {
    const result = await readApiResponse(jsonResponse({ value: "nope" }), schema);
    expect(result).toEqual({ ok: false, error: INVALID_RESPONSE_ERROR });
  });

  it("rejects a success body that isn't JSON", async () => {
    const result = await readApiResponse(new Response("not json", { status: 200 }), schema);
    expect(result).toEqual({ ok: false, error: INVALID_RESPONSE_ERROR });
  });

  it("returns the server's typed error for a non-OK response", async () => {
    const error = { code: "rate_limited", message: "Too many requests." };
    const result = await readApiResponse(jsonResponse({ error }, 429), schema);
    expect(result).toEqual({ ok: false, error });
  });
});

describe("readApiError", () => {
  it("falls back to a generic error when the body isn't the error shape", async () => {
    expect(await readApiError(jsonResponse({ something: "else" }, 500))).toEqual(UNKNOWN_ERROR);
  });

  it("falls back to a generic error when the body isn't JSON", async () => {
    expect(await readApiError(new Response("<html>", { status: 502 }))).toEqual(UNKNOWN_ERROR);
  });
});
