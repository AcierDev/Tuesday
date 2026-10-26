import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";
import { GET } from "../app/api/version/route";
import { middleware } from "../middleware";

const HTTP_OK = 200;
const HTTP_UNAUTHORIZED = 401;
const TEST_SECRET = "version-test-signing-secret";
const SITE = "http://localhost:3000";

test("version reports the baked build values and is never cached", async () => {
  const response = GET();
  assert.equal(response.status, HTTP_OK);
  assert.equal(response.headers.get("cache-control"), "no-store");
  const body = await response.json() as Record<string, string>;
  assert.deepEqual(Object.keys(body).sort(), ["builtAt", "commit", "startedAt"]);
  assert.ok(Number.isFinite(Date.parse(body.startedAt!)));
});

test("only GET /api/version is public; error reports still need site access", async () => {
  process.env.SITE_ACCESS_SECRET = TEST_SECRET;
  assert.equal((await middleware(new NextRequest(`${SITE}/api/version`))).status, HTTP_OK);
  assert.equal((await middleware(new NextRequest(`${SITE}/api/version`, {method: "POST"}))).status, HTTP_UNAUTHORIZED);
  assert.equal((await middleware(new NextRequest(`${SITE}/api/version/extra`))).status, HTTP_UNAUTHORIZED);
  assert.equal((await middleware(new NextRequest(`${SITE}/api/client-errors`))).status, HTTP_UNAUTHORIZED);
  assert.equal((await middleware(new NextRequest(`${SITE}/api/client-errors`, {method: "POST"}))).status, HTTP_UNAUTHORIZED);
});
