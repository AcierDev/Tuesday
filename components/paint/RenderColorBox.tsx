import { cn } from "@/utils/functions";
import { ItemDesigns } from "@/typings/types";
import {
  ALOE_COLORS,
  AMBER_COLORS,
  BRISKET_COLORS,
  COASTAL_COLORS,
  ELEMENTAL_COLORS,
  MINT_COLORS,
  NEVADA_COLORS,
  SAPHIRE_COLORS,
  TIMBERLINE_COLORS,
} from "@/typings/constants";

export function renderColorBox(
  design: ItemDesigns,
  color: number | string,
  pieces: number,
  isMobile: boolean
) {
  let backgroundColor: string;

  if (
    design === ItemDesigns.Coastal &&
    typeof color === "string" &&
    COASTAL_COLORS[color as any]
  ) {
    backgroundColor = COASTAL_COLORS[color as any]!.hex;
  } else if (
    design === ItemDesigns.Amber &&
    typeof color === "string" &&
    AMBER_COLORS[color as any]
  ) {
    backgroundColor = AMBER_COLORS[color as any]!.hex;
  } else if (
    design === ItemDesigns.Elemental &&
    typeof color === "string" &&
    ELEMENTAL_COLORS[color as any]
  ) {
    backgroundColor = ELEMENTAL_COLORS[color as any]!.hex;
  } else if (
    design === ItemDesigns.Sapphire &&
    typeof color === "string" &&
    SAPHIRE_COLORS[color as any]
  ) {
    backgroundColor = SAPHIRE_COLORS[color as any]!.hex;
  } else if (
    design === ItemDesigns.Timberline &&
    typeof color === "string" &&
    TIMBERLINE_COLORS[color as any]
  ) {
    backgroundColor = TIMBERLINE_COLORS[color as any]!.hex;
  } else if (
    design === ItemDesigns.Aloe &&
    typeof color === "string" &&
    ALOE_COLORS[color as any]
  ) {
    backgroundColor = ALOE_COLORS[color as any]!.hex;
  } else if (design === ItemDesigns.Brisket && BRISKET_COLORS[color as any]) {
    backgroundColor = BRISKET_COLORS[color as any]!.hex;
  } else if (design === ItemDesigns.Nevada && NEVADA_COLORS[color as any]) {
    backgroundColor = NEVADA_COLORS[color as any]!.hex;
  } else if (design === ItemDesigns.Mint && MINT_COLORS[color as any]) {
    backgroundColor = MINT_COLORS[color as any]!.hex;
  } else {
    const hue = typeof color === "number" ? (color * 30) % 360 : 0;
    backgroundColor =
      typeof color === "number" ? `hsl(${hue}, 70%, 50%)` : "#6B7280";
  }

  return (
    <div key={color} className="flex flex-col items-center">
      <div
        style={{ backgroundColor }}
        className={cn(
          "rounded-md flex items-center justify-center text-white font-semibold",
          isMobile ? "w-8 h-8 text-xs" : "w-12 h-12 text-sm"
        )}
      >
        <span>{pieces + "x"}</span>
      </div>
      <span
        className={cn(
          "mt-1 font-medium text-foreground dark:text-gray-200",
          isMobile ? "text-xs" : "text-sm"
        )}
      >
        {color}
      </span>
    </div>
  );
}
