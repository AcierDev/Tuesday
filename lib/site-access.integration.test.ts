import { strict as assert } from "node:assert";
import { test } from "node:test";
import { NextRequest } from "next/server";
import { middleware } from "../middleware";
import { createAccessToken, SITE_ACCESS_COOKIE } from "./site-access";
import { POST } from "../app/api/site-access/route";
import { SITE_ACCESS_MAX_FAILURES_PER_CLIENT } from "./site-access-rate-limit";

const TEST_SECRET = "integration-test-signing-secret";
const TEST_PASSWORD = "example-test-password";

test("password entry grants remembered access to pages and APIs", async () => {
  process.env.SITE_ACCESS_SECRET = TEST_SECRET;
  process.env.SITE_ACCESS_PASSWORD = TEST_PASSWORD;

  const unauthenticated = await middleware(new NextRequest("http://localhost:3000/orders"));
  assert.equal(unauthenticated.status, 307);
  assert.match(unauthenticated.headers.get("location") || "", /\/access\?next=%2Forders/);

  const apiDenied = await middleware(new NextRequest("http://localhost:3000/api/items"));
  assert.equal(apiDenied.status, 401);

  for (const path of ["/api/heartbeat", "/api/webhooks/easypost"]) {
    const publicPost = await middleware(new NextRequest(`http://localhost:3000${path}`, { method: "POST" }));
    assert.equal(publicPost.status, 200);
    const privateGet = await middleware(new NextRequest(`http://localhost:3000${path}`));
    assert.equal(privateGet.status, 401);
  }

  const wrong = await POST(new NextRequest("http://localhost:3000/api/site-access", {
    method: "POST", body: JSON.stringify({ password: "wrong" }),
  }));
  assert.equal(wrong.status, 401);

  const login = await POST(new NextRequest("http://localhost:3000/api/site-access", {
    method: "POST", body: JSON.stringify({ password: TEST_PASSWORD }),
  }));
  assert.equal(login.status, 200);
  const cookie = login.headers.get("set-cookie") || "";
  assert.match(cookie, /HttpOnly/);

  const authorized = await middleware(new NextRequest("http://localhost:3000/api/items", {
    headers: { cookie },
  }));
  assert.equal(authorized.status, 200);
});

test("only the scheduled cron paths bypass the site password", async () => {
  process.env.SITE_ACCESS_SECRET = TEST_SECRET;
  for (const path of ["/api/debt-snapshots/cron", "/api/stats/delivery-briefing/cron"]) {
    assert.equal((await middleware(new NextRequest(`http://localhost:3000${path}`))).status, 200);
  }
  for (const path of ["/api/shipping/pdfs/cron", "/api/items/cron", "/api/debt-snapshots/cron/extra"]) {
    assert.equal((await middleware(new NextRequest(`http://localhost:3000${path}`))).status, 401);
  }
});

test("repeated wrong passwords from one client are rate limited", async () => {
  process.env.SITE_ACCESS_SECRET = TEST_SECRET;
  process.env.SITE_ACCESS_PASSWORD = TEST_PASSWORD;
  const attempt = (password: string, client: string) => POST(new NextRequest("http://localhost:3000/api/site-access", {
    method: "POST", body: JSON.stringify({ password }), headers: { "x-forwarded-for": `${client}, 10.0.0.1` },
  }));
  for (let index = 0; index < SITE_ACCESS_MAX_FAILURES_PER_CLIENT; index++) {
    assert.equal((await attempt("wrong", "203.0.113.7")).status, 401);
  }
  const limited = await attempt(TEST_PASSWORD, "203.0.113.7");
  assert.equal(limited.status, 429);
  assert.match((await limited.json()).error, /Too many incorrect attempts/);
  assert.ok(Number(limited.headers.get("retry-after")) > 0);
  assert.equal((await attempt(TEST_PASSWORD, "203.0.113.8")).status, 200);
});

test("site access fails closed when deployment environment values are absent", async () => {
  delete process.env.SITE_ACCESS_PASSWORD;
  delete process.env.SITE_ACCESS_SECRET;
  process.env.MONGODB_URI = "mongodb://test-only";

  const login = await POST(new NextRequest("http://localhost:3000/api/site-access", {
    method: "POST", body: JSON.stringify({ password: "anything" }),
  }));
  assert.equal(login.status, 503);
  assert.equal(login.headers.get("set-cookie"), null);

  const token = await createAccessToken("mongodb://test-only");
  const denied = await middleware(new NextRequest("http://localhost:3000/api/items", {
    headers: { cookie: `${SITE_ACCESS_COOKIE}=${token}` },
  }));
  assert.equal(denied.status, 401);
});
