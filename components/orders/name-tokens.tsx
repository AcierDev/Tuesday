"use client";

import { Blend, MapPin, MoveVertical, Printer, Wrench, Zap } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn, splitFirstTwoWords } from "@/utils/functions";
import { parseMinecraftColors } from "@/utils/parseMinecraftColors";
import type { ReactNode } from "react";
import { ORDER_ROW_LAYOUT } from "@/config/order-attention-layout";

const RUSHED_TOKEN = /\(rushed\)/i;
const SEMI_RUSHED_TOKEN = /\(semi-rushed\)/i;
const SEMI_RUSHED_ICON_STROKE_WIDTH = 2.75;
const LOCAL_TOKEN = /\(local\)/i;
const VERTICAL_TOKEN = /\(vertical\)/i;
const VERTICAL_TOKENS = /\(vertical\)/gi;
const CUSTOM_TOKEN = /\(custom\)/i;
const CENTER_FADE_TOKEN = /\(center fade\)/i;
const CENTER_FADE_ICON_STROKE_WIDTH = 2.75;
const BRAND_PREFIX = /^\[(EW|WF|SH)\]\s*/;
// Phones get a single-line, ellipsized name in the narrow board column so it
// never breaks mid-word; sm+ keeps the two-line preview.
const PHONE_NAME_PREVIEW = "max-sm:block max-sm:truncate";

export type NameTokens = {
  displayName: string;
  isRushed: boolean;
  isSemiRushed: boolean;
  isLocal: boolean;
  isVertical: boolean;
  isCustom: boolean;
  isCenterFade: boolean;
  brandPrefix: "EW" | "WF" | "SH" | null;
  isPrintMarker: boolean;
};

// Strips inline tokens like "(rushed)" and "[EW]" from the customer name and
// surfaces them as structured data, so any view that renders the name (orders
// board, planner card, etc.) can show the same set of badges.
export function parseNameTokens(rawName: string, savedIsVertical?: boolean): NameTokens {
  const trimmed = rawName ?? "";
  const isRushed = RUSHED_TOKEN.test(trimmed);
  const isSemiRushed = SEMI_RUSHED_TOKEN.test(trimmed);
  const isLocal = LOCAL_TOKEN.test(trimmed);
  const isVertical = savedIsVertical ?? VERTICAL_TOKEN.test(trimmed);
  const isCustom = CUSTOM_TOKEN.test(trimmed);
  const isCenterFade = CENTER_FADE_TOKEN.test(trimmed);
  const stripped = trimmed
    .replace(RUSHED_TOKEN, "")
    .replace(SEMI_RUSHED_TOKEN, "")
    .replace(LOCAL_TOKEN, "")
    .replace(VERTICAL_TOKENS, "")
    .replace(CUSTOM_TOKEN, "")
    .replace(CENTER_FADE_TOKEN, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  const brandMatch = stripped.match(BRAND_PREFIX);
  const brandPrefix = brandMatch
    ? (brandMatch[1] as "EW" | "WF" | "SH")
    : null;
  const displayName = brandMatch
    ? stripped.slice(brandMatch[0].length)
    : stripped;
  const isPrintMarker = displayName.trim().toLowerCase() === "print";
  return {
    displayName,
    isRushed,
    isSemiRushed,
    isLocal,
    isVertical,
    isCustom,
    isCenterFade,
    brandPrefix,
    isPrintMarker,
  };
}

type TokenTagProps = {
  // Board rows on phones show icon-only chips: the name column is too narrow
  // for labels like "VERTICAL". The label stays available to screen readers
  // and reappears from the sm breakpoint up.
  iconOnlyOnPhone?: boolean;
};

function TagLabel({ children, iconOnlyOnPhone }: TokenTagProps & { children: ReactNode }) {
  return (
    <span className={iconOnlyOnPhone ? "sr-only sm:not-sr-only" : undefined}>
      {children}
    </span>
  );
}

export function BrandTag({ prefix }: { prefix: "EW" | "WF" | "SH" }) {
  const tone =
    prefix === "SH"
      ? "bg-[#5c3a1e] text-amber-50 ring-1 ring-[#3d2414] dark:bg-[#4a2e18] dark:text-amber-100 dark:ring-[#2a1809]"
      : "bg-slate-200 text-slate-700 ring-1 ring-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:ring-slate-600";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-1.5",
        tone,
        "text-[0.7rem] font-bold uppercase tracking-wide flex-shrink-0"
      )}
    >
      {prefix}
    </span>
  );
}

export function RushedTag({ iconOnlyOnPhone }: TokenTagProps = {}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            "inline-flex items-center gap-0.5 rounded-md px-1 py-px",
            "bg-red-500 text-white ring-1 ring-red-600",
            "dark:bg-red-500/90 dark:ring-red-400/60",
            "text-[0.525rem] font-bold uppercase tracking-wide flex-shrink-0",
            "shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_1px_2px_rgba(0,0,0,0.08)]"
          )}
        >
          <Zap
            className="h-[0.5625rem] w-[0.5625rem]"
            strokeWidth={2.75}
            fill="currentColor"
          />
          <TagLabel iconOnlyOnPhone={iconOnlyOnPhone}>Rushed</TagLabel>
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <p>Rushed order</p>
      </TooltipContent>
    </Tooltip>
  );
}

export function SemiRushedTag({ iconOnlyOnPhone }: TokenTagProps = {}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            "inline-flex items-center gap-0.5 rounded-md px-1 py-px",
            "bg-orange-500 text-white ring-1 ring-orange-600",
            "dark:bg-orange-500/90 dark:ring-orange-400/60",
            "text-[0.525rem] font-bold uppercase tracking-wide flex-shrink-0",
            "shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_1px_2px_rgba(0,0,0,0.08)]"
          )}
        >
          <Zap
            className="h-[0.5625rem] w-[0.5625rem]"
            strokeWidth={SEMI_RUSHED_ICON_STROKE_WIDTH}
          />
          <TagLabel iconOnlyOnPhone={iconOnlyOnPhone}>Semi-Rushed</TagLabel>
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <p>Semi-rushed order</p>
      </TooltipContent>
    </Tooltip>
  );
}

export function LocalTag({ iconOnlyOnPhone }: TokenTagProps = {}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            "inline-flex items-center gap-0.5 rounded-md px-1 py-px",
            "bg-teal-500 text-white ring-1 ring-teal-600",
            "dark:bg-teal-500/90 dark:ring-teal-400/60",
            "text-[0.525rem] font-bold uppercase tracking-wide flex-shrink-0",
            "shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_1px_2px_rgba(0,0,0,0.08)]"
          )}
        >
          <MapPin
            className="h-[0.5625rem] w-[0.5625rem]"
            strokeWidth={2.75}
            fill="currentColor"
          />
          <TagLabel iconOnlyOnPhone={iconOnlyOnPhone}>Local</TagLabel>
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <p>Local pickup / delivery</p>
      </TooltipContent>
    </Tooltip>
  );
}

export function VerticalTag({ iconOnlyOnPhone }: TokenTagProps = {}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            "inline-flex items-center gap-0.5 rounded-md px-1 py-px",
            "bg-blue-500 text-white ring-1 ring-blue-600",
            "dark:bg-blue-500/90 dark:ring-blue-400/60",
            "text-[0.525rem] font-bold uppercase tracking-wide flex-shrink-0",
            "shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_1px_2px_rgba(0,0,0,0.08)]"
          )}
        >
          <MoveVertical
            className="h-[0.5625rem] w-[0.5625rem]"
            strokeWidth={2.75}
          />
          <TagLabel iconOnlyOnPhone={iconOnlyOnPhone}>Vertical</TagLabel>
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <p>Vertical order</p>
      </TooltipContent>
    </Tooltip>
  );
}

export function CustomTag({ iconOnlyOnPhone }: TokenTagProps = {}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            "inline-flex items-center gap-0.5 rounded-md px-1 py-px",
            "bg-purple-500 text-white ring-1 ring-purple-600",
            "dark:bg-purple-500/90 dark:ring-purple-400/60",
            "text-[0.525rem] font-bold uppercase tracking-wide flex-shrink-0",
            "shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_1px_2px_rgba(0,0,0,0.08)]"
          )}
        >
          <Wrench className="h-[0.5625rem] w-[0.5625rem]" strokeWidth={2.75} />
          <TagLabel iconOnlyOnPhone={iconOnlyOnPhone}>Custom</TagLabel>
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <p>Custom order</p>
      </TooltipContent>
    </Tooltip>
  );
}

export function CenterFadeTag({ iconOnlyOnPhone }: TokenTagProps = {}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            "inline-flex items-center gap-0.5 rounded-md px-1 py-px",
            "bg-cyan-600 text-white ring-1 ring-cyan-700",
            "dark:bg-cyan-600/90 dark:ring-cyan-400/60",
            "text-[0.525rem] font-bold uppercase tracking-wide flex-shrink-0",
            "shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_1px_2px_rgba(0,0,0,0.08)]"
          )}
        >
          <Blend
            className="h-[0.5625rem] w-[0.5625rem]"
            strokeWidth={CENTER_FADE_ICON_STROKE_WIDTH}
          />
          <TagLabel iconOnlyOnPhone={iconOnlyOnPhone}>Center Fade</TagLabel>
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <p>Center fade order</p>
      </TooltipContent>
    </Tooltip>
  );
}

// Single source of truth for rendering an order's customer name plus all
// token-derived badges inline. Both the orders board (NameCell) and the
// planner (OrderCard) call this, so any badge added here automatically
// appears on every surface.
export function OrderNameDisplay({ rawName, compact = false, extraBadge, isVertical: savedIsVertical }: {
  rawName: string;
  compact?: boolean;
  extraBadge?: ReactNode;
  isVertical?: boolean;
}) {
  const {
    displayName,
    isRushed,
    isSemiRushed,
    isLocal,
    isVertical,
    isCustom,
    isCenterFade,
    brandPrefix,
    isPrintMarker,
  } = parseNameTokens(rawName, savedIsVertical);
  const [firstTwoWords, restOfName] = splitFirstTwoWords(displayName);
  const name = isPrintMarker ? (
    <PrintMarkerTag />
  ) : (
    <span className={compact ? cn(ORDER_ROW_LAYOUT.namePreview, PHONE_NAME_PREVIEW) : undefined} title={compact ? rawName : undefined}>
      {parseMinecraftColors(firstTwoWords)}
      <span className="opacity-55 text-[0.92em]">
        {parseMinecraftColors(restOfName)}
      </span>
    </span>
  );
  const badges = (
    <>
      {extraBadge}
      {brandPrefix && <BrandTag prefix={brandPrefix} />}
      {isRushed && <RushedTag iconOnlyOnPhone={compact} />}
      {isSemiRushed && <SemiRushedTag iconOnlyOnPhone={compact} />}
      {isLocal && <LocalTag iconOnlyOnPhone={compact} />}
      {isVertical && <VerticalTag iconOnlyOnPhone={compact} />}
      {isCustom && <CustomTag iconOnlyOnPhone={compact} />}
      {isCenterFade && <CenterFadeTag iconOnlyOnPhone={compact} />}
    </>
  );
  const hasBadges = extraBadge || brandPrefix || isRushed || isSemiRushed || isLocal || isVertical || isCustom || isCenterFade;
  return compact ? (
    <span className="flex w-full min-w-0 flex-col gap-0.5">
      {name}
      {hasBadges && (
        <span className="flex max-w-full items-center gap-1 overflow-x-auto whitespace-nowrap scrollbar-hide">
          {badges}
        </span>
      )}
    </span>
  ) : <>{name}{badges}</>;
}

export function PrintMarkerTag() {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5",
        "bg-amber-100 text-amber-900 ring-1 ring-amber-300",
        "dark:bg-amber-500/20 dark:text-amber-200 dark:ring-amber-400/40",
        "text-xs font-bold uppercase tracking-wider"
      )}
    >
      <Printer className="h-3.5 w-3.5" strokeWidth={2.5} />
      Print
    </span>
  );
}
