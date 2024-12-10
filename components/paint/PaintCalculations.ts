import {
  ColumnTitles,
  Item,
  ItemDesigns,
  ItemSizes,
  Group,
} from "@/typings/types";
import { DESIGN_COLOR_NAMES, SIZE_MULTIPLIERS } from "@/typings/constants";

export type PaintRequirement = Record<string | number, number>;

export function calculatePaintRequirements(
  group: Group
): Record<ItemDesigns, PaintRequirement> {
  const requirements: Record<ItemDesigns, PaintRequirement> = {} as Record<
    ItemDesigns,
    PaintRequirement
  >;

  group.items.forEach((item) => {
    const design = item.values.find((v) => v.columnName === ColumnTitles.Design)
      ?.text as ItemDesigns;
    const size = item.values.find((v) => v.columnName === ColumnTitles.Size)
      ?.text as ItemSizes;

    if (
      design &&
      size &&
      DESIGN_COLOR_NAMES[design] &&
      SIZE_MULTIPLIERS[size]
    ) {
      if (!requirements[design]) {
        requirements[design] = {};
      }

      if (
        design === ItemDesigns.Coastal ||
        design === ItemDesigns.Oceanic_Harmony ||
        design === ItemDesigns.Striped_Coastal ||
        design === ItemDesigns.Tiled_Coastal
      ) {
        if (!requirements[ItemDesigns.Coastal]) {
          requirements[ItemDesigns.Coastal] = {};
        }
      }

      if (design === ItemDesigns.Tidal) {
        if (!requirements[ItemDesigns.Coastal]) {
          requirements[ItemDesigns.Coastal] = {};
        }
        if (!requirements[ItemDesigns.Tidal]) {
          requirements[ItemDesigns.Tidal] = {};
        }
      }

      const totalArea = SIZE_MULTIPLIERS[size];
      const colorCount = DESIGN_COLOR_NAMES[design].length;
      const piecesPerColor = Math.ceil(totalArea / colorCount);

      DESIGN_COLOR_NAMES[design].forEach((color) => {
        if (
          design === ItemDesigns.Coastal ||
          design === ItemDesigns.Oceanic_Harmony ||
          (design === ItemDesigns.Tidal && typeof color === "number")
        ) {
          requirements[ItemDesigns.Coastal][color] =
            (requirements[ItemDesigns.Coastal][color] || 0) + piecesPerColor;
        } else if (design === ItemDesigns.Tidal && typeof color === "string") {
          requirements[ItemDesigns.Tidal][color] =
            (requirements[ItemDesigns.Tidal][color] || 0) + piecesPerColor;
        } else {
          requirements[design][color] =
            (requirements[design][color] || 0) + piecesPerColor;
        }
      });
    }
  });

  requirements[ItemDesigns.Oceanic_Harmony] = {};

  if (Object.keys(requirements[ItemDesigns.Tidal] || {}).length === 0) {
    requirements[ItemDesigns.Tidal] = {};
  }

  return requirements;
}
