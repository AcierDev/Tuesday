import assert from "node:assert/strict";
import test from "node:test";

import { reportingAccess } from "../lib/reporting/auth";

test("reporting endpoints fail closed without configured credentials", () => {
  assert.equal(reportingAccess("Bearer secret", "read", {}), "unconfigured");
  assert.equal(reportingAccess("Bearer secret", "write", {}), "unconfigured");
});

test("read and write credentials are separate", () => {
  const config = { readToken: "read-secret", writeToken: "write-secret" };
  assert.equal(reportingAccess("Bearer read-secret", "read", config), "allowed");
  assert.equal(reportingAccess("Bearer read-secret", "write", config), "denied");
  assert.equal(reportingAccess("Bearer write-secret", "write", config), "allowed");
  assert.equal(reportingAccess("Bearer wrong", "read", config), "denied");
  assert.equal(reportingAccess(null, "read", config), "denied");
});
