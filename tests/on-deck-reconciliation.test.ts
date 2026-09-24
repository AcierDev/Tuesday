import assert from "node:assert/strict";
import { test } from "node:test";
import React from "react";
import TestRenderer, { act } from "react-test-renderer";

import { useAutoPromoteByDueDate } from "../hooks/useAutoPromoteByDueDate";
import {
  ON_DECK_MAX_COUNT,
  planOnDeckTransitions,
  reconcileOnDeck,
  type OnDeckReconciliationRepository,
  type OnDeckTransition,
} from "../lib/on-deck-reconciliation";
import { ItemStatus, type Item } from "../typings/types";

const NOW = new Date("2026-09-24T12:00:00-07:00");
const TODAY = "2026-09-24";
const HAKE_ID = "afac79ef-9155-43a0-b285-86912c2d160a";
const HAKE_DUE_DATE = "2026-09-28";
const ON_DECK_MIN_COUNT = 10;
const CLIENT_COUNT = 2;
const HTTP_OK = 200;
const HTTP_ERROR = 500;
const UTC_TIME_ZONE = "UTC";
const LA_LATE_NIGHT = new Date("2026-09-25T06:30:00Z");

function order(
  id: string,
  status: ItemStatus,
  dueDate: string,
  prevStatus: ItemStatus | null = ItemStatus.New
): Item {
  return {
    id,
    customerName: id === HAKE_ID ? "Jacqueline Hake (2/2)" : id,
    size: id === HAKE_ID ? "44 x 12" : "10 x 10",
    status,
    prevStatus,
    dueDate,
    createdAt: NOW.getTime(),
    index: 0,
    visible: true,
    deleted: false,
  };
}

function urgentOrders(count: number): Item[] {
  return Array.from({ length: count }, (_, index) =>
    order(`urgent-${String(index).padStart(2, "0")}`, ItemStatus.OnDeck, TODAY)
  );
}

function Client({ items }: { items: Item[] }) {
  useAutoPromoteByDueDate(items);
  return null;
}

test("each Orders client delegates reconciliation without sending item statuses", async () => {
  const originalFetch = globalThis.fetch;
  const requests: Array<{ url: string; method: string }> = [];
  let renderer: TestRenderer.ReactTestRenderer | undefined;
  globalThis.fetch = async (input, init) => {
    requests.push({
      url: String(input),
      method: init?.method ?? "GET",
    });
    return new Response(JSON.stringify({ modifiedCount: 0 }), {
      status: HTTP_OK,
    });
  };

  const promotingSnapshot = [
    ...urgentOrders(ON_DECK_MIN_COUNT - 1),
    order(HAKE_ID, ItemStatus.New, HAKE_DUE_DATE, null),
  ];
  const demotingSnapshot = [
    ...urgentOrders(ON_DECK_MIN_COUNT),
    order(HAKE_ID, ItemStatus.OnDeck, HAKE_DUE_DATE),
  ];

  try {
    await act(async () => {
      renderer = TestRenderer.create(
        React.createElement(
          React.Fragment,
          null,
          React.createElement(Client, { items: promotingSnapshot }),
          React.createElement(Client, { items: demotingSnapshot })
        )
      );
    });

    assert.deepEqual(
      requests,
      Array.from({ length: CLIENT_COUNT }, () => ({
        url: "/api/items/reconcile-on-deck",
        method: "POST",
      }))
    );
  } finally {
    if (renderer) act(() => renderer!.unmount());
    globalThis.fetch = originalFetch;
  }
});

test("a failed request still runs reconciliation queued by a newer item snapshot", async () => {
  const originalFetch = globalThis.fetch;
  const originalConsoleError = console.error;
  let resolveFirstRequest!: (response: Response) => void;
  let requestCount = 0;
  let renderer: TestRenderer.ReactTestRenderer | undefined;
  console.error = () => {};
  globalThis.fetch = async () => {
    requestCount += 1;
    if (requestCount === 1) {
      return new Promise<Response>((resolve) => {
        resolveFirstRequest = resolve;
      });
    }
    return new Response(JSON.stringify({ modifiedCount: 0 }), {
      status: HTTP_OK,
    });
  };

  const initialItems = [order(HAKE_ID, ItemStatus.New, HAKE_DUE_DATE, null)];
  const changedItems = [
    order(HAKE_ID, ItemStatus.New, "2026-09-27", null),
  ];

  try {
    await act(async () => {
      renderer = TestRenderer.create(
        React.createElement(Client, { items: initialItems })
      );
    });
    await act(async () => {
      renderer!.update(React.createElement(Client, { items: changedItems }));
    });
    await act(async () => {
      resolveFirstRequest(new Response(null, { status: HTTP_ERROR }));
      await Promise.resolve();
    });

    assert.equal(requestCount, CLIENT_COUNT);
  } finally {
    if (renderer) act(() => renderer!.unmount());
    globalThis.fetch = originalFetch;
    console.error = originalConsoleError;
  }
});

test("concurrent server reconciliations apply the Hake cutoff transition once", async () => {
  let sharedItems = [
    ...urgentOrders(ON_DECK_MIN_COUNT - 1),
    order(HAKE_ID, ItemStatus.New, HAKE_DUE_DATE, null),
  ];
  const applied: OnDeckTransition[] = [];
  const repository: OnDeckReconciliationRepository = {
    async listCandidates() {
      return sharedItems.map((item) => ({ ...item }));
    },
    async applyTransition(transition) {
      const current = sharedItems.find((item) => item.id === transition.id);
      if (
        !current ||
        current.status !== transition.fromStatus ||
        (current.prevStatus ?? null) !== (transition.fromPrevStatus ?? null)
      ) {
        return false;
      }
      current.status = transition.toStatus;
      current.prevStatus = transition.toPrevStatus;
      applied.push(transition);
      return true;
    },
  };

  const results = await Promise.all(
    Array.from({ length: CLIENT_COUNT }, () => reconcileOnDeck(repository, NOW))
  );

  assert.equal(
    results.reduce((sum, result) => sum + result.modifiedCount, 0),
    1
  );
  assert.deepEqual(
    applied.map(({ id, toStatus, toPrevStatus }) => ({ id, toStatus, toPrevStatus })),
    [{ id: HAKE_ID, toStatus: ItemStatus.OnDeck, toPrevStatus: ItemStatus.New }]
  );
});

test("the On Deck cap uses the ID tie-breaker for undated manual orders", () => {
  const manualOrders = Array.from(
    { length: ON_DECK_MAX_COUNT + 1 },
    (_, index) =>
      order(
        `manual-${String(ON_DECK_MAX_COUNT - index).padStart(2, "0")}`,
        ItemStatus.OnDeck,
        "",
        null
      )
  );

  const transitions = planOnDeckTransitions(manualOrders, NOW);

  assert.deepEqual(
    transitions.map(({ id, toStatus }) => ({ id, toStatus })),
    [{ id: `manual-${ON_DECK_MAX_COUNT}`, toStatus: ItemStatus.New }]
  );
});

test("urgency follows the Los Angeles day near the UTC date boundary", () => {
  const originalTimeZone = process.env.TZ;
  process.env.TZ = UTC_TIME_ZONE;
  try {
    const transitions = planOnDeckTransitions(
      [
        ...urgentOrders(ON_DECK_MIN_COUNT),
        order(HAKE_ID, ItemStatus.New, HAKE_DUE_DATE, null),
      ],
      LA_LATE_NIGHT
    );

    assert.equal(
      transitions.some((transition) => transition.id === HAKE_ID),
      false
    );
  } finally {
    if (originalTimeZone === undefined) delete process.env.TZ;
    else process.env.TZ = originalTimeZone;
  }
});
