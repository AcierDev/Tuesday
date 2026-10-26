import assert from "node:assert/strict";
import { test } from "node:test";

import {
  aggregateTrackerStatus,
  projectTrackerSummary,
  trackerScansNewestFirst,
  trackerSummaryProjectionStage,
  TRACKER_SUMMARY_FIELDS,
} from "../lib/shipping-labels/tracker-summary";
import type { Tracker, TrackerStatus, TrackingDetail } from "../typings/types";

function detail(status: TrackerStatus, datetime: string): TrackingDetail {
  return {
    object: "TrackingDetail",
    message: `${status} scan`,
    description: "",
    status,
    status_detail: "status_update",
    datetime,
    source: "FedEx",
    carrier_code: "",
    tracking_location: {
      object: "TrackingLocation",
      city: "Henderson",
      state: "NV",
      country: "US",
      zip: "89074",
    },
  };
}

function tracker(status: TrackerStatus, details: TrackingDetail[] = []): Tracker {
  return {
    id: `trk_${status}`,
    object: "Tracker",
    mode: "production",
    tracking_code: `code-${status}`,
    status,
    status_detail: "status_update",
    signed_by: null,
    weight: null,
    est_delivery_date: "2026-10-28T00:00:00Z",
    shipment_id: null,
    carrier: "FedEx",
    tracking_details: details,
    carrier_detail: null,
    public_url: "https://example.test/track",
    fees: [],
    created_at: "2026-10-26T00:00:00Z",
    updated_at: "2026-10-27T00:00:00Z",
  };
}

const statuses = (...values: TrackerStatus[]) => values.map((status) => ({ status }));

test("an order is delivered only when every box is delivered", () => {
  assert.equal(aggregateTrackerStatus(statuses("delivered", "delivered")), "delivered");
  assert.equal(aggregateTrackerStatus(statuses("delivered", "in_transit")), "in_transit");
  assert.equal(aggregateTrackerStatus(statuses("delivered", "pre_transit")), "in_transit");
  assert.equal(
    aggregateTrackerStatus(statuses("in_transit", "out_for_delivery")),
    "out_for_delivery"
  );
});

test("an exception or return on any box wins over the others", () => {
  assert.equal(aggregateTrackerStatus(statuses("delivered", "failure")), "failure");
  assert.equal(aggregateTrackerStatus(statuses("failure", "delivered")), "failure");
  assert.equal(
    aggregateTrackerStatus(statuses("in_transit", "return_to_sender", "error")),
    "return_to_sender"
  );
  assert.equal(aggregateTrackerStatus(statuses("pre_transit", "cancelled")), "cancelled");
});

test("orders without trackers have no status; unscanned boxes stay pre-transit", () => {
  assert.equal(aggregateTrackerStatus([]), undefined);
  assert.equal(aggregateTrackerStatus(undefined), undefined);
  assert.equal(aggregateTrackerStatus(statuses("pre_transit", "unknown")), "pre_transit");
  assert.equal(aggregateTrackerStatus(statuses("unknown")), "unknown");
});

test("the lean tracker keeps status fields and only the delivered scan", () => {
  const full = tracker("delivered", [
    detail("in_transit", "2026-10-26T10:00:00Z"),
    detail("delivered", "2026-10-27T15:00:00Z"),
  ]);
  const summary = projectTrackerSummary(full);

  for (const field of TRACKER_SUMMARY_FIELDS) {
    assert.deepEqual(summary[field], full[field], field);
  }
  assert.deepEqual(summary.tracking_details, [
    { status: "delivered", datetime: "2026-10-27T15:00:00Z" },
  ]);
  assert.equal("carrier_detail" in summary, false);
  assert.equal("fees" in summary, false);
});

test("the Mongo projection selects the same tracker fields", () => {
  const stage = trackerSummaryProjectionStage();
  const fields = stage.$project.trackers.$map.in;
  assert.deepEqual(
    Object.keys(fields).sort(),
    [...TRACKER_SUMMARY_FIELDS, "tracking_details"].sort()
  );
  assert.equal(stage.$project._id, 0);
});

test("scan history sorts newest first without mutating the tracker", () => {
  const details = [
    detail("pre_transit", "2026-10-25T10:00:00Z"),
    detail("in_transit", "2026-10-26T10:00:00Z"),
  ];
  const sorted = trackerScansNewestFirst(details);
  assert.equal(sorted[0]?.status, "in_transit");
  assert.equal(details[0]?.status, "pre_transit");
});
