import { describe, it, expect, vi, afterEach } from "vitest";
import { createIdleTimeoutController } from "@/lib/ai/idleTimeout";

describe("createIdleTimeoutController", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not abort before the idle deadline", async () => {
    vi.useFakeTimers();
    const timers = createIdleTimeoutController(1_000, 10_000);

    await vi.advanceTimersByTimeAsync(900);
    expect(timers.signal.aborted).toBe(false);
    timers.clear();
  });

  it("aborts after idleMs with no resetIdle() calls", async () => {
    vi.useFakeTimers();
    const timers = createIdleTimeoutController(1_000, 10_000);

    await vi.advanceTimersByTimeAsync(1_000);
    expect(timers.signal.aborted).toBe(true);
    timers.clear();
  });

  it("resetIdle() pushes the idle deadline back out", async () => {
    vi.useFakeTimers();
    const timers = createIdleTimeoutController(1_000, 10_000);

    await vi.advanceTimersByTimeAsync(900);
    timers.resetIdle();
    await vi.advanceTimersByTimeAsync(900);
    expect(timers.signal.aborted).toBe(false);
    timers.clear();
  });

  it("eventually aborts on its own reset deadline after resetIdle()", async () => {
    vi.useFakeTimers();
    const timers = createIdleTimeoutController(1_000, 10_000);

    await vi.advanceTimersByTimeAsync(900);
    timers.resetIdle();
    // The reset idle timer fires 1000ms after resetIdle(), not after the
    // original deadline.
    await vi.advanceTimersByTimeAsync(1_000);
    expect(timers.signal.aborted).toBe(true);
    timers.clear();
  });

  it("aborts at maxMs even with continuous resetIdle() calls", async () => {
    vi.useFakeTimers();
    const timers = createIdleTimeoutController(1_000, 3_000);

    for (let i = 0; i < 5; i++) {
      await vi.advanceTimersByTimeAsync(900);
      timers.resetIdle();
    }
    expect(timers.signal.aborted).toBe(true);
    timers.clear();
  });

  it("clear() prevents any further abort", async () => {
    vi.useFakeTimers();
    const timers = createIdleTimeoutController(1_000, 10_000);
    timers.clear();

    await vi.advanceTimersByTimeAsync(10_000);
    expect(timers.signal.aborted).toBe(false);
  });
});
