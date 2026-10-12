import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createRequire, Module } from "node:module";
import React from "react";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";
import type { Item } from "../typings/types";

const require = createRequire(import.meta.url);
const ORIGINAL_CREATED_AT = 123;
const ORIGINAL_INDEX = 4;
const ORDER = {
  id: "existing-order",
  customerName: "[WF] Jane Doe",
  size: "36 x 18",
  design: "Mint",
  dueDate: "2026-09-20",
  status: "Packaging",
  createdAt: ORIGINAL_CREATED_AT,
  index: ORIGINAL_INDEX,
  visible: true,
  deleted: false,
  isScheduled: true,
  notes: "Keep these notes",
  tags: { isVertical: true, hasCustomerMessage: true },
  shippingDetails: { name: "Jane Doe", street1: "123 Main Street" },
} as Item;
const originalFetch = globalThis.fetch;
let notificationCount = 0;
let OrderFormDialog: typeof import("../components/orders/OrderFormDialog").OrderFormDialog;

before(async () => {
  // Render dialog contents inline so form behavior can be tested without a DOM portal.
  const dialogPath = require.resolve("../components/ui/dialog");
  const dialogModule = new Module(dialogPath);
  dialogModule.loaded = true;
  require.cache[dialogPath] = dialogModule;
  dialogModule.exports = {
    Dialog: ({ children }: React.PropsWithChildren) => <>{children}</>,
    DialogContent: ({ children }: React.PropsWithChildren) => <>{children}</>,
    DialogTitle: ({ children }: React.PropsWithChildren) => <h1>{children}</h1>,
  };
  const calendarPath = require.resolve("../components/ui/calendar");
  const calendarModule = new Module(calendarPath);
  calendarModule.loaded = true;
  calendarModule.exports = { Calendar: () => null };
  require.cache[calendarPath] = calendarModule;
  // Load only the real date functions used by this form, avoiding the full barrel.
  const datePath = require.resolve("date-fns");
  const dateModule = new Module(datePath);
  dateModule.loaded = true;
  dateModule.exports = Object.assign({}, ...[
    "addMonths", "endOfMonth", "format", "startOfMonth", "parseISO", "isValid",
  ].map((name) => require(`date-fns/${name}`)));
  require.cache[datePath] = dateModule;
  (globalThis as typeof globalThis & { React: typeof React }).React = React;
  globalThis.fetch = async () => {
    notificationCount += 1;
    return new Response("{}");
  };
  ({ OrderFormDialog } = await import("../components/orders/OrderFormDialog"));
});

after(() => { globalThis.fetch = originalFetch; });

function submitButton(renderer: ReactTestRenderer) {
  const button = renderer.root.findAllByType("button").find((node) =>
    node.children.includes("Save Changes") || node.children.includes("Create Order")
  );
  assert.ok(button);
  return button;
}

test("edit uses the shared form, loads company and fields, and preserves saved order data", async () => {
  let saved: Partial<Item> | undefined;
  let closed = false;
  let renderer: ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(<OrderFormDialog isOpen initialItem={ORDER}
      onClose={() => { closed = true; }} onSubmit={async (order) => { saved = order; }} />);
  });
  assert.equal(renderer!.root.findByType("h1").children.join(""), "Edit Order");
  const customer = renderer!.root.findByProps({ placeholder: "Customer name" });
  assert.equal(customer.props.value, "Jane Doe");
  await act(async () => customer.props.onChange({ target: { value: "Updated Name" } }));
  await act(async () => submitButton(renderer!).props.onClick());
  assert.deepEqual(saved, { ...ORDER, customerName: "[WF] Updated Name" });
  assert.equal(closed, true);
  assert.equal(notificationCount, 0);
  act(() => renderer!.unmount());
});

test("create uses the same controls with empty initial values", async () => {
  let renderer: ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(<OrderFormDialog isOpen onClose={() => undefined} onSubmit={async () => undefined} />);
  });
  assert.equal(renderer!.root.findByType("h1").children.join(""), "New Order");
  assert.equal(renderer!.root.findByProps({ placeholder: "Customer name" }).props.value, "");
  assert.ok(submitButton(renderer!).children.includes("Create Order"));
  act(() => renderer!.unmount());
});

test("edit sends only address corrections and preserves other order instructions", async () => {
  let saved: Partial<Item> | undefined;
  let renderer: ReactTestRenderer;
  const item = { ...ORDER, shippingDetails: { ...ORDER.shippingDetails, street2: "Unit 9", country: "CA", state: "Ontario" },
    artworkInstructions: { requirements: "Keep this artwork" }, etsyOrder: { receiptId: "123456", transactionId: "987654" } } as Item;
  await act(async () => { renderer = TestRenderer.create(<OrderFormDialog isOpen initialItem={item}
    onClose={() => undefined} onSubmit={async order => { saved = order; }} />); });
  assert.equal(renderer!.root.findByProps({ "aria-label": "Recipient name" }).props.value, "Jane Doe");
  assert.equal(renderer!.root.findByProps({ "aria-label": "State / province" }).props.value, "Ontario");
  await act(async () => renderer!.root.findByProps({ "aria-label": "Address line 1" }).props.onChange({ target: { value: "456 New Street" } }));
  await act(async () => submitButton(renderer!).props.onClick());
  assert.deepEqual(saved?.shippingDetails, { street1: "456 New Street" });
  assert.deepEqual((saved as any)?.artworkInstructions, { requirements: "Keep this artwork" });
  assert.equal(saved?.notes, ORDER.notes);
  assert.equal(saved?.size, ORDER.size);
  assert.equal(saved?.dueDate, ORDER.dueDate);
  assert.deepEqual(saved?.tags, ORDER.tags);
  act(() => renderer!.unmount());
});

test("failed address save keeps entered corrections and shows an inline error", async () => {
  let renderer: ReactTestRenderer;
  await act(async () => { renderer = TestRenderer.create(<OrderFormDialog isOpen initialItem={ORDER}
    onClose={() => assert.fail("failed save must remain open")} onSubmit={async () => { throw new Error("Offline"); }} />); });
  await act(async () => renderer!.root.findByProps({ "aria-label": "Postal code" }).props.onChange({ target: { value: "90210" } }));
  await act(async () => submitButton(renderer!).props.onClick());
  assert.equal(renderer!.root.findByProps({ "aria-label": "Postal code" }).props.value, "90210");
  assert.match(renderer!.root.findByProps({ role: "alert" }).children.join(""), /save/i);
  act(() => renderer!.unmount());
});
