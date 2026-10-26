"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";

interface NavbarLinkProps {
  href: string;
  icon: React.ComponentType<{ className?: string }> | string;
  label: string;
  activeTab: string;
  sidebarOpen: boolean;
}

// Sidebar nav entry. When the rail is collapsed, the label shows as a
// portaled hover tooltip beside the icon.
export function NavbarLink({
  href,
  icon: Icon,
  label,
  activeTab,
  sidebarOpen,
}: NavbarLinkProps) {
  const isActive = activeTab === href;
  const isCollapsed = !sidebarOpen;
  const [hovered, setHovered] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (hovered && isCollapsed && wrapperRef.current) {
      const iconEl = wrapperRef.current.querySelector<HTMLElement>(
        "[data-nav-icon]"
      );
      const iconRect = (iconEl ?? wrapperRef.current).getBoundingClientRect();
      const wrapperRect = wrapperRef.current.getBoundingClientRect();
      setTooltipPos({
        top: iconRect.top + iconRect.height / 2,
        left: wrapperRect.right + 8,
      });
    }
  }, [hovered, isCollapsed]);

  if (!href) return null;

  return (
    <div
      ref={wrapperRef}
      className={`relative ${isCollapsed ? "py-1 -my-1" : ""}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <motion.div
        animate={{ x: isCollapsed && hovered ? 4 : 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
      >
        <Link
          href={href}
          className={`flex items-center w-full rounded-lg text-sm font-medium
            px-3 py-3 ${isCollapsed ? "justify-center" : ""}
            ${
              isActive
                ? "bg-secondary text-secondary-foreground dark:bg-blue-900/30 dark:text-blue-200"
                : "text-muted-foreground hover:bg-muted hover:text-primary dark:hover:bg-gray-800/50"
            }
            transition-colors duration-200 relative`}
        >
          {typeof Icon === "string" ? (
            <Image
              data-nav-icon
              src={Icon}
              alt={label}
              width={isCollapsed ? 24 : 20}
              height={isCollapsed ? 24 : 20}
              className={`${isCollapsed ? "mr-0" : "mr-3"}`}
            />
          ) : (
            <Icon
              data-nav-icon
              className={`flex-shrink-0 ${
                isCollapsed ? "h-6 w-6 mr-0" : "h-5 w-5 mr-3"
              }`}
            />
          )}
          {sidebarOpen && <span>{label}</span>}
          {isActive && (
            <span className="absolute inset-y-0 left-0 w-1 bg-blue-500 rounded-r-full" />
          )}
        </Link>
      </motion.div>
      {isCollapsed &&
        mounted &&
        createPortal(
          <div
            className="fixed -translate-y-1/2 z-[100] pointer-events-none"
            style={{ top: tooltipPos.top, left: tooltipPos.left }}
          >
            <motion.div
              initial={false}
              animate={{
                opacity: hovered ? 1 : 0,
                x: hovered ? 0 : -8,
              }}
              transition={{ duration: 0.12, ease: "easeOut" }}
            >
              <div className="px-3 py-2 text-sm font-medium leading-none text-foreground bg-gray-900/90 backdrop-blur-md backdrop-saturate-150 border border-white/15 rounded-lg shadow-lg whitespace-nowrap scale-[1.15] origin-left">
                {label}
              </div>
            </motion.div>
          </div>,
          document.body
        )}
    </div>
  );
}
