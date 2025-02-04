import {
  Item,
  ItemDesigns,
  ItemSizes,
  ColumnTitles,
  Group,
} from "@/typings/types";
import { DESIGN_COLOR_NAMES, SIZE_MULTIPLIERS } from "@/typings/constants";
import { BoxRequirement } from "@/typings/interfaces";
import { BOX_COLORS } from "@/typings/constants";
import { backboardData } from "@/typings/constants";

export class ItemUtil {
  static getTotalSquares(item: Item): number {
    const size = item.values.find((v) => v.columnName === ColumnTitles.Size)
      ?.text as ItemSizes;
    if (size && SIZE_MULTIPLIERS[size]) {
      return SIZE_MULTIPLIERS[size];
    }
    return 0;
  }

  static getPaintRequirements(item: Item): Record<string, number> {
    const requirements: Record<string, number> = {};
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
      const totalArea = SIZE_MULTIPLIERS[size];
      const colorCount = DESIGN_COLOR_NAMES[design].length;
      const piecesPerColor = Math.ceil(totalArea / colorCount);

      DESIGN_COLOR_NAMES[design].forEach((color) => {
        if (
          design === ItemDesigns.Coastal ||
          design === ItemDesigns.Oceanic_Harmony ||
          (design === ItemDesigns.Tidal && typeof color === "number")
        ) {
          requirements[`Coastal-${color}`] =
            (requirements[`Coastal-${color}`] || 0) + piecesPerColor;
        } else if (design === ItemDesigns.Tidal && typeof color === "string") {
          requirements[`Tidal-${color}`] =
            (requirements[`Tidal-${color}`] || 0) + piecesPerColor;
        } else {
          requirements[`${design}-${color}`] =
            (requirements[`${design}-${color}`] || 0) + piecesPerColor;
        }
      });
    }

    return requirements;
  }

  static getBoxRequirements(item: Item): BoxRequirement | null {
    const size = item.values.find((v) => v.columnName === ColumnTitles.Size)
      ?.text as ItemSizes;
    if (size && BOX_COLORS[size]) {
      return {
        count: BOX_COLORS[size].count,
        hardwareBag: BOX_COLORS[size].hardwareBag,
        mountingRail: BOX_COLORS[size].mountingRail,
      };
    }
    return null;
  }

  static getBackboardRequirements(item: Item): {
    panels: number;
    blankSize: string;
    instructions: string;
  } | null {
    const size = item.values.find((v) => v.columnName === ColumnTitles.Size)
      ?.text as ItemSizes;
    if (size && backboardData[size]) {
      return {
        panels: backboardData[size].panels,
        blankSize: backboardData[size].blankSize,
        instructions: backboardData[size].instructions,
      };
    }
    return null;
  }

  static getDesignColors(design: ItemDesigns): string[] {
    return DESIGN_COLOR_NAMES[design] || [];
  }

  static getSizeMultiplier(size: ItemSizes): number {
    return SIZE_MULTIPLIERS[size] || 0;
  }

  static getBoxColor(size: ItemSizes): string | null {
    return BOX_COLORS[size]?.color || null;
  }

  static getBoxCount(size: ItemSizes): number {
    return BOX_COLORS[size]?.count || 0;
  }

  static getBoxHardware(size: ItemSizes): string | null {
    return BOX_COLORS[size]?.hardwareBag || null;
  }

  static getBoxRail(size: ItemSizes): string | null {
    return BOX_COLORS[size]?.mountingRail || null;
  }

  static getBackboardPanels(size: ItemSizes): number {
    return backboardData[size]?.panels || 0;
  }

  static getBackboardBlankSize(size: ItemSizes): string | null {
    return backboardData[size]?.blankSize || null;
  }

  static getBackboardInstructions(size: ItemSizes): string | null {
    return backboardData[size]?.instructions || null;
  }

  static getTotalPaintRequirements(group: Group): Record<string, number> {
    const requirements: Record<string, number> = {};

    group.items.forEach((item) => {
      const itemRequirements = this.getPaintRequirements(item);
      Object.entries(itemRequirements).forEach(([color, count]) => {
        requirements[color] = (requirements[color] || 0) + count;
      });
    });

    return requirements;
  }

  static getTotalBoxRequirements(group: Group): Record<string, BoxRequirement> {
    const requirements: Record<string, BoxRequirement> = {};

    group.items.forEach((item) => {
      const boxReq = this.getBoxRequirements(item);
      if (boxReq) {
        const color = this.getBoxColor(
          item.values.find((v) => v.columnName === ColumnTitles.Size)
            ?.text as ItemSizes
        );
        if (color) {
          if (!requirements[color]) {
            requirements[color] = {
              count: 0,
              hardwareBag: boxReq.hardwareBag,
              mountingRail: boxReq.mountingRail,
            };
          }
          requirements[color].count += boxReq.count;
        }
      }
    });

    return requirements;
  }

  static getTotalBackboardRequirements(
    group: Group
  ): Record<ItemSizes, number> {
    const requirements: Record<ItemSizes, number> = {} as Record<
      ItemSizes,
      number
    >;

    group.items.forEach((item) => {
      const size = item.values.find((v) => v.columnName === ColumnTitles.Size)
        ?.text as ItemSizes;
      if (size) {
        requirements[size] = (requirements[size] || 0) + 1;
      }
    });

    return requirements;
  }

  static getPanels(size: ItemSizes): string {
    switch (size) {
      case ItemSizes.Fourteen_By_Seven:
        return "14 x 7";
      case ItemSizes.Sixteen_By_Six:
        return "16 x 6";
      case ItemSizes.Sixteen_By_Ten:
        return "(2x) 8x10";
      case ItemSizes.Twenty_By_Ten:
        return "(2x) 10x10";
      case ItemSizes.TwentyFour_By_Ten:
        return "(2x) 12x10";
      case ItemSizes.Twenty_By_Twelve:
        return "(2x) 12x10";
      case ItemSizes.TwentyFour_By_Twelve:
        return "(1x) 10x12 (2x) 7x12";
      case ItemSizes.TwentyEight_By_Twelve:
        return "(4x) 7x12";
      case ItemSizes.TwentyEight_By_Sixteen:
        return "(4x) 7x16";
      case ItemSizes.ThirtyTwo_By_Sixteen:
        return "DATA NOT ENTERED IN WEBSITE";
      case ItemSizes.ThirtySix_By_Sixteen:
        return "(4x) 7x16 (1x) 8x16";
      default:
        return "DATA NOT ENTERED IN WEBSITE";
    }
  }

  static getBoxQuantity(size: ItemSizes): string {
    switch (size) {
      case ItemSizes.Fourteen_By_Seven:
        return "1";
      case ItemSizes.Sixteen_By_Six:
        return "1";
      case ItemSizes.Sixteen_By_Ten:
        return "1";
      case ItemSizes.Twenty_By_Ten:
        return "1";
      case ItemSizes.TwentyFour_By_Ten:
        return "1";
      case ItemSizes.Twenty_By_Twelve:
        return "1";
      case ItemSizes.TwentyFour_By_Twelve:
        return "1 & 1 28x12 Box";
      case ItemSizes.TwentyEight_By_Twelve:
        return "2";
      case ItemSizes.TwentyEight_By_Sixteen:
        return "2";
      case ItemSizes.ThirtyTwo_By_Sixteen:
        return "DATA NOT ENTERED IN WEBSITE";
      case ItemSizes.ThirtySix_By_Sixteen:
        return "2 & Purple Box (not 28x16)";
      default:
        return "DATA NOT ENTERED IN WEBSITE";
    }
  }

  static getScore(size: ItemSizes): string {
    switch (size) {
      case ItemSizes.Fourteen_By_Seven:
        return "10, 13.5 (level)";
      case ItemSizes.Sixteen_By_Six:
        return "10, 13.5 (level)";
      case ItemSizes.Sixteen_By_Ten:
        return "5.5";
      case ItemSizes.Twenty_By_Ten:
        return "5.5";
      case ItemSizes.TwentyFour_By_Ten:
        return "5.5";
      case ItemSizes.Twenty_By_Twelve:
        return "5.5";
      case ItemSizes.TwentyFour_By_Twelve:
        return "3.5";
      case ItemSizes.TwentyEight_By_Twelve:
        return "5.75, 11.5";
      case ItemSizes.TwentyEight_By_Sixteen:
        return "5.75, 11.5";
      case ItemSizes.ThirtySix_By_Sixteen:
        return "5.75, 11.5";
      default:
        return "DATA NOT ENTERED IN WEBSITE";
    }
  }

  static getFold(size: ItemSizes): string {
    switch (size) {
      case ItemSizes.Fourteen_By_Seven:
        return "22, 4, 44.4";
      case ItemSizes.Sixteen_By_Six:
        return "16, 4, 56.4";
      case ItemSizes.Sixteen_By_Ten:
        return "30, 6, 30-1.6";
      case ItemSizes.Twenty_By_Ten:
        return "34, 6, 34-1.6";
      case ItemSizes.TwentyFour_By_Ten:
        return "40, 6, 40-1.6";
      case ItemSizes.Twenty_By_Twelve:
        return "40, 6, 40-1.6";
      case ItemSizes.TwentyFour_By_Twelve:
        return "35, 4, 35-1.4";
      case ItemSizes.TwentyEight_By_Twelve:
        return "21, 6, 42.6";
      case ItemSizes.TwentyEight_By_Sixteen:
        return "15,6,54,6";
      case ItemSizes.ThirtySix_By_Sixteen:
        return "15,6,54,6";
      default:
        return "DATA NOT ENTERED IN WEBSITE";
    }
  }

  static getBubbleFoam(size: ItemSizes): string {
    switch (size) {
      case ItemSizes.Fourteen_By_Seven:
        return "4w big (tall) bubble + (2x) 4w foam";
      case ItemSizes.Sixteen_By_Six:
        return "5w big (tall) bubble + (2x) 5w foam";
      case ItemSizes.Sixteen_By_Ten:
        return "6w small (tall) bubble + (2x) 6w foam";
      case ItemSizes.Twenty_By_Ten:
        return "6w small (tall) bubble + (2x) 6w foam";
      case ItemSizes.TwentyFour_By_Ten:
        return "6w small (tall) bubble + (2x) 6w foam";
      case ItemSizes.Twenty_By_Twelve:
        return "6w small (tall) bubble + (2x) 6w foam";
      case ItemSizes.TwentyFour_By_Twelve:
        return "6w big (tall) bubble + (2x) 6w foam";
      case ItemSizes.TwentyEight_By_Twelve:
        return "6w small (tall) bubble + (2x) 6w foam (sideways)";
      case ItemSizes.TwentyEight_By_Sixteen:
        return "6w small (tall) bubble + (1x) 6w foam";
      case ItemSizes.ThirtySix_By_Sixteen:
        return "6w small (tall) bubble + (1x) 6w foam";
      default:
        return "DATA NOT ENTERED IN WEBSITE";
    }
  }

  static getHardwareBagContents(size: ItemSizes): string {
    switch (size) {
      case ItemSizes.Fourteen_By_Seven:
        return "10 Black screws, 2 Anchors + 2 Bolts";
      case ItemSizes.Sixteen_By_Six:
        return "10 Black screws, 2 Anchors + 2 Bolts";
      case ItemSizes.Sixteen_By_Ten:
        return "10 Black screws, 2 Anchors + 2 Bolts";
      case ItemSizes.Twenty_By_Ten:
        return "15 Black screws, 3 Anchors + 3 Bolts";
      case ItemSizes.TwentyFour_By_Ten:
        return "15 Black screws, 3 Anchors + 3 Bolts";
      case ItemSizes.Twenty_By_Twelve:
        return "15 Black screws, 3 Anchors + 3 Bolts";
      case ItemSizes.TwentyFour_By_Twelve:
        return "15 Black screws, 4 Anchors + 4 Bolts";
      case ItemSizes.TwentyEight_By_Twelve:
        return "20 Black screws, 7 Anchors + 7 Bolts";
      case ItemSizes.TwentyEight_By_Sixteen:
        return "20 Black screws, 7 Anchors + 7 Bolts";
      case ItemSizes.ThirtySix_By_Sixteen:
        return "20 Black screws, 7 Anchors + 7 Bolts";
      default:
        return "DATA NOT ENTERED IN WEBSITE";
    }
  }

  static getHangingRail(size: ItemSizes): string {
    switch (size) {
      case ItemSizes.Fourteen_By_Seven:
        return "15";
      case ItemSizes.Sixteen_By_Six:
        return "16";
      case ItemSizes.Sixteen_By_Ten:
        return "42";
      case ItemSizes.Twenty_By_Ten:
        return "48";
      case ItemSizes.TwentyFour_By_Ten:
        return "48";
      case ItemSizes.Twenty_By_Twelve:
        return "48";
      case ItemSizes.TwentyFour_By_Twelve:
        return "52";
      case ItemSizes.TwentyEight_By_Twelve:
        return "48 + 30";
      case ItemSizes.TwentyEight_By_Sixteen:
        return "48 + 30";
      case ItemSizes.ThirtySix_By_Sixteen:
        return "(2x) 48";
      default:
        return "DATA NOT ENTERED IN WEBSITE";
    }
  }

  static getFullPackagingDetails(size: ItemSizes): {
    panels: string;
    boxQuantity: string;
    score: string;
    fold: string;
    bubbleFoam: string;
    hardwareBagContents: string;
    hangingRail: string;
  } {
    return {
      panels: this.getPanels(size),
      boxQuantity: this.getBoxQuantity(size),
      score: this.getScore(size),
      fold: this.getFold(size),
      bubbleFoam: this.getBubbleFoam(size),
      hardwareBagContents: this.getHardwareBagContents(size),
      hangingRail: this.getHangingRail(size),
    };
  }
}
