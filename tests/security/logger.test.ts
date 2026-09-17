import { describe, it, expect, vi, afterEach } from "vitest";
import { logRouteError } from "@/lib/security/logger";

describe("logRouteError", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("logs structured JSON with route, code, and status", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    logRouteError({ route: "analyze", code: "request_failed", status: 502 }, new Error("boom"));

    expect(spy).toHaveBeenCalledTimes(1);
    const logged = JSON.parse(spy.mock.calls[0]![0] as string);
    expect(logged.route).toBe("analyze");
    expect(logged.code).toBe("request_failed");
    expect(logged.status).toBe(502);
    expect(logged.causeMessage).toBe("boom");
    expect(typeof logged.timestamp).toBe("string");
  });

  it("omits causeMessage when no cause is given", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    logRouteError({ route: "ask", code: "internal_error", status: 500 });

    const logged = JSON.parse(spy.mock.calls[0]![0] as string);
    expect(logged.causeMessage).toBeUndefined();
  });

  it("never includes document text or prompt content in the log line", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const documentText = "SECRET CONTRACT TEXT THAT MUST NEVER BE LOGGED";

    logRouteError(
      { route: "analyze", code: "internal_error", status: 500 },
      new Error("failed while processing"),
    );

    const loggedLine = spy.mock.calls[0]![0] as string;
    expect(loggedLine).not.toContain(documentText);
  });
});
