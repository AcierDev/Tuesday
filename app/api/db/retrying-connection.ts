export type PromiseSlot<T> = {
  get: () => Promise<T> | undefined;
  set: (promise: Promise<T> | undefined) => void;
};

// Shares one connection attempt. A rejected attempt is forgotten so the next
// caller retries instead of receiving the cached failure forever.
export function retryingConnection<T>(connect: () => Promise<T>, slot: PromiseSlot<T>): () => Promise<T> {
  return () => {
    const cached = slot.get();
    if (cached) return cached;
    const attempt = connect();
    slot.set(attempt);
    attempt.catch(() => {
      if (slot.get() === attempt) slot.set(undefined);
    });
    return attempt;
  };
}

// A Promise-compatible handle that resolves through the current attempt each
// time it is awaited, so `await clientPromise` callers also retry.
export function lazyPromise<T>(current: () => Promise<T>): Promise<T> {
  return {
    then: (onFulfilled, onRejected) => current().then(onFulfilled, onRejected),
    catch: (onRejected) => current().catch(onRejected),
    finally: (onFinally) => current().finally(onFinally),
    [Symbol.toStringTag]: "Promise",
  };
}
