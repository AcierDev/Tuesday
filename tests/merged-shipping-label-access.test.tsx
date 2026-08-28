import assert from "node:assert/strict";
import { test } from "node:test";
import React, { createElement, type ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import TestRenderer, { act } from "react-test-renderer";
import { TrackingLabelAccessButton } from "../components/shipping/TrackingLabelAccessButton";
import { useShippingDialogState } from "../components/shipping/useShippingDialogState";

test("tracked orders with saved labels offer label access", () => {
  const markup = renderToStaticMarkup(
    createElement(TrackingLabelAccessButton, {
      hasLabel: true,
      onViewLabels: () => undefined,
    })
  );

  assert.match(markup, />View Labels</);
});

test("tracked orders can move from tracking history to saved labels", () => {
  const Harness: ComponentType = () => {
    const dialogState = useShippingDialogState("tracking");

    return (
      <>
        <button type="button" onClick={dialogState.openPrimary}>
          Open shipping details
        </button>
        {dialogState.isTrackingOpen ? (
          <section>
            <h2>Tracking History</h2>
            <TrackingLabelAccessButton
              hasLabel
              onViewLabels={dialogState.openLabels}
            />
          </section>
        ) : null}
        {dialogState.isLabelOpen ? <h2>Shipping Labels</h2> : null}
      </>
    );
  };

  const renderer = TestRenderer.create(createElement(Harness));

  act(() => {
    renderer.root.findByType("button").props.onClick();
  });
  assert.equal(
    renderer.root.findByType("h2").children.join(""),
    "Tracking History"
  );

  act(() => {
    renderer.root
      .findAllByType("button")
      .find((button) => button.children.includes("View Labels"))
      ?.props.onClick();
  });
  assert.equal(
    renderer.root.findByType("h2").children.join(""),
    "Shipping Labels"
  );
});
