import { strict as assert } from "node:assert";
import { test } from "node:test";
import { NextRequest } from "next/server";
import { middleware } from "../middleware";
import { POST } from "../app/api/site-access/route";
import { DEFAULT_SITE_ACCESS_PASSWORD } from "./site-access-config";

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

test("site access works when deployment environment overrides are absent", async () => {
  delete process.env.SITE_ACCESS_PASSWORD;
  delete process.env.SITE_ACCESS_SECRET;
  process.env.MONGODB_URI = "mongodb://test-only";

  const login = await POST(new NextRequest("http://localhost:3000/api/site-access", {
    method: "POST", body: JSON.stringify({ password: DEFAULT_SITE_ACCESS_PASSWORD }),
  }));
  assert.equal(login.status, 200);

  const authorized = await middleware(new NextRequest("http://localhost:3000/orders", {
    headers: { cookie: login.headers.get("set-cookie") || "" },
  }));
  assert.equal(authorized.status, 200);
});
