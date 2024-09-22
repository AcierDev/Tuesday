'use client'

import { Calculator, Logs, Menu, PackageOpen, PaintbrushVertical, Scissors, Truck } from 'lucide-react'
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
]

export const Navbar = () => {
  const pathname = usePathname()
  const [activeTab, setActiveTab] = useState(pathname)

  useEffect(() => {
    setActiveTab(pathname)
  }, [pathname])

  const NavLink = ({ href, icon: Icon, label }) => (
    <Link passHref href={href}>
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
    <nav className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between px-4 sm:px-8">
        <Link className="mr-6 flex items-center space-x-2" href="/">
          <span className="text-xl font-bold">Tuesday</span>
        </Link>
        <div className="hidden md:flex md:items-center md:space-x-4 mx-auto">
          {navItems.map((item) => (
            <NavLink key={item.href} {...item} />
          ))}
        </div>
        <Sheet>
          <SheetTrigger asChild>
            <Button className="md:hidden" size="icon" variant="ghost">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right">
            <div className="flex flex-col space-y-4">
              {navItems.map((item) => (
                <NavLink key={item.href} {...item} />
              ))}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  )
}