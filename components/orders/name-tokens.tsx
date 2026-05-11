"use client";

import { MapPin, MoveVertical, Printer, Zap } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn, splitFirstTwoWords } from "@/utils/functions";
import { parseMinecraftColors } from "@/parseMinecraftColors";

const RUSHED_TOKEN = /\(rushed\)/i;
const LOCAL_TOKEN = /\(local\)/i;
const VERTICAL_TOKEN = /\(vertical\)/i;
const BRAND_PREFIX = /^\[(EW|WF|SH)\]\s*/;

export type NameTokens = {
  displayName: string;
  isRushed: boolean;
  isLocal: boolean;
  isVertical: boolean;
  brandPrefix: "EW" | "WF" | "SH" | null;
  isPrintMarker: boolean;
};

// Strips inline tokens like "(rushed)" and "[EW]" from the customer name and
// surfaces them as structured data, so any view that renders the name (orders
// board, planner card, etc.) can show the same set of badges.
export function parseNameTokens(rawName: string): NameTokens {
  const trimmed = rawName ?? "";
  const isRushed = RUSHED_TOKEN.test(trimmed);
  const isLocal = LOCAL_TOKEN.test(trimmed);
  const isVertical = VERTICAL_TOKEN.test(trimmed);
  const stripped = trimmed
    .replace(RUSHED_TOKEN, "")
    .replace(LOCAL_TOKEN, "")
    .replace(VERTICAL_TOKEN, "")
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
    isLocal,
    isVertical,
    brandPrefix,
    isPrintMarker,
  };
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

export function RushedTag() {
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
          Rushed
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <p>Rushed order</p>
      </TooltipContent>
    </Tooltip>
  );
}

export function LocalTag() {
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
          Local
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <p>Local pickup / delivery</p>
      </TooltipContent>
    </Tooltip>
  );
}

export function VerticalTag() {
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
          Vertical
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <p>Vertical order</p>
      </TooltipContent>
    </Tooltip>
  );
}

// Single source of truth for rendering an order's customer name plus all
// token-derived badges inline. Both the orders board (NameCell) and the
// planner (OrderCard) call this, so any badge added here automatically
// appears on every surface.
export function OrderNameDisplay({ rawName }: { rawName: string }) {
  const {
    displayName,
    isRushed,
    isLocal,
    isVertical,
    brandPrefix,
    isPrintMarker,
  } = parseNameTokens(rawName);
  const [firstTwoWords, restOfName] = splitFirstTwoWords(displayName);
  return (
    <>
      {isPrintMarker ? (
        <PrintMarkerTag />
      ) : (
        <span>
          {parseMinecraftColors(firstTwoWords)}
          <span className="opacity-55 text-[0.92em]">
            {parseMinecraftColors(restOfName)}
          </span>
        </span>
      )}
      {brandPrefix && <BrandTag prefix={brandPrefix} />}
      {isRushed && <RushedTag />}
      {isLocal && <LocalTag />}
      {isVertical && <VerticalTag />}
    </>
  );
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
