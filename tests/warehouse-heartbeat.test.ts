import assert from "node:assert/strict";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { getWarehouseIP, heartbeatIP, saveWarehouseIP } from "../app/api/lib/warehouseStorage";

test("only a literal IP address from the first forwarded hop is accepted", () => {
  assert.equal(heartbeatIP("203.0.113.9, 10.0.0.1"), "203.0.113.9");
  assert.equal(heartbeatIP("::ffff:127.0.0.1"), "::ffff:127.0.0.1");
  assert.equal(heartbeatIP("2001:db8::1"), "2001:db8::1");
  for (const value of [null, "", "Unknown IP", "<script>", "203.0.113.999", "example.com"]) {
    assert.equal(heartbeatIP(value), null, String(value));
  }
});

test("saving replaces the file atomically and leaves no temp files", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "warehouse-"));
  const file = path.join(directory, "data", "warehouse.json");
  try {
    await saveWarehouseIP("203.0.113.9", file);
    await saveWarehouseIP("203.0.113.10", file);
    assert.equal((await getWarehouseIP(file))?.ip, "203.0.113.10");
    assert.equal(JSON.parse(await readFile(file, "utf8")).ip, "203.0.113.10");
    assert.deepEqual(await readdir(path.dirname(file)), ["warehouse.json"]);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
