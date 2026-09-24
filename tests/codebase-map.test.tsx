import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import React from "react";
import TestRenderer from "react-test-renderer";

import CodebaseMapPage from "../app/codebase-map/page";

test("codebase map labels the core operational areas", () => {
  const source = readFileSync(new URL("../app/codebase-map/page.tsx", import.meta.url), "utf8");
  const tree = TestRenderer.create(<CodebaseMapPage />).toJSON();
  const rendered = JSON.stringify(tree);

  assert.match(rendered, /Order Management/);
  assert.match(rendered, /Production Planning/);
  assert.match(rendered, /Shipping/);
  assert.match(rendered, /Operations Analytics/);
  assert.doesNotMatch(rendered, /map-arrow/);
  assert.match(source, /^"use client";/);
});
