import assert from "node:assert/strict";
import { before, test } from "node:test";
import { createRequire, Module } from "node:module";
import React from "react";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";
import { ItemStatus, type Item } from "../typings/types";

const require = createRequire(import.meta.url);
let ItemActions: typeof import("../components/orders/ItemActions").ItemActions;
let saveOrder: (item: Item) => Promise<Item> = async (item) => item;
const activeOrder: Item = {
  id: "active-order", customerName: "Example customer", createdAt: 1,
  status: ItemStatus.OnDeck, visible: true, deleted: false, index: 0,
};

before(async () => {
  function replaceModule(path: string, exports: unknown) {
    const resolved = require.resolve(path);
    const replacement = new Module(resolved);
    replacement.loaded = true;
    replacement.exports = exports;
    require.cache[resolved] = replacement;
  }
  replaceModule("next/navigation", { useRouter: () => ({ push() {} }) });
  replaceModule("../stores/useOrderStore", {
    useOrderStore: (selector: (state: unknown) => unknown) => selector({ updateItem: (item: Item) => saveOrder(item) }),
  });
  // Radix portals require a browser DOM. Replace only that presentation boundary;
  // keep the real menu handlers, state, eligibility rules, and persistence payload.
  const surface = (type: string) => ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
    React.createElement(type, props, children);
  replaceModule("../components/ui/dropdown-menu", {
    DropdownMenu: surface("menu-root"), DropdownMenuContent: surface("menu-content"),
    DropdownMenuItem: surface("menuitem"), DropdownMenuLabel: surface("menu-label"),
    DropdownMenuSeparator: surface("menu-separator"), DropdownMenuTrigger: surface("menu-trigger"),
  });
  ({ ItemActions } = await import("../components/orders/ItemActions"));
});

function renderMenu(item = activeOrder, onWipChanged = () => {}) {
  return TestRenderer.create(<ItemActions item={item} showTrigger={false}
    onEdit={() => {}} onDelete={() => {}} onShip={() => {}} onGetLabel={() => {}}
    onWipChanged={onWipChanged} />);
}

function wipAction(renderer: ReactTestRenderer) {
  return renderer.root.findAllByType("menuitem").find((node) =>
    node.children.some((child) => typeof child === "string" && child.includes("WIP")));
}

test("marking an order WIP saves the flag without moving its section", async () => {
  let saved: Item | undefined;
  let changed = false;
  saveOrder = async (item) => { saved = item; return item; };
  const renderer = renderMenu(activeOrder, () => { changed = true; });
  const action = wipAction(renderer);
  assert.ok(action, "active orders must offer a WIP action");
  await act(async () => action.props.onSelect({ preventDefault() {} }));
  assert.equal(saved?.isWip, true);
  assert.equal(saved?.status, ItemStatus.OnDeck);
  assert.equal(saved?.customerName, "Example customer");
  assert.equal(changed, true);
  act(() => renderer.unmount());
});

test("the WIP action removes an existing flag", async () => {
  let saved: Item | undefined;
  saveOrder = async (item) => { saved = item; return item; };
  const renderer = renderMenu({ ...activeOrder, isWip: true });
  const action = wipAction(renderer);
  assert.ok(action);
  assert.ok(action.children.includes("Remove WIP"));
  await act(async () => action.props.onSelect({ preventDefault() {} }));
  assert.equal(saved?.isWip, false);
  assert.equal(saved?.status, ItemStatus.OnDeck);
  act(() => renderer.unmount());
});

test("completed, hidden, deleted, and invisible orders cannot be marked WIP", () => {
  for (const item of [
    { ...activeOrder, status: ItemStatus.Done }, { ...activeOrder, status: ItemStatus.Hidden },
    { ...activeOrder, deleted: true }, { ...activeOrder, visible: false },
  ]) {
    const renderer = renderMenu(item);
    assert.equal(wipAction(renderer), undefined);
    act(() => renderer.unmount());
  }
});

test("a pending save disables WIP and ignores repeated selection", async () => {
  let complete: ((item: Item) => void) | undefined;
  let saved: Item | undefined;
  let saves = 0;
  saveOrder = (item) => { saves += 1; saved = item; return new Promise((resolve) => { complete = resolve; }); };
  const renderer = renderMenu();
  const action = wipAction(renderer);
  assert.ok(action);
  let firstSave: Promise<void>;
  act(() => { firstSave = action.props.onSelect({ preventDefault() {} }); });
  assert.equal(wipAction(renderer)?.props.disabled, true);
  await act(async () => wipAction(renderer)?.props.onSelect({ preventDefault() {} }));
  assert.equal(saves, 1);
  await act(async () => { complete?.(saved!); await firstSave; });
  assert.equal(wipAction(renderer)?.props.disabled, false);
  act(() => renderer.unmount());
});

test("failed WIP saves stay open and show a retryable error", async () => {
  let changed = false;
  let prevented = false;
  saveOrder = async () => { throw new Error("Network unavailable"); };
  const renderer = renderMenu(activeOrder, () => { changed = true; });
  const action = wipAction(renderer);
  assert.ok(action);
  await act(async () => action.props.onSelect({ preventDefault() { prevented = true; } }));
  assert.equal(prevented, true);
  assert.equal(changed, false);
  assert.equal(wipAction(renderer)?.props.disabled, false);
  assert.match(JSON.stringify(renderer.root.findByProps({ role: "alert" }).children), /try again/i);
  act(() => renderer.unmount());
});
