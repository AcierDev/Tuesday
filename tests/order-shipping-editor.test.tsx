import assert from "node:assert/strict";
import { after, afterEach, before, test } from "node:test";
import { createRequire, Module } from "node:module";
import React from "react";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";
import { useOrderStore } from "../stores/useOrderStore";
import { ItemStatus, type Item, type ShippingDetails } from "../typings/types";

const require = createRequire(import.meta.url);
const ORIGINAL_CREATED_AT = 123;
const ORIGINAL_INDEX = 4;
const SUCCESS_COUNT = 1;
const BAD_GATEWAY_STATUS = 502;
const NO_SAVED_CALLBACKS = 0;
const SINGLE_REQUEST = 1;
const RETRY_REQUEST_COUNT = 2;
const EMPTY_COUNT = 0;
const FIRST_ELEMENT = 0;
const FIRST_ETSY_UNIT = 1;
const ORIGINAL_ADDRESS: ShippingDetails = {
  name: "Jane Doe", company: "Studio", street1: "123 Original Street", street2: "Unit 8",
  street3: "Building B", city: "Toronto", state: "Ontario", postalCode: "M5V 2T6", country: "CA",
  phone: "+14165550101", buyer_email: "jane@example.com", residential: false, addressVerified: "verified",
};
const ORDER = {
  id: "address-dialog-order", customerName: "Jane Doe", size: "36 x 18", design: "Mint",
  dueDate: "2026-11-01", status: ItemStatus.Packaging, createdAt: ORIGINAL_CREATED_AT,
  index: ORIGINAL_INDEX, visible: true, deleted: false, isScheduled: true,
  notes: "Original instructions", tags: { isVertical: true, hasCustomerMessage: true },
  shippingDetails: ORIGINAL_ADDRESS,
  etsyOrder: { receiptId: "123456", transactionId: "987654", quantityIndex: FIRST_ETSY_UNIT },
  artworkInstructions: { requirements: "Original artwork" },
} as Item & { artworkInstructions: { requirements: string } };
const originalFetch = globalThis.fetch;
const originalState = useOrderStore.getState();
const originalDialogModule = require.cache[require.resolve("../components/ui/dialog")];
let OrderShippingAddressDialog: typeof import("../components/orders/OrderShippingAddressDialog").OrderShippingAddressDialog;
let renderer: ReactTestRenderer | undefined;

before(async () => {
  // Only replace the DOM portal; the fields, save client, and order store stay real.
  const dialogPath = require.resolve("../components/ui/dialog");
  const dialogModule = new Module(dialogPath);
  dialogModule.loaded = true;
  const Wrapper = ({ children }: React.PropsWithChildren) => <>{children}</>;
  dialogModule.exports = { Dialog: Wrapper, DialogContent: Wrapper, DialogHeader: Wrapper,
    DialogTitle: ({ children }: React.PropsWithChildren) => <h1>{children}</h1>,
    DialogDescription: ({ children }: React.PropsWithChildren) => <p>{children}</p> };
  require.cache[dialogPath] = dialogModule;
  ({ OrderShippingAddressDialog } = await import("../components/orders/OrderShippingAddressDialog"));
});

afterEach(() => {
  if (renderer) act(() => renderer!.unmount());
  renderer = undefined;
  globalThis.fetch = originalFetch;
  useOrderStore.setState(originalState);
});

after(() => {
  const dialogPath = require.resolve("../components/ui/dialog");
  if (originalDialogModule) require.cache[dialogPath] = originalDialogModule;
  else delete require.cache[dialogPath];
});

function confirmedResponse(shippingDetails: ShippingDetails) {
  return new Response(JSON.stringify({ matchedCount: SUCCESS_COUNT, modifiedCount: SUCCESS_COUNT, shippingDetails }));
}

async function openEditor(onSaved: (item: Item) => void = () => undefined) {
  useOrderStore.setState({ items: [ORDER], allItems: [ORDER], scheduledItems: [ORDER], doneItems: [ORDER] });
  await act(async () => {
    renderer = TestRenderer.create(<OrderShippingAddressDialog item={ORDER} onSaved={onSaved}
      onClose={() => assert.fail("The editor must remain open while saving or reporting an error")} />);
  });
}

function saveButton() {
  const button = renderer!.root.findAllByType("button").find(node =>
    node.children.includes("Save address") || node.children.includes("Saving…"));
  assert.ok(button);
  return button;
}

async function changeField(label: string, value: string) {
  await act(async () => renderer!.root.findByProps({ "aria-label": label }).props.onChange({ target: { value } }));
}

test("pending address save disables editing and double submission until the API confirms success", async () => {
  let resolveResponse!: (response: Response) => void;
  const pending = new Promise<Response>(resolve => { resolveResponse = resolve; });
  const requests: Array<{ url: unknown; options?: RequestInit }> = [];
  const saved: Item[] = [];
  globalThis.fetch = async (url, options) => { requests.push({ url, options }); return pending; };
  await openEditor(item => saved.push(item));
  await changeField("Address line 1", "456 New Street");
  const submit = saveButton().props.onClick;
  let savePromise!: Promise<void>;
  act(() => { savePromise = submit(); void submit(); });
  assert.equal(requests.length, SINGLE_REQUEST);
  assert.equal(saved.length, NO_SAVED_CALLBACKS);
  assert.equal(renderer!.root.findByProps({ role: "status" }).children.join(""), "Saving…");
  assert.ok(renderer!.root.findAllByType("input").every(node => node.props.disabled === true));
  assert.ok(renderer!.root.findAllByType("button").every(node => node.props.disabled === true));
  assert.equal(useOrderStore.getState().items[FIRST_ELEMENT]?.shippingDetails?.street1, "123 Original Street");
  await act(async () => { resolveResponse(confirmedResponse({ ...ORIGINAL_ADDRESS, street1: "456 New Street", addressVerified: "" })); await savePromise; });
  assert.equal(saved.length, SINGLE_REQUEST);
  assert.equal(renderer!.root.findByProps({ role: "status" }).children.join(""), "Saved to order");
  assert.ok(renderer!.root.findAllByType("input").every(node => node.props.disabled === false));
  assert.equal(saveButton().props.disabled, true);
});

test("failed save retains corrections and enables a successful retry without reporting Saved early", async () => {
  const saved: Item[] = [];
  const payloads: unknown[] = [];
  globalThis.fetch = async (_url, options) => {
    payloads.push(JSON.parse(String(options?.body)));
    return payloads.length === SINGLE_REQUEST
      ? new Response(JSON.stringify({ error: "Address service unavailable" }), { status: BAD_GATEWAY_STATUS })
      : confirmedResponse({ ...ORIGINAL_ADDRESS, postalCode: "M5V 3A8", addressVerified: "" });
  };
  await openEditor(item => saved.push(item));
  await changeField("Postal code", "M5V 3A8");
  await act(async () => saveButton().props.onClick());
  assert.equal(renderer!.root.findByProps({ "aria-label": "Postal code" }).props.value, "M5V 3A8");
  assert.match(renderer!.root.findByProps({ role: "alert" }).children.join(""), /unavailable/i);
  assert.equal(saved.length, NO_SAVED_CALLBACKS);
  assert.equal(saveButton().props.disabled, false);
  assert.equal(useOrderStore.getState().items[FIRST_ELEMENT]?.shippingDetails?.postalCode, "M5V 2T6");
  await act(async () => saveButton().props.onClick());
  assert.equal(payloads.length, RETRY_REQUEST_COUNT);
  assert.deepEqual(payloads[FIRST_ELEMENT], { id: ORDER.id, updates: { shippingDetails: { postalCode: "M5V 3A8" } } });
  assert.deepEqual(payloads.at(-SINGLE_REQUEST), payloads[FIRST_ELEMENT]);
  assert.equal(saved.length, SINGLE_REQUEST);
  assert.equal(renderer!.root.findAllByProps({ role: "alert" }).length, EMPTY_COUNT);
  assert.equal(renderer!.root.findByProps({ role: "status" }).children.join(""), "Saved to order");
});

test("address-only save preserves newer order instructions and reopens the complete confirmed address", async () => {
  let resolveResponse!: (response: Response) => void;
  const pending = new Promise<Response>(resolve => { resolveResponse = resolve; });
  let request: { url: unknown; options?: RequestInit } | undefined;
  let saved: Item | undefined;
  globalThis.fetch = async (url, options) => { request = { url, options }; return pending; };
  await openEditor(item => { saved = item; });
  await changeField("Address line 1", "456 New Street");
  let savePromise!: Promise<void>;
  act(() => { savePromise = saveButton().props.onClick(); });
  const latest = { ...ORDER, notes: "Newer instructions", size: "48 x 24", dueDate: "2026-12-01",
    artworkInstructions: { requirements: "Newer artwork" } };
  useOrderStore.setState({ items: [latest], allItems: [latest], scheduledItems: [latest], doneItems: [latest] });
  const confirmed = { ...ORIGINAL_ADDRESS, street1: "456 New Street", street2: "Unit 9", addressVerified: "" };
  await act(async () => { resolveResponse(confirmedResponse(confirmed)); await savePromise; });
  assert.equal(request?.url, "/api/items");
  assert.equal(request?.options?.method, "PATCH");
  assert.deepEqual(JSON.parse(String(request?.options?.body)), { id: ORDER.id, updates: { shippingDetails: { street1: "456 New Street" } } });
  const expected = { ...latest, shippingDetails: confirmed };
  assert.deepEqual(saved, expected);
  for (const collection of ["items", "allItems", "scheduledItems", "doneItems"] as const) {
    assert.deepEqual(useOrderStore.getState()[collection][FIRST_ELEMENT], expected);
  }
  act(() => renderer!.unmount());
  await act(async () => {
    renderer = TestRenderer.create(<OrderShippingAddressDialog item={useOrderStore.getState().items[FIRST_ELEMENT]!}
      onClose={() => undefined} />);
  });
  for (const [label, value] of [["Recipient name", "Jane Doe"], ["Address line 1", "456 New Street"],
    ["Address line 2 / unit", "Unit 9"], ["Address line 3", "Building B"], ["State / province", "Ontario"],
    ["Postal code", "M5V 2T6"], ["Country code", "CA"], ["Recipient email", "jane@example.com"],
    ["Etsy receipt ID", "123456"]]) {
    assert.equal(renderer!.root.findByProps({ "aria-label": label }).props.value, value);
  }
  assert.equal(saveButton().props.disabled, true);
});

test("malformed address confirmation keeps the draft open and leaves the saved order intact", async () => {
  const saved: Item[] = [];
  globalThis.fetch = async () => new Response(JSON.stringify({ matchedCount: SUCCESS_COUNT,
    modifiedCount: SUCCESS_COUNT, shippingDetails: "not an address object" }));
  await openEditor(item => saved.push(item));
  await changeField("Address line 1", "456 New Street");
  await act(async () => saveButton().props.onClick());
  assert.equal(saved.length, NO_SAVED_CALLBACKS);
  assert.equal(renderer!.root.findByProps({ "aria-label": "Address line 1" }).props.value, "456 New Street");
  assert.ok(renderer!.root.findByProps({ role: "alert" }));
  assert.deepEqual(useOrderStore.getState().items[FIRST_ELEMENT]?.shippingDetails, ORIGINAL_ADDRESS);
  assert.equal(saveButton().props.disabled, false);
});
