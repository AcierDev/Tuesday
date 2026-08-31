import assert from "node:assert/strict";
import { test } from "node:test";
import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { RecentLabelIndicator } from "../components/shipping/RecentLabelIndicator";

test("recent labels show a clear new indicator", () => {
  const recentMarkup = renderToStaticMarkup(
    createElement(RecentLabelIndicator, { isRecent: true })
  );
  const oldMarkup = renderToStaticMarkup(
    createElement(RecentLabelIndicator, { isRecent: false })
  );

  assert.match(recentMarkup, />NEW</);
  assert.doesNotMatch(oldMarkup, />NEW</);
});
