"use client"

import { Menu, Plus, Search, Settings as SettingsIcon } from "lucide-react"
import { type ChangeEvent, useState } from "react"

import { SettingsPanel } from "@/components/ui/SettingsPanel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"

interface HeaderProps {
  searchTerm: string
  onSearchChange: (term: string) => void
  onNewOrder: () => void
  onOpenSettings: () => void
  isMobile: boolean
}

export const Header: React.FC<HeaderProps> = ({
  searchTerm,
  onSearchChange,
  onNewOrder,
  onOpenSettings,
  isMobile,
}) => {
  const [isWeeklyPlannerOpen, setIsWeeklyPlannerOpen] = useState(false)

  return (
    <div className={`z-30 bg-white shadow-md ${isMobile ? '' : 'sticky top-14'}`}>
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between py-4 space-y-4 sm:space-y-0">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            Order Management
          </h1>
          <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                className="pl-10 pr-4 py-2 w-full border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Search orders..."
                value={searchTerm}
                onChange={(e: ChangeEvent<HTMLInputElement>) => onSearchChange(e.target.value)}
              />
            </div>
            <div className="flex space-x-2 w-full sm:w-auto">
              <Button
                className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-md transition duration-300 ease-in-out flex-grow sm:flex-grow-0"
                onClick={onNewOrder}
              >
                <Plus className="mr-2 h-5 w-5" /> New Order
              </Button>
              {isMobile ? (
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline">
                      <Menu className="h-5 w-5" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent>
                    <SheetHeader>
                      <SheetTitle>Menu</SheetTitle>
                      <p className="text-sm">Access additional options</p>
                    </SheetHeader>
                    <div className="mt-4 space-y-4">
                      <Button
                        className="w-full"
                        variant="outline"
                        onClick={onOpenSettings}
                      >
                        <SettingsIcon className="mr-2 h-5 w-5" /> Settings
                      </Button>
                    </div>
                  </SheetContent>
                </Sheet>
              ) : (
                <Button
                  className="flex-grow sm:flex-grow-0"
                  variant="outline"
                  onClick={onOpenSettings}
                >
                  <SettingsIcon className="mr-2 h-5 w-5" /> Settings
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}