"use client";

import { useEffect, useMemo, useState } from "react";

import { useOrderSettings } from "@/contexts/OrderSettingsContext";
import { useClockBucket } from "@/hooks/useLaClock";
import { useStatsRevalidationVersion } from "@/lib/stats-shared";
import {
  fetchRecentMoves,
  recentlyMovedIds,
  type RecentMove,
} from "@/components/orders/utils/recentMoves";

// Re-check the window on a coarse clock so dots expire on an idle tab even
// when no new activity arrives.
const RECENTLY_MOVED_REFRESH_MS = 60_000;
const MS_PER_HOUR = 60 * 60 * 1000;
const EMPTY_IDS: ReadonlySet<string> = new Set();

// One request shared by every row, per (stats version, window).
let movesCache: { key: string; moves: RecentMove[] } | null = null;
let movesInflight: { key: string; promise: Promise<RecentMove[]> } | null =
  null;

function loadRecentMoves(version: number, hours: number) {
  const key = `${version}:${hours}`;
  if (movesCache?.key === key) return Promise.resolve(movesCache.moves);
  if (movesInflight?.key === key) return movesInflight.promise;
  const promise = fetchRecentMoves(Date.now() - hours * MS_PER_HOUR)
    .then((moves) => {
      movesCache = { key, moves };
      return moves;
    })
    .finally(() => {
      if (movesInflight?.key === key) movesInflight = null;
    });
  movesInflight = { key, promise };
  return promise;
}

// Shared across rows so mounting N rows builds the set once per tick.
let idsCache: {
  moves: RecentMove[];
  hours: number;
  bucket: number;
  ids: Set<string>;
} | null = null;

// Ids of orders whose status changed within the recent-edit window.
export function useRecentlyMovedIds(): ReadonlySet<string> {
  const { settings } = useOrderSettings();
  const hours = settings.recentEditHours;
  const version = useStatsRevalidationVersion();
  const bucket = useClockBucket(RECENTLY_MOVED_REFRESH_MS);
  const [moves, setMoves] = useState<RecentMove[] | null>(
    () => movesCache?.moves ?? null
  );

  useEffect(() => {
    if (hours === undefined) return;
    let cancelled = false;
    loadRecentMoves(version, hours)
      .then((loaded) => {
        if (!cancelled) setMoves(loaded);
      })
      .catch((error) => console.error("Failed to load recent moves", error));
    return () => {
      cancelled = true;
    };
  }, [version, hours]);

  return useMemo(() => {
    if (!moves || hours === undefined) return EMPTY_IDS;
    if (
      idsCache?.moves === moves &&
      idsCache.hours === hours &&
      idsCache.bucket === bucket
    ) {
      return idsCache.ids;
    }
    const ids = recentlyMovedIds(moves, Date.now() - hours * MS_PER_HOUR);
    idsCache = { moves, hours, bucket, ids };
    return ids;
  }, [moves, hours, bucket]);
}
