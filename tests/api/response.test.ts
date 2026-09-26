import { describe, it, expect } from "vitest";
import { errorResponse, aiErrorStatus, extractTextStatus } from "@/lib/api/response";

describe("errorResponse", () => {
  it("builds a { error: { code, message } } JSON body with the given status", async () => {
    const response = errorResponse("invalid_request", "Bad input", 400);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: { code: "invalid_request", message: "Bad input" } });
    expect(response.headers.get("Retry-After")).toBeNull();
  });

  it("sets a Retry-After header when given", () => {
    const response = errorResponse("rate_limited", "Too many requests", 429, 30);
    expect(response.headers.get("Retry-After")).toBe("30");
  });
});

describe("aiErrorStatus", () => {
  it("maps timeout to 504", () => {
    expect(aiErrorStatus("timeout")).toBe(504);
  });

  it("maps invalid_response to 502", () => {
    expect(aiErrorStatus("invalid_response")).toBe(502);
  });

  it("maps request_failed to 502", () => {
    expect(aiErrorStatus("request_failed")).toBe(502);
  });
});

describe("extractTextStatus", () => {
  it("maps unsupported_mime to 400", () => {
    expect(extractTextStatus("unsupported_mime")).toBe(400);
  });

  it("maps file_too_large to 413", () => {
    expect(extractTextStatus("file_too_large")).toBe(413);
  });

  it("maps text_too_large to 413", () => {
    expect(extractTextStatus("text_too_large")).toBe(413);
  });

  it("maps empty_text to 422", () => {
    expect(extractTextStatus("empty_text")).toBe(422);
  });

  it("maps parse_failed to 422", () => {
    expect(extractTextStatus("parse_failed")).toBe(422);
  });
});
