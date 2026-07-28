import { ItemDesigns } from "@/typings/types";

// Auto-fill grouping treats Coastal Dream, Tidal, and Oceanic Harmony as the
// same family because they share the same color palette inputs (paint can
// stay loaded between them). Striped variants are NOT included — they use
// different geometric squares and aren't interchangeable on the line.
const OCEAN_PALETTE_FAMILY = "OCEAN_PALETTE";
const OCEAN_DESIGNS: ReadonlySet<string> = new Set([
  ItemDesigns.Coastal,
  ItemDesigns.Tidal,
  ItemDesigns.Oceanic_Harmony,
]);

// Maps an item's design string to a grouping key. Items with the same key
// are candidates for being scheduled together by auto-fill. Items with no
// design (or an unknown design) get a unique key per id so they don't
// accidentally cluster with each other.
export function getDesignFamily(
  design: string | undefined,
  itemId: string
): string {
  if (!design) return `_solo:${itemId}`;
  if (OCEAN_DESIGNS.has(design)) return OCEAN_PALETTE_FAMILY;
  return design;
}
