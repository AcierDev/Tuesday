"use client";

import { useEffect, useRef } from "react";
import { differenceInCalendarDays, parseISO } from "date-fns";
import { Item, ItemStatus } from "@/typings/types";
import { useOrderSettings } from "@/contexts/OrderSettingsContext";
import { useOrderStore } from "@/stores/useOrderStore";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ ⏰ AUTO-FILL ON DECK FROM NEW (yellow/red + min-count top-up)          ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝
// • Items in `New` with a yellow/red badge auto-promote to OnDeck.
// • If OnDeck still has fewer than ON_DECK_MIN_COUNT items, top up with the
//   closest-to-due green items from `New`.
// • Reversal is automatic when neither condition holds (badge turned green
//   AND the item isn't needed for the minimum).
// • Self-heal: items in OnDeck whose prevStatus is past-OnDeck (Wip etc.)
//   restore back regardless of due date — those were promoted by an older
//   buggy version of this hook.
const PROMOTABLE_STATUSES = new Set<ItemStatus>([ItemStatus.New]);

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

    const minCount = typeof settings.onDeckMinCount === "number" ? settings.onDeckMinCount : 0;

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
    // Movable = items this hook is allowed to flip in/out of OnDeck.
    const candidates = liveItems.filter((i) => {
      if (selfHealIds.has(i.id)) return false;
      if (i.status === ItemStatus.New) return true;
      if (i.status === ItemStatus.OnDeck && i.prevStatus) return true;
      return false;
    });

    // Manually-placed OnDeck items (no prevStatus) count toward the minimum
    // but are never moved by this hook.
    const manualOnDeckCount = liveItems.filter(
      (i) => i.status === ItemStatus.OnDeck && !i.prevStatus
    ).length;

    const shouldBeOnDeck = new Set<string>();

    const yellowOrRed = candidates.filter((i) => {
      const d = computeDelta(i);
      return d !== null && d <= range;
    });
    for (const i of yellowOrRed) shouldBeOnDeck.add(i.id);

    const slotsNeeded = Math.max(
      0,
      minCount - manualOnDeckCount - yellowOrRed.length
    );
    if (slotsNeeded > 0) {
      const greenSorted = candidates
        .filter((i) => {
          if (shouldBeOnDeck.has(i.id)) return false;
          const d = computeDelta(i);
          return d !== null && d > range;
        })
        .sort((a, b) => computeDelta(a)! - computeDelta(b)!);
      for (const i of greenSorted.slice(0, slotsNeeded)) {
        shouldBeOnDeck.add(i.id);
      }
    }

    //╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
    //║ 🔁 APPLY: self-heal, promote, or demote each item                     ║
    //╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝
    // No separate eviction phase: demotion (status=OnDeck && prevStatus &&
    // !shouldBeOnDeck) already removes any auto-promoted items beyond the
    // cap. The previous eviction phase also targeted manuals (no prevStatus)
    // and could fire alongside demotion, causing a manual to be evicted AND
    // an auto to be demoted in the same pass — pushing OnDeck below min and
    // triggering a re-promote on the next iteration. That's the thrashing.
    for (const item of liveItems) {
      if (inFlightRef.current.has(item.id)) continue;

      let next: Item | null = null;

      if (selfHealIds.has(item.id)) {
        next = { ...item, status: item.prevStatus!, prevStatus: null };
      } else if (item.status === ItemStatus.New && shouldBeOnDeck.has(item.id)) {
        next = { ...item, prevStatus: item.status, status: ItemStatus.OnDeck };
      } else if (
        item.status === ItemStatus.OnDeck &&
        item.prevStatus &&
        !shouldBeOnDeck.has(item.id)
      ) {
        next = { ...item, status: item.prevStatus, prevStatus: null };
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
  }, [items, settings.dueBadgeDays, settings.onDeckMinCount, updateItem]);
}
