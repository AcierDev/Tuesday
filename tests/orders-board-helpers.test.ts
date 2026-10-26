import assert from "node:assert/strict";
import { test } from "node:test";

import { ItemStatus, type Activity, type Item } from "../typings/types";
import { duplicateNameIds, isDuplicateName } from "../components/cells/duplicate-names";
import { buildStatusMove, buildStatusUndo } from "../components/orders/utils/statusMove";
import {
  CUSTOM_OPTION_MAX_LENGTH,
  customOptionHint,
  normalizeCustomOption,
} from "../components/orders/utils/customOption";
import {
  applyOrderEditChanges,
  buildOrderEditChanges,
} from "../components/orders/utils/orderEdit";
import {
  RECENT_MOVES_PAGE_SIZE,
  fetchRecentMoves,
  recentlyMovedIds,
} from "../components/orders/utils/recentMoves";
import { findScrollContainer } from "../components/orders/utils/scrollContainer";
import { formatDate, getDaysRemaining } from "../components/orders/utils/orderUtils";

const order = (id: string, extra: Partial<Item> = {}): Item => ({
  id, customerName: id, createdAt: 1, status: ItemStatus.New,
  visible: true, deleted: false, index: 0, ...extra,
});

test("duplicate names are computed once per items array with the store's contains rule", () => {
  const items = [
    order("a", { customerName: "Smith" }),
    order("b", { customerName: "Smith (rushed)" }),
    order("c", { customerName: "Jones" }),
    order("d", { customerName: "Jones", deleted: true }),
  ];
  // Same rule as the store: "d" is flagged because active "c" contains its name.
  assert.deepEqual([...duplicateNameIds(items)].sort(), ["a", "d"]);
  assert.equal(duplicateNameIds(items), duplicateNameIds(items));
  // Orders outside the active list (Done) are checked against it.
  assert.equal(isDuplicateName(order("x", { customerName: "Jones" }), items), true);
  assert.equal(isDuplicateName(order("y", { customerName: "Brown" }), items), false);
});

test("a status move can be undone onto the latest copy", () => {
  const original = order("m", {
    status: ItemStatus.Packaging, onHold: true, dueDate: "2026-11-10",
    dueDatePauseOffsetDays: 5, prevStatus: ItemStatus.OnDeck,
  });
  const moved = buildStatusMove(original, ItemStatus.Done, 42);
  assert.equal(moved.status, ItemStatus.Done);
  assert.equal(moved.completedAt, 42);
  assert.equal(moved.onHold, false);
  assert.equal(moved.prevStatus, null);
  const latest = { ...moved, notes: "edited meanwhile" };
  const undone = buildStatusUndo(latest, original);
  assert.equal(undone.status, ItemStatus.Packaging);
  assert.equal(undone.onHold, true);
  assert.equal(undone.dueDate, "2026-11-10");
  assert.equal(undone.dueDatePauseOffsetDays, 5);
  assert.equal(undone.completedAt, undefined);
  assert.equal(undone.notes, "edited meanwhile");
});

test("custom sizes and designs get light validation", () => {
  assert.equal(normalizeCustomOption("  30  x 15 "), "30 x 15");
  assert.equal(normalizeCustomOption("   "), null);
  assert.equal(normalizeCustomOption("!!!"), null);
  assert.equal(normalizeCustomOption("a".repeat(CUSTOM_OPTION_MAX_LENGTH + 1)), null);
  assert.equal(customOptionHint("ok"), null);
  assert.match(customOptionHint("???") ?? "", /letters or numbers/);
});

test("the edit dialog saves only edited fields onto the latest copy", () => {
  const opened = order("e", {
    customerName: "[WF] Jane", size: "36 x 16", design: "Mint",
    dueDate: "2026-11-03", notes: "old", tags: { isVertical: false, hasCustomerMessage: true },
  });
  const unchanged = { customerName: "[WF] Jane", size: "36 x 16", design: "Mint", dueDate: "2026-11-03", isVertical: false };
  assert.deepEqual(buildOrderEditChanges(opened, unchanged), {});
  const changes = buildOrderEditChanges(opened, { ...unchanged, size: "40 x 16", isVertical: true });
  assert.deepEqual(changes, { size: "40 x 16", tags: { isVertical: true } });
  const latest = { ...opened, notes: "new", tags: { isVertical: false, hasCustomerMessage: false } };
  const saved = applyOrderEditChanges(latest, changes);
  assert.equal(saved.notes, "new");
  assert.equal(saved.size, "40 x 16");
  assert.deepEqual(saved.tags, { isVertical: true, hasCustomerMessage: false });
});

test("recent moves page through activities only until the window is covered", async () => {
  const since = 1_000;
  const urls: string[] = [];
  const page = (start: number, type: Activity["type"] = "status_change") =>
    Array.from({ length: RECENT_MOVES_PAGE_SIZE }, (_, i) => ({
      id: `${start}-${i}`, itemId: `item-${start - i}`, timestamp: start - i, type,
    })) as unknown as Activity[];
  const moves = await fetchRecentMoves(since, async (url) => {
    urls.push(url);
    return { activities: urls.length === 1 ? page(1_300) : page(1_100) };
  });
  // Second page reaches past `since`, so no third request.
  assert.equal(urls.length, 2);
  assert.match(urls[1]!, new RegExp(`skip=${RECENT_MOVES_PAGE_SIZE}`));
  assert.ok(moves.every((m) => m.timestamp >= since));
  assert.equal(moves.length, RECENT_MOVES_PAGE_SIZE + 101);
  assert.equal(recentlyMovedIds(moves, 1_050).size, RECENT_MOVES_PAGE_SIZE + 51);
});

test("the scroll container is the nearest scrolling ancestor", () => {
  const scroller = { parentElement: null, overflowY: "auto" };
  const middle = { parentElement: scroller, overflowY: "visible" };
  const page = { parentElement: middle, overflowY: "visible" };
  const found = findScrollContainer(
    page as unknown as Element,
    (el) => ({ overflowY: (el as unknown as { overflowY: string }).overflowY })
  );
  assert.equal(found, scroller);
});

test("mobile due math uses LA calendar days, not UTC midnight", () => {
  assert.equal(getDaysRemaining("2026-11-03", "2026-11-01"), 2);
  assert.equal(getDaysRemaining("2026-10-31", "2026-11-01"), -1);
  assert.equal(getDaysRemaining("", "2026-11-01"), 0);
  assert.equal(formatDate("2026-11-03"), "Nov 3, 2026");
});

test("toasts replace each other and auto-dismiss", async () => {
  const { showToast, showErrorToast, dismissToast, useToastStore } = await import(
    "../components/ui/app-toast"
  );
  const first = showToast({ message: "Moved to Done", durationMs: 5 });
  const second = showErrorToast("Couldn't save");
  assert.equal(useToastStore.getState().toast?.id, second);
  assert.equal(useToastStore.getState().toast?.tone, "error");
  dismissToast(first); // stale id: ignored
  assert.equal(useToastStore.getState().toast?.id, second);
  showToast({ message: "short", durationMs: 5 });
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(useToastStore.getState().toast, null);
});
