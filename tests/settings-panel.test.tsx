import assert from "node:assert/strict";
import { afterEach, beforeEach, mock, test } from "node:test";
import React from "react";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";

import {
  isBackdropPress,
  shouldCloseOnKeyDown,
} from "../components/settings/SettingsPanel";
import { useDraftAutosave } from "../components/settings/ShippingSettingsEditor";

const DEBOUNCE_MS = 600;
const LONG_WAIT_MS = 10_000;

type Draft = { value: number };
type Api = ReturnType<typeof useDraftAutosave<Draft>>;

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

function Harness(props: {
  draft: Draft | null;
  saved: Draft | null;
  isSaving?: boolean;
  save: (value: Draft) => Promise<unknown>;
  onApi: (api: Api) => void;
}) {
  props.onApi(
    useDraftAutosave({
      draft: props.draft,
      saved: props.saved,
      isSaving: props.isSaving ?? false,
      save: props.save,
      debounceMs: DEBOUNCE_MS,
    })
  );
  return null;
}

function setup(draft: Draft, saved: Draft, save: (value: Draft) => Promise<unknown>) {
  let api!: Api;
  let renderer!: ReactTestRenderer;
  const onApi = (next: Api) => {
    api = next;
  };
  act(() => {
    renderer = TestRenderer.create(
      <Harness draft={draft} saved={saved} save={save} onApi={onApi} />
    );
  });
  return {
    api: () => api,
    renderer,
    rerender: (nextDraft: Draft, isSaving = false) =>
      act(() => {
        renderer.update(
          <Harness
            draft={nextDraft}
            saved={saved}
            isSaving={isSaving}
            save={save}
            onApi={onApi}
          />
        );
      }),
  };
}

// Let the save promise chain settle inside act so state updates apply.
async function settle() {
  await act(async () => {
    for (let i = 0; i < 5; i += 1) await Promise.resolve();
  });
}

beforeEach(() => mock.timers.enable({ apis: ["setTimeout"] }));
afterEach(() => mock.timers.reset());

test("Escape closes only when no Radix layer handled it", () => {
  assert.equal(shouldCloseOnKeyDown({ key: "Escape", defaultPrevented: false }), true);
  assert.equal(shouldCloseOnKeyDown({ key: "Escape", defaultPrevented: true }), false);
  assert.equal(shouldCloseOnKeyDown({ key: "Enter", defaultPrevented: false }), false);
});

test("only presses that start on the backdrop count as outside clicks", () => {
  const backdrop = {} as EventTarget;
  const portaledOption = {} as EventTarget;
  assert.equal(isBackdropPress({ target: backdrop, currentTarget: backdrop }), true);
  assert.equal(isBackdropPress({ target: portaledOption, currentTarget: backdrop }), false);
});

test("autosave debounces, and a failed save is not retried until the next edit", async () => {
  const save = mock.fn(async (_value: Draft) => {
    throw new Error("server down");
  });
  const draft = { value: 2 };
  const view = setup(draft, { value: 1 }, save);

  act(() => mock.timers.tick(DEBOUNCE_MS - 1));
  assert.equal(save.mock.callCount(), 0);
  act(() => mock.timers.tick(1));
  assert.equal(save.mock.callCount(), 1);
  // The store flips isSaving on and back off around the failed request.
  view.rerender(draft, true);
  await settle();
  view.rerender(draft, false);
  assert.equal(view.api().saveFailed, true);

  act(() => mock.timers.tick(LONG_WAIT_MS));
  assert.equal(save.mock.callCount(), 1, "no retry loop after a failure");
  view.api().flushOnBlur();
  assert.equal(save.mock.callCount(), 1, "blur does not retry a failed draft");

  view.rerender({ value: 3 });
  assert.equal(view.api().saveFailed, false);
  act(() => mock.timers.tick(DEBOUNCE_MS));
  assert.equal(save.mock.callCount(), 2, "the next edit re-arms autosave");
  act(() => view.renderer.unmount());
});

test("flush saves a pending edit immediately instead of dropping it", async () => {
  const save = mock.fn(async (_value: Draft) => undefined);
  const view = setup({ value: 2 }, { value: 1 }, save);

  let flushed: boolean | undefined;
  await act(async () => {
    flushed = await view.api().flush();
  });
  assert.equal(flushed, true);
  assert.equal(save.mock.callCount(), 1);
  assert.deepEqual(save.mock.calls[0]?.arguments[0], { value: 2 });

  act(() => mock.timers.tick(LONG_WAIT_MS));
  assert.equal(save.mock.callCount(), 1, "the debounce timer was cancelled");
  act(() => view.renderer.unmount());
  await settle();
  assert.equal(save.mock.callCount(), 1, "unmount does not re-save a saved draft");
});

test("flush reports a failed save once, then lets the panel close", async () => {
  const save = mock.fn(async (_value: Draft) => {
    throw new Error("server down");
  });
  const view = setup({ value: 2 }, { value: 1 }, save);

  let first: boolean | undefined;
  await act(async () => {
    first = await view.api().flush();
  });
  assert.equal(first, false, "first close stays open to show the error");
  assert.equal(view.api().saveFailed, true);

  let second: boolean | undefined;
  await act(async () => {
    second = await view.api().flush();
  });
  assert.equal(second, true, "second close discards the failed draft");
  assert.equal(save.mock.callCount(), 1);
  act(() => view.renderer.unmount());
});

test("unmounting with a pending edit still saves it", async () => {
  const save = mock.fn(async (_value: Draft) => undefined);
  const view = setup({ value: 5 }, { value: 1 }, save);

  act(() => view.renderer.unmount());
  await settle();
  assert.equal(save.mock.callCount(), 1);
  assert.deepEqual(save.mock.calls[0]?.arguments[0], { value: 5 });
});

test("nothing is saved when the draft matches the saved settings", async () => {
  const save = mock.fn(async (_value: Draft) => undefined);
  const view = setup({ value: 1 }, { value: 1 }, save);

  act(() => mock.timers.tick(LONG_WAIT_MS));
  let flushed: boolean | undefined;
  await act(async () => {
    flushed = await view.api().flush();
  });
  assert.equal(flushed, true);
  act(() => view.renderer.unmount());
  await settle();
  assert.equal(save.mock.callCount(), 0);
});
