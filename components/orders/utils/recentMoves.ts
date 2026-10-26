import type { Activity } from "@/typings/types";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🔵 RECENT STATUS MOVES                                                ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝
// The orders board only needs status moves inside the recent-edit window, so
// page through the newest activities (sorted newest first) and stop once a
// page reaches past the window, instead of loading the full 5,000-row feed.

export const RECENT_MOVES_PAGE_SIZE = 200;
export const RECENT_MOVES_MAX_PAGES = 5;

export type RecentMove = Pick<Activity, "itemId" | "timestamp">;

type FetchJson = (url: string) => Promise<{ activities: Activity[] }>;

const fetchActivitiesPage: FetchJson = async (url) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};

export async function fetchRecentMoves(
  sinceMs: number,
  fetchJson: FetchJson = fetchActivitiesPage
): Promise<RecentMove[]> {
  const moves: RecentMove[] = [];
  for (let page = 0; page < RECENT_MOVES_MAX_PAGES; page++) {
    const skip = page * RECENT_MOVES_PAGE_SIZE;
    const { activities } = await fetchJson(
      `/api/activities?limit=${RECENT_MOVES_PAGE_SIZE}&skip=${skip}`
    );
    for (const a of activities) {
      if (a.type === "status_change" && a.timestamp >= sinceMs) {
        moves.push({ itemId: a.itemId, timestamp: a.timestamp });
      }
    }
    const oldest = activities[activities.length - 1]?.timestamp;
    if (
      activities.length < RECENT_MOVES_PAGE_SIZE ||
      oldest === undefined ||
      oldest < sinceMs
    ) {
      break;
    }
  }
  return moves;
}

// Item ids moved at or after `cutoffMs`.
export function recentlyMovedIds(
  moves: readonly RecentMove[],
  cutoffMs: number
): Set<string> {
  const ids = new Set<string>();
  for (const move of moves) {
    if (move.timestamp >= cutoffMs) ids.add(move.itemId);
  }
  return ids;
}
