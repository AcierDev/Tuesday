import assert from "node:assert/strict";
import { test } from "node:test";

import { isWithinDueBadgeWarningWindow } from "../config/due-badge";
import { isDueDateWithinStatsWindow } from "../hooks/useOrderStats";

test("the due badge enters its fixed warning window at three days", () => {
  assert.equal(isWithinDueBadgeWarningWindow(4), false);
  assert.equal(isWithinDueBadgeWarningWindow(3), true);
});

test("due statistics use calendar days near midnight", () => {
  const lateReferenceDate = new Date(2026, 6, 27, 23, 30);

  assert.equal(
    isDueDateWithinStatsWindow("2026-07-31", lateReferenceDate),
    false
  );
  assert.equal(
    isDueDateWithinStatsWindow("2026-07-30", lateReferenceDate),
    true
  );
});
