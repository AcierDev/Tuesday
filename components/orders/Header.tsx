"use client"

import { Plus, Search } from "lucide-react"
import { type ChangeEvent, useEffect, useLayoutEffect, useRef, useState } from "react"
import { motion } from "framer-motion"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PageToggle } from "@/components/ui/PageToggle"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

interface HeaderProps {
  searchTerm: string
  onSearchChange: (term: string) => void
  onNewOrder: () => void
  currentType: string
  onTypeChange: (type: string) => void
  dueCounts: Record<string, number>
}

export const Header: React.FC<HeaderProps> = ({
  searchTerm,
  onSearchChange,
  onNewOrder,
  currentType,
  onTypeChange,
  dueCounts,
}) => {
  const [isSearchActive, setIsSearchActive] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
        event.preventDefault()
        setIsSearchActive(true)
        searchInputRef.current?.focus()
      } else if (event.key === 'Escape' && document.activeElement === searchInputRef.current) {
        event.preventDefault()
        searchInputRef.current?.blur()
        setIsSearchActive(false)
      }
    }

    globalThis.addEventListener('keydown', handleKeyDown)
    return () => globalThis.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleSearchFocus = () => {
    setIsSearchActive(true)
  }

  const handleSearchBlur = () => {
    setIsSearchActive(false)
  }

  const TYPES = ["all", "geometric", "striped", "mini", "shepit", "custom"];

  const typeItemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [pillRect, setPillRect] = useState<{ left: number; width: number } | null>(null);

  useLayoutEffect(() => {
    const idx = TYPES.indexOf(currentType);
    const node = typeItemRefs.current[idx];
    if (node) {
      setPillRect({ left: node.offsetLeft, width: node.offsetWidth });
    }
  }, [currentType]);

  return (
    <div className="select-none bg-white/80 dark:bg-gray-950/80 backdrop-blur-md border-b border-gray-200/80 dark:border-gray-800 sticky top-0 z-50">
      <div className="max-w-full mx-auto px-0.5 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-2 lg:gap-4 py-2 lg:py-3">
          <div className="flex items-center justify-between lg:justify-start gap-4 w-full lg:w-auto lg:flex-shrink-0">
            <div className="flex items-center gap-3 sm:min-w-[220px]">
              <span className="hidden sm:block h-7 w-1 rounded-full bg-gradient-to-b from-blue-500 to-blue-600" />
              <h1 className="text-lg sm:text-xl font-semibold tracking-tight bg-gradient-to-br from-gray-900 to-blue-700 dark:from-white dark:to-blue-300 bg-clip-text text-transparent [-webkit-text-fill-color:transparent] [forced-color-adjust:none]">
                Order Management
              </h1>
            </div>

            <div className="hidden lg:block">
              <PageToggle currentPage="orders" />
            </div>
          </div>

          {/* Pill is a sibling of items (rendered first) so it always paints behind the
              label text — avoids the destination-text occlusion when sliding forward. */}
          <div className="flex justify-center lg:flex-1 lg:min-w-0">
            <ToggleGroup
              type="single"
              value={currentType}
              onValueChange={(value) => {
                if (value) onTypeChange(value);
              }}
              className="relative inline-flex flex-nowrap items-center justify-center gap-0.5 sm:gap-1 rounded-full bg-gray-100 dark:bg-gray-800/60 p-0.5 sm:p-1 ring-1 ring-inset ring-gray-200/60 dark:ring-gray-700/60"
            >
              {pillRect && (
                <motion.span
                  className="absolute top-0.5 sm:top-1 bottom-0.5 sm:bottom-1 pointer-events-none"
                  initial={false}
                  animate={{ left: pillRect.left, width: pillRect.width }}
                  transition={{ type: "spring", stiffness: 480, damping: 36 }}
                >
                  <span
                    key={currentType}
                    className="block w-full h-full bg-white dark:bg-gray-700 rounded-full shadow-sm animate-pill-squish"
                  />
                </motion.span>
              )}
              {TYPES.map((type, idx) => (
                <ToggleGroupItem
                  key={type}
                  ref={(el: HTMLButtonElement | null) => { typeItemRefs.current[idx] = el; }}
                  value={type}
                  aria-label={`Toggle ${type} type`}
                  className="relative h-7 px-2.5 text-xs sm:h-8 sm:px-3.5 sm:text-sm rounded-full font-medium text-gray-600 dark:text-gray-400 transition-colors hover:text-gray-900 dark:hover:text-gray-200 hover:bg-transparent data-[state=on]:bg-transparent data-[state=on]:shadow-none data-[state=on]:text-gray-900 dark:data-[state=on]:text-white"
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                  {(dueCounts[type] ?? 0) > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[0.53rem] sm:text-[0.644rem] font-bold rounded-full h-3.5 sm:h-[1.03rem] min-w-[14px] sm:min-w-[1.03rem] px-[3px] sm:px-1 flex items-center justify-center ring-2 ring-white dark:ring-gray-950 z-20">
                      {dueCounts[type]}
                    </span>
                  )}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>

          <div className="hidden lg:flex items-center gap-2 lg:flex-shrink-0">
            <div className="w-full sm:w-64 flex">
              <div
                className={`group relative w-full sm:w-44 sm:ml-auto hover:sm:w-full focus-within:sm:w-full transition-[width] duration-300 ease-out ${
                  isSearchActive || searchTerm ? "sm:!w-full" : ""
                }`}
              >
                <Search
                  className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors ${
                    isSearchActive
                      ? "text-blue-500 dark:text-blue-400"
                      : "text-gray-400 dark:text-gray-500"
                  }`}
                />
                <Input
                  ref={searchInputRef}
                  className="h-10 pl-9 pr-3 w-full rounded-full border-gray-200 bg-gray-50 text-sm placeholder:text-gray-400 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-blue-500 focus-visible:bg-white dark:bg-gray-800/60 dark:text-gray-200 dark:border-gray-700 dark:placeholder:text-gray-500 dark:focus-visible:bg-gray-800 dark:focus-visible:border-blue-400 transition-colors"
                  placeholder="Search orders..."
                  value={searchTerm}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => onSearchChange(e.target.value)}
                  onFocus={handleSearchFocus}
                  onBlur={handleSearchBlur}
                />
              </div>
            </div>
            <Button
              className="h-10 px-4 rounded-full bg-blue-500/40 hover:bg-blue-500/55 text-blue-800 dark:text-white text-sm font-semibold ring-1 ring-inset ring-blue-500/50 dark:ring-blue-400/40 backdrop-blur-sm shadow-sm shadow-blue-500/20 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md hover:shadow-blue-500/30 active:translate-y-0 dark:bg-blue-500/30 dark:hover:bg-blue-500/45"
              onClick={onNewOrder}
            >
              <Plus className="mr-1.5 h-4 w-4" /> New Order
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}