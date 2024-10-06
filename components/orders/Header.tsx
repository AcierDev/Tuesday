"use client"

import { Plus, Search } from "lucide-react"
import { type ChangeEvent, useEffect, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleSearchFocus = () => {
    setIsSearchActive(true)
  }

  const handleSearchBlur = () => {
    setIsSearchActive(false)
  }

  return (
    <div className={`z-30 bg-white dark:bg-gray-800 shadow-md ${isMobile ? '' : 'sticky top-14'}`}>
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between py-4 space-y-4 sm:space-y-0">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 w-full sm:w-1/4">
            Order Management
          </h1>
          <div className="flex justify-center w-full sm:w-2/4">
            <ToggleGroup 
              type="single" 
              value={currentMode} 
              onValueChange={(value) => {
                if (value) onModeChange(value);
              }} 
              className="flex flex-wrap justify-center gap-3"
            >
              {["all", "geometric", "striped", "tiled", "mini", "custom"].map((mode) => (
                <ToggleGroupItem 
                  key={mode} 
                  value={mode} 
                  aria-label={`Toggle ${mode} mode`} 
                  className="px-3 py-1 relative dark:text-gray-200 dark:data-[state=on]:bg-gray-700 dark:data-[state=on]:text-white"
                >
                  <span className="relative z-10">
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </span>
                  {(dueCounts[mode] ?? 0) > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center z-20">
                      {dueCounts[mode]}
                    </span>
                  )}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
          <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4 w-full sm:w-1/4 sm:justify-end">
            <div className={`relative w-full sm:w-64 transition-all duration-300 ease-in-out ${isSearchActive ? 'scale-105 shadow-lg' : ''}`}>
              <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 transition-all duration-300 ${isSearchActive ? 'scale-110' : ''}`} />
              <Input
                ref={searchInputRef}
                className={`pl-10 pr-4 py-2 w-full border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:focus:ring-blue-400 transition-all duration-300 ${isSearchActive ? 'bg-blue-50 dark:bg-gray-600' : ''}`}
                placeholder="Search orders..."
                value={searchTerm}
                onChange={(e: ChangeEvent<HTMLInputElement>) => onSearchChange(e.target.value)}
                onFocus={handleSearchFocus}
                onBlur={handleSearchBlur}
              />
            </div>
            <Button
              className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-md transition duration-300 ease-in-out w-full sm:w-auto dark:bg-blue-600 dark:hover:bg-blue-700"
              onClick={onNewOrder}
            >
              <Plus className="mr-2 h-5 w-5" /> New Order
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}