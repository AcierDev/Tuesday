'use client'

import { Calculator, Logs, Menu, PackageOpen, PaintbrushVertical, Scissors, Truck, Printer, Settings, Power, Wrench, Accessibility } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'

import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { GiCircularSaw } from "react-icons/gi";

const mainNavItems = [
  { href: '/orders', icon: Logs, label: 'Orders', hotkey: '1' },
  { href: '/shipping', icon: Truck, label: 'Shipping', hotkey: '2' },
  { href: '/paint', icon: PaintbrushVertical, label: 'Paint', hotkey: '3' },
  { href: '/packaging', icon: PackageOpen, label: 'Packaging', hotkey: '4' },
  { href: '/backboards', icon: Scissors, label: 'Backboards', hotkey: '5' },
  { href: '/cutting', icon: GiCircularSaw, label: 'Cutting' },
    { href: '/calculator', icon: Calculator, label: 'Calculator', hotkey: '6' },
  { href: '/print', icon: Printer, label: 'Print', hotkey: '7' },
  { href: '/outlets', icon: Power, label: 'Outlets', hotkey: '8' },
  { href: '/setup-utility', icon: Accessibility, label: 'Setup Utility', hotkey: '9' },
]

const toolsNavItems = [

]

interface NavbarProps {
  onOpenSettings: () => void
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenSettings }) => {
  const pathname = usePathname()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState(pathname)

  useEffect(() => {
    setActiveTab(pathname)
  }, [pathname])

  const isInputElement = (element: Element | null): boolean => {
    if (!element) return false
    const tagName = element.tagName.toLowerCase()
    return tagName === 'input' || tagName === 'textarea' || element.getAttribute('contenteditable') === 'true'
  }

  const handleHotkey = useCallback((key: string) => {
    const allNavItems = [...mainNavItems, ...toolsNavItems]
    const navItem = allNavItems.find(item => item.hotkey === key)
    if (navItem) {
      router.push(navItem.href)
    }
  }, [router])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isInputElement(document.activeElement)) {
        return
      }

      if (event.ctrlKey || event.altKey || event.metaKey) {
        return
      }

      const key = event.key
      if (/^[1-9]$/.test(key)) {
        event.preventDefault()
        handleHotkey(key)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleHotkey])

  const NavLink = ({ href, icon: Icon, label }) => (
    <Link href={href} passHref>
      <Button
        className="w-full justify-start"
        variant={activeTab === href ? 'default' : 'ghost'}
      >
        <Icon className="mr-2 h-4 w-4" />
        {label}
      </Button>
    </Link>
  )

  const ToolsDropdown = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="w-full justify-start">
          <Wrench className="mr-2 h-4 w-4" />
          Tools
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {toolsNavItems.map((item) => (
          <DropdownMenuItem key={item.href}>
            <Link href={item.href} className="flex items-center w-full">
              <item.icon className="mr-2 h-4 w-4" />
              {item.label}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )

  return (
    <nav className="sticky top-0 z-40 w-full border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 transition-colors duration-200">
      <div className="w-full flex h-14 items-center px-4 sm:px-8">
        {/* Left Section: Logo */}
        <div className="flex-shrink-0 mr-4">
          <Link className="flex items-center space-x-2" href="/">
            <span className="text-xl font-bold text-gray-900 dark:text-gray-100">Tuesday</span>
          </Link>
        </div>

        {/* Center Section: Nav Links */}
        <div className="hidden md:flex md:items-center md:justify-center flex-grow">
          <div className="flex space-x-1">
            {mainNavItems.map((item) => (
              <NavLink key={item.href} {...item} />
            ))}
            {/* <ToolsDropdown /> */}
          </div>
        </div>

        {/* Right Section: Settings Button and Mobile Menu */}
        <div className="flex items-center ml-4">
          {/* Settings Button for Desktop */}
          <Button
            className="hidden md:flex dark:bg-white dark:text-black"
            variant="outline"
            onClick={onOpenSettings}
          >
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Button>

          {/* Mobile Menu */}
          <Sheet>
            <SheetTrigger asChild>
              <Button className="md:hidden ml-4" size="icon" variant="ghost">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
              <div className="flex flex-col space-y-4">
                {mainNavItems.map((item) => (
                  <NavLink key={item.href} {...item} />
                ))}
                <ToolsDropdown />
                <Button
                  className="w-full justify-start"
                  variant="ghost"
                  onClick={onOpenSettings}
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  )
}