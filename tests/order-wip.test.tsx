import assert from "node:assert/strict";
import { test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ItemStatus, type Item } from "../typings/types";
import { prepareItemPatchHistory } from "../lib/reporting/item-history";
import { useOrderFiltering } from "../hooks/useOrderFiltering";
import { isOrderWip, orderWipToggle } from "../lib/order-wip";
import { OrderWipBadge } from "../components/orders/OrderWipBadge";
import { planOnDeckTransitions, ON_DECK_MAX_COUNT } from "../lib/on-deck-reconciliation";

const order = {
  id: "working-order", status: ItemStatus.OnDeck, customerName: "Working customer",
  createdAt: 0, index: 0, visible: true, deleted: false, isWip: true,
} as Item & { isWip: boolean };
const REFERENCE_TIME = Date.parse("2026-10-07T12:00:00Z");

test("moving a highlighted order to another section clears WIP in the persisted patch", () => {
  const patch = prepareItemPatchHistory(order, { status: ItemStatus.Packaging, isWip: true } as Partial<Item>, REFERENCE_TIME);
  assert.equal((patch as typeof order).isWip, false);
});

test("editing or dropping within the same section preserves WIP", () => {
  const patch = prepareItemPatchHistory(order, { customerName: "Updated customer", status: ItemStatus.OnDeck, isWip: true } as Partial<Item>, REFERENCE_TIME);
  assert.equal((patch as typeof order).isWip, true);
});

test("completion clears WIP while preserving completion history", () => {
  const patch = prepareItemPatchHistory(order, { status: ItemStatus.Done } as Partial<Item>, REFERENCE_TIME);
  assert.equal((patch as typeof order).isWip, false);
  assert.equal(patch.completedAt, REFERENCE_TIME);
});

function BoardGroups({ items }: { items: Item[] }) {
  const groups = useOrderFiltering({ items, searchTerm: "", currentType: "all" });
  return <>{groups.map(g => <output key={g.title} data-section={g.title} data-orders={g.items.map(i => i.id).join(",")} />)}</>;
}

test("legacy WIP orders stay visible in On Deck without a separate WIP section", () => {
  const markup = renderToStaticMarkup(<BoardGroups items={[{ ...order, status: ItemStatus.Wip }]} />);
  assert.match(markup, /data-section="On Deck" data-orders="working-order"/);
  assert.doesNotMatch(markup, /data-section="Wip"/);
});

test("marking WIP stays in the current section and survives reload data", () => {
  const marked = orderWipToggle({ ...order, status: ItemStatus.New, isWip: false });
  assert.equal(marked.status, ItemStatus.New);
  assert.equal(marked.isWip, true);
  const reloaded = JSON.parse(JSON.stringify(marked)) as Item;
  assert.match(renderToStaticMarkup(<OrderWipBadge item={reloaded} />), /aria-label="Work in progress"/);
  const unmarked = orderWipToggle(reloaded);
  assert.equal(unmarked.status, ItemStatus.New);
  assert.equal(renderToStaticMarkup(<OrderWipBadge item={unmarked} />), "");
});

test("removing legacy WIP normalizes to On Deck without losing the order", () => {
  const unmarked = orderWipToggle({ ...order, status: ItemStatus.Wip });
  assert.equal(unmarked.status, ItemStatus.OnDeck);
  assert.equal(isOrderWip(unmarked), false);
  assert.equal(unmarked.id, "working-order");
});

test("completed, hidden and deleted orders cannot show a WIP mark", () => {
  for (const inactive of [{ ...order, status: ItemStatus.Done }, { ...order, status: ItemStatus.Hidden }, { ...order, deleted: true }]) {
    assert.equal(isOrderWip(inactive), false);
    assert.equal(orderWipToggle(inactive), inactive);
    assert.equal(renderToStaticMarkup(<OrderWipBadge item={inactive} />), "");
  }
});

test("automatic On Deck balancing does not demote a marked order", () => {
  const urgent = Array.from({ length: ON_DECK_MAX_COUNT }, (_, index) => ({
    ...order, id: `urgent-${index}`, isWip: false, dueDate: "2026-10-07", prevStatus: ItemStatus.New,
  }));
  const working = { ...order, id: "in-progress", dueDate: "2099-01-01", prevStatus: ItemStatus.New };
  const transitions = planOnDeckTransitions([...urgent, working], new Date(REFERENCE_TIME));
  assert.equal(transitions.some(move => move.id === "in-progress"), false);
});
