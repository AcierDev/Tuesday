"use client"

import { Plus, Search } from "lucide-react"
import { type ChangeEvent, useEffect, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PageToggle } from "@/components/ui/PageToggle"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

interface HeaderProps {
  searchTerm: string
  onSearchChange: (term: string) => void
  onNewOrder: () => void
  isMobile: boolean
  currentMode: string
  onModeChange: (mode: string) => void
  dueCounts: Record<string, number>
}

export const Header: React.FC<HeaderProps> = ({
  searchTerm,
  onSearchChange,
  onNewOrder,
  isMobile,
  currentMode,
  onModeChange,
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

  const SECTIONS = ["all", "geometric", "striped", "tiled", "mini", "custom"];

  return (
    <div
      className={`select-none bg-white/80 dark:bg-gray-950/80 backdrop-blur-md border-b border-gray-200/80 dark:border-gray-800 ${
        isMobile ? "" : "sticky top-0 z-50"
      }`}
    >
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-3">
          <div className="flex items-center gap-4 sm:flex-shrink-0">
            <div className="flex items-center gap-3 sm:min-w-[220px]">
              <span className="hidden sm:block h-7 w-1 rounded-full bg-gradient-to-b from-blue-500 to-blue-600" />
              <h1 className="text-lg sm:text-xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">
                Order Management
              </h1>
            </div>

            <PageToggle currentPage="orders" />
          </div>

          {/* Design / art-style selector — center of the same row. */}
          <div className="flex justify-center sm:flex-1 sm:min-w-0">
            <ToggleGroup
              type="single"
              value={currentMode}
              onValueChange={(value) => {
                if (value) onModeChange(value);
              }}
              className="inline-flex flex-wrap justify-center gap-1 rounded-full bg-gray-100 dark:bg-gray-800/60 p-1 ring-1 ring-inset ring-gray-200/60 dark:ring-gray-700/60"
            >
              {SECTIONS.map((mode) => (
                <ToggleGroupItem
                  key={mode}
                  value={mode}
                  aria-label={`Toggle ${mode} mode`}
                  className="relative h-8 px-3.5 rounded-full text-sm font-medium text-gray-600 dark:text-gray-400 transition-colors hover:text-gray-900 dark:hover:text-gray-200 hover:bg-transparent data-[state=on]:bg-white data-[state=on]:text-gray-900 data-[state=on]:shadow-sm dark:data-[state=on]:bg-gray-700 dark:data-[state=on]:text-white"
                >
                  <span className="relative z-10">
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </span>
                  {(dueCounts[mode] ?? 0) > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full h-4 min-w-4 px-1 flex items-center justify-center ring-2 ring-white dark:ring-gray-950 z-20">
                      {dueCounts[mode]}
                    </span>
                  )}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto sm:flex-shrink-0">
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
                  className="h-10 pl-9 pr-3 w-full rounded-full border-gray-200 bg-gray-50 text-sm placeholder:text-gray-400 focus-visible:ring-2 focus-visible:ring-blue-500/30 focus-visible:border-blue-500 focus-visible:bg-white dark:bg-gray-800/60 dark:text-gray-200 dark:border-gray-700 dark:placeholder:text-gray-500 dark:focus-visible:bg-gray-800 dark:focus-visible:border-blue-400 dark:focus-visible:ring-blue-400/30 transition-colors"
                  placeholder="Search orders..."
                  value={searchTerm}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => onSearchChange(e.target.value)}
                  onFocus={handleSearchFocus}
                  onBlur={handleSearchBlur}
                />
              </div>
            </div>
            <Button
              className="h-10 px-4 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium shadow-sm shadow-blue-600/20 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md hover:shadow-blue-600/30 active:translate-y-0 dark:bg-blue-600 dark:hover:bg-blue-500"
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