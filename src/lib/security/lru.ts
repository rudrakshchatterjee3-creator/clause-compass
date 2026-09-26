interface LruEntry<V> {
  value: V;
  expiresAt: number;
}

export interface LruCacheOptions {
  capacity: number;
  ttlMs: number;
}

export class LruCache<K, V> {
  private readonly capacity: number;
  private readonly ttlMs: number;
  private readonly store = new Map<K, LruEntry<V>>();

  constructor({ capacity, ttlMs }: LruCacheOptions) {
    if (capacity <= 0) throw new Error("capacity must be positive");
    this.capacity = capacity;
    this.ttlMs = ttlMs;
  }

  get(key: K): V | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }

    // refresh recency
    this.store.delete(key);
    this.store.set(key, entry);
    return entry.value;
  }

  set(key: K, value: V): void {
    this.store.delete(key);

    if (this.store.size >= this.capacity) {
      // Guaranteed defined: capacity > 0 (enforced in the constructor) and
      // size >= capacity together mean the map is non-empty here.
      const oldestKey = this.store.keys().next().value!;
      this.store.delete(oldestKey);
    }

    this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }

  has(key: K): boolean {
    return this.get(key) !== undefined;
  }

  delete(key: K): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  get size(): number {
    return this.store.size;
  }
}
