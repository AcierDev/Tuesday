import assert from "node:assert/strict";
import test from "node:test";
import {
  createMinuteThrottle,
  NOTIFICATION_FIELD_MAX_LENGTH,
  orderNotificationMessage,
  parseOrderNotification,
} from "../app/api/notifications/notification";

test("order notifications require the three text fields and keep each on one line", () => {
  const parsed = parseOrderNotification({ customerName: " Ana\nCall 555 ", size: "24x36", design: "Oak", extra: "x" });
  assert.deepEqual(parsed, { customerName: "Ana Call 555", size: "24x36", design: "Oak" });
  assert.equal(orderNotificationMessage(parsed!).split("\n").length, 4);
  for (const input of [null, {}, { customerName: "Ana", size: "24x36" }, { customerName: 5, size: "1", design: "2" },
    { customerName: "  ", size: "1", design: "2" }]) assert.equal(parseOrderNotification(input), null);
});

test("long fields are capped", () => {
  const parsed = parseOrderNotification({ customerName: "x".repeat(1000), size: "1", design: "2" });
  assert.equal(parsed?.customerName.length, NOTIFICATION_FIELD_MAX_LENGTH);
});

test("the throttle allows a fixed number per minute", () => {
  const allow = createMinuteThrottle(2);
  const start = 1_700_000_000_000;
  assert.equal(allow(start), true);
  assert.equal(allow(start + 1), true);
  assert.equal(allow(start + 2), false);
  assert.equal(allow(start + 60_000), true);
});

test("text alerts reach remaining recipients and fail only when every send fails", async (context) => {
  context.mock.method(console, "log", () => undefined);
  const errors = context.mock.method(console, "error", () => undefined);
  const { AlertManager, AlertsNotConfiguredError } = await import("../backend/src/AlertManager");
  const manager = AlertManager as unknown as { client: { sendMail: (options: unknown) => Promise<unknown> } };
  const original = manager.client;
  const previousToken = process.env.ZEPTO_TOKEN;
  let failing = 1;
  let sent = 0;
  manager.client = { sendMail: async () => {
    if (failing-- > 0) throw Object.assign(new Error("9172005099 Secret body"), { code: "TM_3201" });
    sent += 1;
  } };
  try {
    process.env.ZEPTO_TOKEN = "test-token-not-real";
    await AlertManager.sendText("Ben & Akiva", "New Message", "Secret body");
    assert.equal(sent, 1);
    const logged = errors.mock.calls.map((call) => call.arguments.join(" ")).join(" ");
    assert.match(logged, /1 of 2 recipients: Error \(code TM_3201\)/);
    assert.doesNotMatch(logged, /9172005099|Secret body/);

    failing = 2;
    await assert.rejects(AlertManager.sendText("Ben & Akiva", "New Message", "x"), /could not be delivered/);

    delete process.env.ZEPTO_TOKEN;
    await assert.rejects(AlertManager.sendText("Ben", "New Message", "x"), AlertsNotConfiguredError);
    assert.match(errors.mock.calls.at(-1)!.arguments.join(" "), /ZEPTO_TOKEN is not set/);
  } finally {
    manager.client = original;
    if (previousToken === undefined) delete process.env.ZEPTO_TOKEN;
    else process.env.ZEPTO_TOKEN = previousToken;
  }
});
