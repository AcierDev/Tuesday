"use client";

import {
  PencilRuler,
  Ruler,
  LayoutGrid,
  Grid3x3,
  SquareStack,
  ClipboardList,
  ListChecks,
  Sliders,
  SlidersHorizontal,
  Settings2,
  Wrench,
  type LucideIcon,
} from "lucide-react";

const SETUP_CANDIDATES: { name: string; Icon: LucideIcon }[] = [
  { name: "PencilRuler", Icon: PencilRuler },
  { name: "Ruler", Icon: Ruler },
  { name: "LayoutGrid", Icon: LayoutGrid },
  { name: "Grid3x3", Icon: Grid3x3 },
  { name: "SquareStack", Icon: SquareStack },
  { name: "ClipboardList", Icon: ClipboardList },
  { name: "ListChecks", Icon: ListChecks },
  { name: "Sliders", Icon: Sliders },
  { name: "SlidersHorizontal", Icon: SlidersHorizontal },
  { name: "Settings2", Icon: Settings2 },
  { name: "Wrench", Icon: Wrench },
];

export default function IconsPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Setup Utility — Icon Candidates
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
          Pick one to replace the current Accessibility icon in the sidebar.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-12">
          {SETUP_CANDIDATES.map(({ name, Icon }) => (
            <div
              key={name}
              className="flex flex-col items-center justify-center gap-3 p-6 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm"
            >
              <Icon className="h-16 w-16 text-gray-700 dark:text-gray-300" />
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                {name}
              </span>
            </div>
          ))}
        </div>

        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
          Preview at sidebar size
        </h2>
        <div className="flex flex-wrap gap-2">
          {SETUP_CANDIDATES.map(({ name, Icon }) => (
            <div
              key={name}
              className="flex flex-col items-center justify-center w-20 h-20 rounded-xl px-1 bg-white/70 dark:bg-gray-900/40 backdrop-blur-md border border-white/30 dark:border-white/10 shadow"
            >
              <Icon className="h-7 w-7 text-blue-500" />
              <span className="mt-0.5 w-full truncate text-center text-[9px] font-medium uppercase tracking-wide opacity-80 text-gray-700 dark:text-gray-300">
                {name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
