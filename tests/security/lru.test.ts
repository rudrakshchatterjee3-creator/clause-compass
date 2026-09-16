import { describe, it, expect, vi, afterEach } from "vitest";
import { LruCache } from "@/lib/security/lru";

describe("LruCache", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("stores and retrieves values", () => {
    const cache = new LruCache<string, number>({ capacity: 2, ttlMs: 60_000 });
    cache.set("a", 1);
    expect(cache.get("a")).toBe(1);
  });

  it("returns undefined for a missing key", () => {
    const cache = new LruCache<string, number>({ capacity: 2, ttlMs: 60_000 });
    expect(cache.get("missing")).toBeUndefined();
  });

  it("evicts the least recently used entry when over capacity", () => {
    const cache = new LruCache<string, number>({ capacity: 2, ttlMs: 60_000 });
    cache.set("a", 1);
    cache.set("b", 2);
    cache.set("c", 3);

    expect(cache.get("a")).toBeUndefined();
    expect(cache.get("b")).toBe(2);
    expect(cache.get("c")).toBe(3);
  });

  it("treats a recently read entry as most recently used", () => {
    const cache = new LruCache<string, number>({ capacity: 2, ttlMs: 60_000 });
    cache.set("a", 1);
    cache.set("b", 2);
    cache.get("a");
    cache.set("c", 3);

    expect(cache.get("a")).toBe(1);
    expect(cache.get("b")).toBeUndefined();
    expect(cache.get("c")).toBe(3);
  });

  it("expires entries past their TTL", () => {
    vi.useFakeTimers();
    const cache = new LruCache<string, number>({ capacity: 2, ttlMs: 1_000 });
    cache.set("a", 1);

    vi.advanceTimersByTime(1_001);

    expect(cache.get("a")).toBeUndefined();
  });

  it("overwrites an existing key without growing size", () => {
    const cache = new LruCache<string, number>({ capacity: 2, ttlMs: 60_000 });
    cache.set("a", 1);
    cache.set("a", 2);
    expect(cache.size).toBe(1);
    expect(cache.get("a")).toBe(2);
  });

  it("has() reflects presence without side effects on eviction order", () => {
    const cache = new LruCache<string, number>({ capacity: 2, ttlMs: 60_000 });
    cache.set("a", 1);
    expect(cache.has("a")).toBe(true);
    expect(cache.has("z")).toBe(false);
  });

  it("delete() removes an entry", () => {
    const cache = new LruCache<string, number>({ capacity: 2, ttlMs: 60_000 });
    cache.set("a", 1);
    cache.delete("a");
    expect(cache.get("a")).toBeUndefined();
  });

  it("clear() empties the cache", () => {
    const cache = new LruCache<string, number>({ capacity: 2, ttlMs: 60_000 });
    cache.set("a", 1);
    cache.set("b", 2);
    cache.clear();
    expect(cache.size).toBe(0);
  });

  it("rejects a non-positive capacity", () => {
    expect(() => new LruCache({ capacity: 0, ttlMs: 1000 })).toThrow();
  });
});
