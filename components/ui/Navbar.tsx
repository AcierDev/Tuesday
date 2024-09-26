'use client'

import { Calculator, Logs, Menu, PackageOpen, PaintbrushVertical, Scissors, Truck, Printer, Settings, Power } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

const navItems = [
  { href: '/orders', icon: Logs, label: 'Orders' },
  { href: '/shipping', icon: Truck, label: 'Shipping' },
  { href: '/paint', icon: PaintbrushVertical, label: 'Paint' },
  { href: '/packaging', icon: PackageOpen, label: 'Packaging' },
  { href: '/backboards', icon: Scissors, label: 'Backboards' },
  { href: '/calculator', icon: Calculator, label: 'Calculator' },
  { href: '/print', icon: Printer, label: 'Print' },
  { href: '/outlets', icon: Power, label: 'Outlets' },
]

interface NavbarProps {
  onOpenSettings: () => void
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenSettings }) => {
  const pathname = usePathname()
  const [activeTab, setActiveTab] = useState(pathname)

  useEffect(() => {
    setActiveTab(pathname)
  }, [pathname])

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

  return (
    <nav className="sticky top-0 z-40 w-full border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 transition-colors duration-200">
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
            {navItems.map((item) => (
              <NavLink key={item.href} {...item} />
            ))}
          </div>
        </div>

        {/* Right Section: Settings Button and Mobile Menu */}
        <div className="flex items-center ml-4">
          {/* Settings Button for Desktop */}
          <Button
            className="hidden md:flex"
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
                {navItems.map((item) => (
                  <NavLink key={item.href} {...item} />
                ))}
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