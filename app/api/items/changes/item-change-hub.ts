import type { ChangeStream, ChangeStreamDocument } from "mongodb";
import { getDb } from "../../db/connect";
import type { Item } from "@/typings/types";

// One MongoDB change stream per server process, shared by every open board.
// With no listeners left it stays open this long so reconnecting tabs reuse it.
const IDLE_STREAM_CLOSE_MS = 30_000;
const HUB_KEY = Symbol.for("tuesday.items.changeHub");

export type ItemChangeMessage =
  | { type: "insert" | "update"; itemId: string; item: Item }
  // Hard deletes only identify the Mongo document; clients match it by _id.
  | { type: "delete"; documentId: string };

export type ItemChangeListener = {
  onChange: (message: ItemChangeMessage) => void;
  // The shared stream ended unexpectedly. The listener closes its response so
  // the browser reconnects and reloads, rather than silently missing changes.
  onClose: () => void;
};

type Hub = {
  listeners: Set<ItemChangeListener>;
  stream: ChangeStream<Item> | null;
  opening: boolean;
  idleTimer: ReturnType<typeof setTimeout> | null;
};

// Kept on globalThis so dev hot reloads reuse the stream instead of leaking one.
function getHub(): Hub {
  const store = globalThis as unknown as Record<symbol, Hub | undefined>;
  return (store[HUB_KEY] ??= {
    listeners: new Set(),
    stream: null,
    opening: false,
    idleTimer: null,
  });
}

export function itemChangeMessage(
  change: ChangeStreamDocument<Item>
): ItemChangeMessage | null {
  switch (change.operationType) {
    case "insert":
    case "update":
    case "replace": {
      const item = change.fullDocument;
      // The lookup finds nothing when the order was deleted right after.
      if (!item) return { type: "delete", documentId: String(change.documentKey._id) };
      return {
        type: change.operationType === "insert" ? "insert" : "update",
        itemId: item.id,
        item,
      };
    }
    case "delete":
      return { type: "delete", documentId: String(change.documentKey._id) };
    default:
      return null;
  }
}

function closeStream(stream: ChangeStream<Item>) {
  // Closing an already-closed stream is expected during shutdown; ignore it.
  stream.close().catch(() => undefined);
}

function failStream(hub: Hub, stream: ChangeStream<Item> | null) {
  if (stream && hub.stream !== stream) return;
  hub.stream = null;
  if (stream) closeStream(stream);
  const listeners = [...hub.listeners];
  hub.listeners.clear();
  for (const listener of listeners) listener.onClose();
}

function scheduleIdleClose(hub: Hub) {
  if (hub.idleTimer || hub.listeners.size > 0) return;
  hub.idleTimer = setTimeout(() => {
    hub.idleTimer = null;
    if (hub.listeners.size > 0 || !hub.stream) return;
    const stream = hub.stream;
    hub.stream = null;
    closeStream(stream);
  }, IDLE_STREAM_CLOSE_MS);
  hub.idleTimer.unref?.();
}

async function openStream(hub: Hub) {
  hub.opening = true;
  try {
    const db = await getDb();
    const stream = db
      .collection<Item>(`items-${process.env.NEXT_PUBLIC_MODE}`)
      .watch([], { fullDocument: "updateLookup" });
    hub.stream = stream;
    stream.on("change", (change) => {
      const message = itemChangeMessage(change);
      if (!message) return;
      for (const listener of [...hub.listeners]) {
        try {
          listener.onChange(message);
        } catch (error) {
          console.error("Item change listener failed:", error);
        }
      }
    });
    // Resumable errors are retried by the driver; anything reaching here ended
    // the stream. Errors from a stream we closed on purpose are not reported.
    stream.on("error", (error) => {
      if (hub.stream !== stream) return;
      console.error("Item change stream error:", error);
      failStream(hub, stream);
    });
    stream.on("close", () => failStream(hub, stream));
    if (hub.listeners.size === 0) scheduleIdleClose(hub);
  } catch (error) {
    console.error("Failed to open item change stream:", error);
    failStream(hub, null);
  } finally {
    hub.opening = false;
  }
}

export function subscribeToItemChanges(listener: ItemChangeListener): () => void {
  const hub = getHub();
  hub.listeners.add(listener);
  if (hub.idleTimer) {
    clearTimeout(hub.idleTimer);
    hub.idleTimer = null;
  }
  if (!hub.stream && !hub.opening) void openStream(hub);
  return () => {
    if (hub.listeners.delete(listener)) scheduleIdleClose(hub);
  };
}
