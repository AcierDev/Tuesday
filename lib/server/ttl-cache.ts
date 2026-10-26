//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ ⏳ PER-PROCESS TTL CACHE — one shared load per key, short-lived reuse ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

// Server routes that read slow, slow-changing data (all-history stats sources,
// S3 listings) share one load per process for `ttlMs`. Concurrent callers join
// the in-flight load instead of each hitting the database.
//
// `fresh` is for callers that just observed a write (the stats pages refetch
// with it after an edit or a live change). A fresh read never returns data
// whose load started more than `freshJoinWindowMs` before the read: the
// browser only asks for fresh data after its own write returned (plus a
// debounce), so a load that started inside that window already sees the
// write, and a burst of fresh reads from one page still shares a single load.

export type TtlCacheOptions = {
  ttlMs: number;
  freshJoinWindowMs: number;
  now?: () => number;
};

export type TtlCacheReadOptions = { fresh?: boolean };

type Settled<T> = { value: T; startedAt: number };
type Inflight<T> = { promise: Promise<T>; startedAt: number };

export type TtlCache<K, T> = {
  get: (key: K, options?: TtlCacheReadOptions) => Promise<T>;
  // Drops every entry (and detaches in-flight loads) so the next read loads.
  invalidate: () => void;
};

export function createTtlCache<K, T>(
  load: (key: K, previous: T | undefined) => Promise<T>,
  { ttlMs, freshJoinWindowMs, now = Date.now }: TtlCacheOptions
): TtlCache<K, T> {
  const settled = new Map<K, Settled<T>>();
  const inflight = new Map<K, Inflight<T>>();
  let generation = 0;

  function start(key: K, startedAt: number): Promise<T> {
    const loadGeneration = generation;
    const previous = settled.get(key)?.value;
    const promise = load(key, previous).then((value) => {
      const current = settled.get(key);
      // An older load finishing late never replaces newer data, and a load
      // detached by invalidate() never repopulates the cache.
      if (
        loadGeneration === generation &&
        (!current || current.startedAt <= startedAt)
      ) {
        settled.set(key, { value, startedAt });
      }
      return value;
    });
    const entry = { promise, startedAt };
    inflight.set(key, entry);
    const clear = () => {
      if (inflight.get(key) === entry) inflight.delete(key);
    };
    promise.then(clear, clear);
    return promise;
  }

  return {
    get(key, { fresh = false } = {}) {
      const at = now();
      const freshFloor = at - freshJoinWindowMs;
      const cached = settled.get(key);
      if (cached) {
        const usable = fresh
          ? cached.startedAt >= freshFloor
          : at - cached.startedAt < ttlMs;
        if (usable) return Promise.resolve(cached.value);
      }
      const running = inflight.get(key);
      if (running && (!fresh || running.startedAt >= freshFloor)) {
        return running.promise;
      }
      return start(key, at);
    },
    invalidate() {
      generation += 1;
      settled.clear();
      inflight.clear();
    },
  };
}
