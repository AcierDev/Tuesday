import { strict as assert } from "node:assert";
import { test } from "node:test";

import { buildDeliveryByOrder, computeDeliverySpeeds } from "@/lib/production-metrics";
import type { Item } from "@/typings/types";

test("delivery speed matches trackers by item id when the shipment has no orderId", () => {
  const purchasedAt = Date.parse("2026-10-01T17:00:00Z");
  const delivery = buildDeliveryByOrder([
    { orderId: "item-1", trackers: [{ tracking_details: [{ status: "delivered", datetime: "2026-10-04T17:00:00Z" }] }] },
  ]);
  const items = [
    { id: "item-1", customerName: "A", purchasedShipment: { purchasedAt, serviceType: "FEDEX_GROUND" } },
  ] as unknown as Item[];
  const rows = computeDeliverySpeeds(items, delivery);
  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.transitDays, 3);
});
