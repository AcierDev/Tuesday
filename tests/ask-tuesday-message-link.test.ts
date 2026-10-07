import assert from "node:assert/strict";
import test from "node:test";
import { messageLinkFor } from "../lib/ask-tuesday/message-link";
import type { AskTuesdayResult } from "../lib/ask-tuesday/types";

const result = (...hrefs: string[]): AskTuesdayResult => ({
  kind: "finding", key: "buyer-review", title: "Buyer needs a review", detail: "Check the saved request.",
  facts: [], sources: hrefs.map(href => ({label: "Saved source", href})),
  observedAt: null, observedPrecision: "date", uncertainty: [], orderId: "supplied-order",
});

test("a supplied conversation outranks an earlier generic inbox and unrelated order link", () => {
  assert.deepEqual(messageLinkFor(result(
    "https://www.etsy.com/messages/", "https://www.etsy.com/your/orders/123",
    "https://www.etsy.com/messages/456?ref=messages#latest",
  )), {href: "https://www.etsy.com/messages/456?ref=messages#latest", label: "View messages"});
});

test("the first supplied conversation wins without rebuilding its URL", () => {
  assert.deepEqual(messageLinkFor(result(
    "HTTPS://WWW.ETSY.COM/messages/456/?ref=employee", "https://www.etsy.com/messages/789",
  )), {href: "HTTPS://WWW.ETSY.COM/messages/456/?ref=employee", label: "View messages"});
});

test("exact Etsy host and Etsy subdomains are accepted", () => {
  for (const href of ["https://etsy.com/messages/123", "https://www.etsy.com/messages/123", "https://subdomain.etsy.com/messages/123"]) {
    assert.deepEqual(messageLinkFor(result(href)), {href, label: "View messages"});
  }
});

test("both supplied inbox forms provide an explicitly generic fallback", () => {
  for (const href of ["https://www.etsy.com/messages", "https://www.etsy.com/messages/?ref=inbox"]) {
    assert.deepEqual(messageLinkFor(result(href)), {href, label: "Open Etsy inbox"});
  }
});

test("missing message sources do not synthesize links from customer or order fields", () => {
  assert.equal(messageLinkFor(result()), null);
});

test("homepages, orders and unrelated message paths do not become customer links", () => {
  for (const href of [
    "https://www.etsy.com/", "https://www.etsy.com/your/orders/123",
    "https://www.etsy.com/messages-other/123", "https://www.etsy.com/shop/messages",
    "https://everwoodpanel.com/messages/123", "https://www.etsy.com/messages//",
  ]) assert.equal(messageLinkFor(result(href)), null, href);
});

test("lookalike hosts are rejected", () => {
  for (const href of [
    "https://etsy.com.example.com/messages/123", "https://notetsy.com/messages/123",
    "https://www.etsy.com.evil.example/messages/123", "https://www-etsy.com/messages/123",
  ]) assert.equal(messageLinkFor(result(href)), null, href);
});

test("credentials and explicit ports are rejected including the default HTTPS port", () => {
  for (const href of [
    "https://buyer:password@www.etsy.com/messages/123", "https://buyer@www.etsy.com/messages/123",
    "https://www.etsy.com:443/messages/123", "https://www.etsy.com:8443/messages/123",
  ]) assert.equal(messageLinkFor(result(href)), null, href);
});

test("malformed and non-HTTPS URLs are rejected", () => {
  for (const href of [
    "not a URL", "http://www.etsy.com/messages/123", "//www.etsy.com/messages/123",
    "javascript:alert('messages')", "https:///www.etsy.com/messages/123",
    " https://www.etsy.com/messages/123", "https://www.etsy.com/messages/123\n",
    "https://www.etsy.com\\messages/123", "https://www.etsy.com/messages/12\t3",
  ]) assert.equal(messageLinkFor(result(href)), null, href);
});

test("invalid sources do not hide a later valid conversation", () => {
  assert.deepEqual(messageLinkFor(result(
    "not a URL", "https://etsy.com.example.com/messages/999", "https://etsy.com/messages/123",
  )), {href: "https://etsy.com/messages/123", label: "View messages"});
});
