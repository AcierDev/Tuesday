"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { List, Calendar, Barcode } from "lucide-react";
import { cn } from "@/utils/functions";

export const MobileBottomNav = () => {
  const pathname = usePathname();

  const navItems = [
    {
      name: "Orders",
      href: "/orders",
      icon: List,
    },
    {
      name: "Planner",
      href: "/weekly-planner",
      icon: Calendar,
    },
    {
      name: "Labels",
      href: "/labels",
      icon: Barcode,
    },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 lg:hidden pb-safe">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full space-y-1",
                isActive
                  ? "text-primary dark:text-blue-400"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};
