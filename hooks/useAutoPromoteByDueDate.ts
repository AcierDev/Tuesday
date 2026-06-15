"use client";

import { useEffect, useRef } from "react";
import { differenceInCalendarDays, parseISO } from "date-fns";
import { Item, ItemStatus } from "@/typings/types";
import { useOrderSettings } from "@/contexts/OrderSettingsContext";
import { useOrderStore } from "@/stores/useOrderStore";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ ⏰ AUTO-FILL ON DECK FROM NEW (yellow/red + min floor, hard max cap)   ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝
// • Items in `New` with a yellow/red badge want to be OnDeck.
// • OnDeck is kept between ON_DECK_MIN_COUNT and ON_DECK_MAX_COUNT items.
//   - Below the min: top up with the closest-to-due green items from `New`.
//   - Above the max: keep only the ON_DECK_MAX_COUNT closest-to-due items;
//     the least-urgent overflow is bumped back — including manually-placed
//     items (manuals are ranked by due date like everything else and are
//     sticky only while OnDeck stays within the cap).
// • Both bounds are hardcoded software constants — no longer a user setting.
// • Self-heal: items in OnDeck whose prevStatus is a past-OnDeck status
//   (Wip etc.) restore back regardless of due date — those were promoted by
//   an older buggy version of this hook.
//
// No-thrash guarantee: the target OnDeck set is computed once per pass (floor
// then cap), and every item is driven to match that single consistent target.
// Because excess-but-still-urgent items left in `New` are never re-promoted
// (promotion only fires for items inside the target), the set is stable across
// re-evaluations rather than oscillating.
const PROMOTABLE_STATUSES = new Set<ItemStatus>([ItemStatus.New]);

const ON_DECK_MIN_COUNT = 10;
const ON_DECK_MAX_COUNT = 20;

// Items with no due date sort after every dated item.
const NO_DUE_RANK = Number.POSITIVE_INFINITY;

export function useAutoPromoteByDueDate(items: Item[] | undefined) {
  const { settings } = useOrderSettings();
  const updateItem = useOrderStore((state) => state.updateItem);

  const inFlightRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!items || items.length === 0) return;

    // Don't re-evaluate while a previous batch is still settling. Each
    // in-flight updateItem resolves at a different time and triggers a
    // re-render with partial state — evaluating then would let the algorithm
    // queue contradictory updates against an inconsistent view.
    if (inFlightRef.current.size > 0) return;

    const range = settings.dueBadgeDays;
    if (typeof range !== "number") return;

    const today = new Date();

    const computeDelta = (item: Item): number | null => {
      if (!item.dueDate) return null;
      try {
        return differenceInCalendarDays(parseISO(item.dueDate), today);
      } catch {
        return null;
      }
    };

    const liveItems = items.filter((i) => !i.deleted);

    //╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
    //║ 🩹 SELF-HEAL: undo bad promotions from older hook versions             ║
    //╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝
    const selfHealIds = new Set<string>();
    for (const item of liveItems) {
      if (
        item.status === ItemStatus.OnDeck &&
        item.prevStatus &&
        !PROMOTABLE_STATUSES.has(item.prevStatus)
      ) {
        selfHealIds.add(item.id);
      }
    }

    //╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
    //║ 🎯 DECIDE WHICH ITEMS BELONG IN ON DECK                                ║
    //╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝
    // Pool = items this hook may flip in/out of OnDeck: everything in `New`
    // plus every OnDeck item except self-heal targets. Manually-placed OnDeck
    // items (no prevStatus) are included so the hard cap can bump them.
    const pool = liveItems.filter((i) => {
      if (selfHealIds.has(i.id)) return false;
      return i.status === ItemStatus.New || i.status === ItemStatus.OnDeck;
    });

    // Stable closest-to-due ranking. The id tiebreaker keeps ties in a fixed
    // order across re-evaluations so the cap never bumps a different item each
    // pass (which would thrash).
    const rankOf = (i: Item): number => {
      const d = computeDelta(i);
      return d === null ? NO_DUE_RANK : d;
    };
    const byUrgency = (a: Item, b: Item): number => {
      const ra = rankOf(a);
      const rb = rankOf(b);
      if (ra !== rb) return ra - rb;
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    };

    // Items that WANT to be on deck before the floor/cap are applied:
    //   • urgent  — due within `range` (yellow/red)
    //   • manual  — already OnDeck with no prevStatus (user placed it)
    const wantIds = new Set<string>();
    for (const i of pool) {
      const d = computeDelta(i);
      const isUrgent = d !== null && d <= range;
      const isManual = i.status === ItemStatus.OnDeck && !i.prevStatus;
      if (isUrgent || isManual) wantIds.add(i.id);
    }

    let target = pool.filter((i) => wantIds.has(i.id));

    // Min floor: top up with the closest-to-due dated items from the rest of
    // the pool (greens) until we reach ON_DECK_MIN_COUNT.
    if (target.length < ON_DECK_MIN_COUNT) {
      const fillers = pool
        .filter((i) => !wantIds.has(i.id) && computeDelta(i) !== null)
        .sort(byUrgency);
      for (const i of fillers) {
        if (target.length >= ON_DECK_MIN_COUNT) break;
        target.push(i);
      }
    }

    // Max cap: keep only the ON_DECK_MAX_COUNT closest-to-due items; the rest
    // (least urgent first, manuals and no-due-date items included) are bumped.
    if (target.length > ON_DECK_MAX_COUNT) {
      target = [...target].sort(byUrgency).slice(0, ON_DECK_MAX_COUNT);
    }

    const shouldBeOnDeck = new Set(target.map((i) => i.id));

    //╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
    //║ 🔁 APPLY: self-heal, promote, or demote each item                     ║
    //╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝
    // Drive every item to the single target set computed above. Demotion now
    // covers manuals too (status === OnDeck && !shouldBeOnDeck): an auto-item
    // restores to its prevStatus, a manual (no prevStatus) falls back to New.
    for (const item of liveItems) {
      if (inFlightRef.current.has(item.id)) continue;

      let next: Item | null = null;

      if (selfHealIds.has(item.id)) {
        next = { ...item, status: item.prevStatus!, prevStatus: null };
      } else if (item.status === ItemStatus.New && shouldBeOnDeck.has(item.id)) {
        next = { ...item, prevStatus: item.status, status: ItemStatus.OnDeck };
      } else if (
        item.status === ItemStatus.OnDeck &&
        !shouldBeOnDeck.has(item.id)
      ) {
        next = {
          ...item,
          status: item.prevStatus ?? ItemStatus.New,
          prevStatus: null,
        };
      }

      if (!next) continue;

      inFlightRef.current.add(item.id);
      updateItem(next)
        .catch((err) => {
          console.error("Auto-promote failed for item", item.id, err);
        })
        .finally(() => {
          inFlightRef.current.delete(item.id);
        });
    }
  }, [items, settings.dueBadgeDays, updateItem]);
}
