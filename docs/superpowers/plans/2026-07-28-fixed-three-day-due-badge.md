# Fixed Three-Day Due Badge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the configurable due-badge threshold and enforce a system-wide three-calendar-day warning window.

**Architecture:** A pure configuration module owns the fixed threshold and warning predicate. Badge rendering, order statistics, and automatic On Deck promotion consume that contract directly; the obsolete setting is removed from UI, local state, server synchronization, and API routes.

**Tech Stack:** TypeScript 5.6, React 18, Next.js 15, `node:test` via `tsx`

## Global Constraints

- `DUE_BADGE_WARNING_DAYS` is the only threshold source and equals `3`.
- Preserve existing due-today, overdue, held-item, and paused-date behavior.
- Preserve unrelated uncommitted edits, especially in `DueBadge.tsx` and `typings/types.ts`.
- Add no dependencies.
- Do not commit or push.

---

### Task 1: Fixed Warning Contract

**Files:**
- Create: `config/due-badge.ts`
- Create: `tests/due-badge.test.ts`

**Interfaces:**
- Produces: `DUE_BADGE_WARNING_DAYS: 3`
- Produces: `isWithinDueBadgeWarningWindow(daysRemaining: number): boolean`

- [ ] **Step 1: Write the failing boundary test**

```ts
import assert from "node:assert/strict";
import { test } from "node:test";

import { isWithinDueBadgeWarningWindow } from "../config/due-badge";

test("the due badge enters its fixed warning window at three days", () => {
  assert.equal(isWithinDueBadgeWarningWindow(4), false);
  assert.equal(isWithinDueBadgeWarningWindow(3), true);
});
```

- [ ] **Step 2: Verify RED**

Run: `npx tsx --test tests/due-badge.test.ts`

Expected: FAIL because `config/due-badge.ts` does not exist.

- [ ] **Step 3: Add the minimal fixed-threshold module**

```ts
export const DUE_BADGE_WARNING_DAYS = 3;

export function isWithinDueBadgeWarningWindow(
  daysRemaining: number
): boolean {
  return daysRemaining <= DUE_BADGE_WARNING_DAYS;
}
```

- [ ] **Step 4: Verify GREEN**

Run: `npx tsx --test tests/due-badge.test.ts`

Expected: PASS.

- [ ] **Step 5: Review the task diff**

Run: `git diff -- config/due-badge.ts tests/due-badge.test.ts`

Expected: only the fixed contract and its boundary test.

### Task 2: Replace Threshold Parameters in Every Consumer

**Files:**
- Create: `tests/due-badge-contract.type-test.tsx`
- Create: `tests/tsconfig.json`
- Modify: `components/cells/DueBadge.tsx`
- Modify: `components/cells/NameCell.tsx`
- Modify: `components/production-planning/OrderCard.tsx`
- Modify: `hooks/useAutoPromoteByDueDate.ts`
- Modify: `hooks/useOrderStats.ts`
- Modify: `app/orders/page.tsx`
- Modify: `utils/functions.tsx`
- Modify: `tailwind.config.ts`

**Interfaces:**
- Consumes: `isWithinDueBadgeWarningWindow(daysRemaining: number): boolean`
- Produces: `DueBadgeProps` without `range`
- Produces: `useOrderStats({ items }: { items: Item[] | undefined })`

- [ ] **Step 1: Write a compile-time contract test**

Add a source-only TypeScript config that excludes generated `.next` files:

```json
{
  "extends": "../tsconfig.json",
  "compilerOptions": {
    "incremental": false
  },
  "include": ["../**/*.ts", "../**/*.tsx"],
  "exclude": ["../node_modules", "../.next"]
}
```

Add the contract:

```tsx
import { DueBadge } from "../components/cells/DueBadge";
import { useOrderStats } from "../hooks/useOrderStats";
import type { Item } from "../typings/types";

declare const item: Item;
declare const items: Item[] | undefined;

export function FixedThresholdContracts() {
  useOrderStats({ items });
  return <DueBadge item={item} />;
}
```

- [ ] **Step 2: Verify RED**

Run: `npx tsc --project tests/tsconfig.json`

Expected: FAIL because `DueBadge` still requires `range` and `useOrderStats` still requires `dueBadgeDays`.

- [ ] **Step 3: Make `DueBadge` consume the fixed predicate**

Remove `range` from `DueBadgeProps` and the component arguments. Import `isWithinDueBadgeWarningWindow` from `@/config/due-badge`, then replace:

```ts
delta === 0 || delta <= range
```

with:

```ts
isWithinDueBadgeWarningWindow(delta)
```

Keep the existing `delta < 0` branch first so overdue items remain red.

- [ ] **Step 4: Remove `range` from badge callers**

Use:

```tsx
<DueBadge item={item} />
```

in `NameCell.tsx`, removing its now-unused settings context.

Use:

```tsx
<DueBadge
  item={meta.item}
  referenceDate={referenceDate}
  interactive={false}
/>
```

in `OrderCard.tsx`, removing its now-unused settings context.

- [ ] **Step 5: Fix automatic On Deck promotion**

Remove `useOrderSettings`, `settings`, and `range` from `useAutoPromoteByDueDate.ts`. Import the fixed predicate and calculate urgency with:

```ts
const isUrgent =
  d !== null && isWithinDueBadgeWarningWindow(d);
```

Use this effect dependency list:

```ts
[items, updateItem]
```

- [ ] **Step 6: Fix due statistics**

Remove `dueBadgeDays` from `UseOrderStatsProps` and `useOrderStats` arguments. Import the fixed predicate and return:

```ts
return isWithinDueBadgeWarningWindow(daysDifference);
```

Make the `isItemDue` callback dependency list empty, then call the hook in `app/orders/page.tsx` with:

```ts
const dueCounts = useOrderStats({ items });
```

- [ ] **Step 7: Remove the unused legacy badge helper**

Delete `getDueBadge` from `utils/functions.tsx`, along with its now-unused `Badge` and `differenceInCalendarDays` imports. Update the `tailwind.config.ts` comment for the `utils` content path to describe general JSX utility classes rather than `getDueBadge`.

- [ ] **Step 8: Verify GREEN**

Run:

```bash
npx tsx --test tests/due-badge.test.ts
npx tsc --project tests/tsconfig.json
```

Expected: boundary test and compile-time contract pass.

- [ ] **Step 9: Review the task diff**

Run: `git diff -- components/cells/DueBadge.tsx components/cells/NameCell.tsx components/production-planning/OrderCard.tsx hooks/useAutoPromoteByDueDate.ts hooks/useOrderStats.ts app/orders/page.tsx utils/functions.tsx tailwind.config.ts tests/due-badge-contract.type-test.tsx`

Expected: threshold parameters are gone while pre-existing paused-date edits remain.

### Task 3: Remove Setting UI, Persistence, and APIs

**Files:**
- Create: `lib/order-settings.ts`
- Create: `tests/order-settings.test.ts`
- Create: `tests/order-settings-contract.type-test.ts`
- Modify: `typings/types.ts`
- Modify: `contexts/OrderSettingsContext.tsx`
- Modify: `components/ui/Navbar.tsx`
- Modify: `components/settings/SettingsPanel.tsx`
- Delete: `components/settings/DueBadgeSettings.tsx`
- Delete: `app/api/settings/route.ts`
- Delete: `app/api/settings/changes/route.ts`

**Interfaces:**
- Produces: `removeDeprecatedDueBadgeDays(settings: Record<string, unknown>): Record<string, unknown>`
- Produces: `OrderSettings` without `dueBadgeDays`

- [ ] **Step 1: Write failing migration and type-contract tests**

Add to `tests/order-settings.test.ts`:

```ts
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
```

Add to `tests/order-settings-contract.type-test.ts`:

```ts
import type { OrderSettings } from "../typings/types";

type HasDueBadgeDays =
  "dueBadgeDays" extends keyof OrderSettings ? true : false;
const hasDueBadgeDays: HasDueBadgeDays = false;
void hasDueBadgeDays;
```

- [ ] **Step 2: Verify RED**

Run:

```bash
npx tsx --test tests/order-settings.test.ts
npx tsc --noEmit --strict --skipLibCheck --module esnext --moduleResolution bundler --target esnext tests/order-settings-contract.type-test.ts
```

Expected: runtime test fails because the migration module is absent; type-check fails because `OrderSettings` still has `dueBadgeDays`.

- [ ] **Step 3: Add the legacy storage sanitizer**

```ts
export function removeDeprecatedDueBadgeDays(
  settings: Record<string, unknown>
): Record<string, unknown> {
  const supportedSettings = { ...settings };
  delete supportedSettings.dueBadgeDays;
  return supportedSettings;
}
```

- [ ] **Step 4: Simplify settings state**

In `OrderSettingsContext.tsx`:

- Remove `dueBadgeDays` from `defaultSettings`.
- Remove all global settings fetch, patch, debounce, and SSE code and its constants/refs.
- Remove the now-unused `useRef` import.
- After parsing local storage, pass the object through `removeDeprecatedDueBadgeDays` before merging it with `defaultSettings`.
- Keep existing localStorage load/save and all unrelated settings behavior.

In `typings/types.ts`, remove only:

```ts
dueBadgeDays: number;
```

Preserve the existing paused-date additions.

- [ ] **Step 5: Remove the settings UI**

In `Navbar.tsx`, remove the Due Badge tab, its `Clock` import, and its slider branch. Keep the Recent Edits slider.

In `SettingsPanel.tsx`, remove the `DueBadgeSettings` import, title, and render branch; change the fallback `initialTab` to `"recent-edits"`.

Delete `components/settings/DueBadgeSettings.tsx`.

- [ ] **Step 6: Remove obsolete API routes**

Delete:

```text
app/api/settings/route.ts
app/api/settings/changes/route.ts
```

Keep `app/api/settings/shipping/route.ts`.

- [ ] **Step 7: Verify GREEN**

Run:

```bash
npx tsx --test tests/due-badge.test.ts tests/order-settings.test.ts
npx tsc --project tests/tsconfig.json
```

Expected: both tests and the full type-check pass.

- [ ] **Step 8: Verify complete removal**

Run:

```bash
rg -n "dueBadgeDays|DueBadgeSettings|due-badge" app components contexts hooks lib typings utils config --glob "*.{ts,tsx}"
```

Expected: no output.

- [ ] **Step 9: Final build and diff review**

Run:

```bash
npm run build
git status --short
git diff --check
```

Expected: production build passes, no whitespace errors appear, and unrelated working-tree changes remain intact.
