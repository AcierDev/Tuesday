"use client"

import { Plus, Search } from "lucide-react"
import { type ChangeEvent, useEffect, useRef, useState } from "react"
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

  const TYPES = ["all", "geometric", "striped", "mini", "custom"];

  return (
    <div className="select-none bg-white/80 dark:bg-gray-950/80 backdrop-blur-md border-b border-gray-200/80 dark:border-gray-800 sticky top-0 z-50">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-3">
          <div className="flex items-center gap-4 sm:flex-shrink-0">
            <div className="flex items-center gap-3 sm:min-w-[220px]">
              <span className="hidden sm:block h-7 w-1 rounded-full bg-gradient-to-b from-blue-500 to-blue-600" />
              <h1 className="text-lg sm:text-xl font-semibold tracking-tight bg-gradient-to-br from-gray-900 to-blue-700 dark:from-white dark:to-blue-300 bg-clip-text text-transparent [-webkit-text-fill-color:transparent] [forced-color-adjust:none]">
                Order Management
              </h1>
            </div>

            <PageToggle currentPage="orders" />
          </div>

          {/* Type toggle — center of the same row. Active pill slides
              between options via framer-motion's shared layoutId. */}
          <div className="flex justify-center sm:flex-1 sm:min-w-0">
            <ToggleGroup
              type="single"
              value={currentType}
              onValueChange={(value) => {
                if (value) onTypeChange(value);
              }}
              className="inline-flex flex-wrap justify-center gap-1 rounded-full bg-gray-100 dark:bg-gray-800/60 p-1 ring-1 ring-inset ring-gray-200/60 dark:ring-gray-700/60"
            >
              {TYPES.map((type) => {
                const isActive = currentType === type;
                return (
                  <ToggleGroupItem
                    key={type}
                    value={type}
                    aria-label={`Toggle ${type} type`}
                    className="relative h-8 px-3.5 rounded-full text-sm font-medium text-gray-600 dark:text-gray-400 transition-colors hover:text-gray-900 dark:hover:text-gray-200 hover:bg-transparent data-[state=on]:bg-transparent data-[state=on]:shadow-none data-[state=on]:text-gray-900 dark:data-[state=on]:text-white"
                  >
                    {isActive && (
                      <motion.span
                        layoutId="type-toggle-pill"
                        className="absolute inset-0 pointer-events-none"
                        transition={{ type: "spring", stiffness: 480, damping: 36 }}
                      >
                        <span className="absolute inset-0 bg-white dark:bg-gray-700 rounded-full shadow-sm animate-pill-squish" />
                      </motion.span>
                    )}
                    <span className="relative z-10">
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </span>
                    {(dueCounts[type] ?? 0) > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full h-4 min-w-4 px-1 flex items-center justify-center ring-2 ring-white dark:ring-gray-950 z-20">
                        {dueCounts[type]}
                      </span>
                    )}
                  </ToggleGroupItem>
                );
              })}
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