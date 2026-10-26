import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createRequire, Module } from "node:module";
import React from "react";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";
import { create } from "zustand";
import { ItemStatus, type Item } from "../typings/types";

const require = createRequire(import.meta.url);
const ORDER: Item = {
  id: "name-order", customerName: "Jane Doe", createdAt: 1, status: ItemStatus.New,
  visible: true, deleted: false, index: 0, dueDate: "2099-01-01",
};
let touch = false;
let NameCell: typeof import("../components/cells/NameCell").NameCell;
const originalWindow = (globalThis as { window?: unknown }).window;

before(async () => {
  function replaceModule(path: string, exports: unknown) {
    const resolved = require.resolve(path);
    const replacement = new Module(resolved);
    replacement.loaded = true;
    replacement.exports = exports;
    require.cache[resolved] = replacement;
  }
  // Real zustand stores with only the slices the cell reads.
  replaceModule("../stores/useOrderStore", {
    useOrderStore: create(() => ({ items: [ORDER], updateItem: async (item: Item) => item })),
  });
  replaceModule("../stores/useWeeklyScheduleStore", {
    useWeeklyScheduleStore: create(() => ({ schedules: [] })),
  });
  const passthrough = ({ children }: React.PropsWithChildren) => <>{children}</>;
  replaceModule("../components/ui/tooltip", {
    Tooltip: passthrough, TooltipTrigger: passthrough, TooltipContent: passthrough,
  });
  (globalThis as { React?: typeof React }).React = React;
  (globalThis as { window?: unknown }).window = {
    matchMedia: () => ({ matches: touch, addEventListener() {}, removeEventListener() {} }),
  };
  ({ NameCell } = await import("../components/cells/NameCell"));
});

after(() => {
  (globalThis as { window?: unknown }).window = originalWindow;
});

async function render() {
  let renderer: ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(
      <NameCell item={ORDER} columnValue={{ text: ORDER.customerName!, columnName: "Customer Name" }} />
    );
  });
  return renderer!;
}

function nameTarget(renderer: ReactTestRenderer) {
  return renderer.root.findAll((node) => node.type === "div" && "onClick" in node.props && node.props.className?.includes("flex-1"))[0];
}

test("clicking a name edits it with a mouse", async () => {
  touch = false;
  const renderer = await render();
  const target = nameTarget(renderer);
  assert.ok(target?.props.onClick, "name is editable by click");
  await act(async () => target!.props.onClick());
  assert.equal(renderer.root.findAllByType("input").length, 1);
  act(() => renderer.unmount());
});

test("tapping a name on a touch screen doesn't open the keyboard", async () => {
  touch = true;
  const renderer = await render();
  assert.equal(nameTarget(renderer)?.props.onClick, undefined);
  assert.equal(renderer.root.findAllByType("input").length, 0);
  act(() => renderer.unmount());
});
