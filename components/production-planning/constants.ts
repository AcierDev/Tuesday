import { ItemStatus } from "@/typings/types";

// Statuses auto-plan is allowed to (re)place — work that hasn't started yet.
// Wip is intentionally excluded so in-progress orders aren't shuffled around.
export const PRE_WIP_STATUSES: ReadonlySet<ItemStatus> = new Set([
  ItemStatus.New,
  ItemStatus.OnDeck,
]);

// Statuses that lock a scheduled card to its day. Items at Wip can still be
// dragged (the user may re-prioritize work in progress); once production is
// complete (Packaging onward), the day assignment is frozen as history.
export const POST_WIP_STATUSES: ReadonlySet<ItemStatus> = new Set([
  ItemStatus.Packaging,
  ItemStatus.At_The_Door,
  ItemStatus.Done,
]);
