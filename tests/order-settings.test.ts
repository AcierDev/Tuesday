import assert from "node:assert/strict";
import { test } from "node:test";

import { removeDeprecatedDueBadgeDays } from "../lib/order-settings";

test("legacy saved settings discard dueBadgeDays", () => {
  assert.deepEqual(
    removeDeprecatedDueBadgeDays({
      dueBadgeDays: 14,
      recentEditHours: 24,
    }),
    { recentEditHours: 24 }
  );
});
