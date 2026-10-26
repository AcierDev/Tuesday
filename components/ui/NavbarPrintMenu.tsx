"use client";

import { useCallback, useRef, useState } from "react";
import {
  Box,
  CalendarClock,
  Columns3,
  Columns4,
  Drill,
  Printer,
} from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

import { Columns5 } from "@/components/ui/NavbarIcons";
import { printImage, printPdf } from "@/components/ui/navbar-print";
import {
  DUE_REPORT_WEEK_OPTIONS,
  printDueReport,
} from "@/components/ui/navbar-due-report";

type PrintTemplateBase = {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
};

type PrintTemplate =
  | (PrintTemplateBase & { type: "pdf"; src: string })
  | (PrintTemplateBase & {
      type: "image";
      src: string;
      orientation: "landscape" | "portrait";
    })
  | (PrintTemplateBase & { type: "due-report"; weeks: number });

// Grace period before the popout closes, so the cursor can cross the gap
// between the button and the menu.
const PRINT_MENU_CLOSE_DELAY_MS = 400;

const printTemplates: PrintTemplate[] = [
  {
    name: "Drywall Anchors",
    src: "/images/drywall-anchors.png",
    type: "image",
    orientation: "landscape",
    icon: Drill,
  },
  { name: "2 Boxes", src: "/pdf/2-boxes.pdf", type: "pdf", icon: Box },
  { name: "3 Boxes", src: "/pdf/3-boxes.pdf", type: "pdf", icon: Box },
  { name: "4 Boxes", src: "/pdf/4-boxes.pdf", type: "pdf", icon: Box },
  { name: "3 Panels", src: "/pdf/3-panels.pdf", type: "pdf", icon: Columns3 },
  { name: "4 Panels", src: "/pdf/4-panels.pdf", type: "pdf", icon: Columns4 },
  { name: "5 Panels", src: "/pdf/5-panels.pdf", type: "pdf", icon: Columns5 },
  ...DUE_REPORT_WEEK_OPTIONS.map(
    (weeks): PrintTemplate => ({
      name: `Due in ${weeks} Week${weeks > 1 ? "s" : ""}`,
      type: "due-report",
      weeks,
      icon: CalendarClock,
    })
  ),
];

// Print button with a hover popout of quick-print templates.
export function NavbarPrintMenu({ sidebarOpen }: { sidebarOpen: boolean }) {
  const [printHovered, setPrintHovered] = useState(false);
  const printLeaveTimerRef = useRef<number | null>(null);

  const openPrintHover = useCallback(() => {
    if (printLeaveTimerRef.current !== null) {
      window.clearTimeout(printLeaveTimerRef.current);
      printLeaveTimerRef.current = null;
    }
    setPrintHovered(true);
  }, []);

  const closePrintHover = useCallback(() => {
    if (printLeaveTimerRef.current !== null) {
      window.clearTimeout(printLeaveTimerRef.current);
    }
    printLeaveTimerRef.current = window.setTimeout(() => {
      setPrintHovered(false);
      printLeaveTimerRef.current = null;
    }, PRINT_MENU_CLOSE_DELAY_MS);
  }, []);

  const handleQuickPrint = useCallback((tpl: PrintTemplate) => {
    if (printLeaveTimerRef.current !== null) {
      window.clearTimeout(printLeaveTimerRef.current);
      printLeaveTimerRef.current = null;
    }
    setPrintHovered(false);
    if (tpl.type === "pdf") {
      printPdf(tpl.src);
    } else if (tpl.type === "image") {
      printImage(tpl.src, tpl.orientation);
    } else {
      printDueReport(tpl.weeks);
    }
  }, []);

  return (
    <div
      className="relative"
      onMouseEnter={openPrintHover}
      onMouseLeave={closePrintHover}
    >
      <Link href="/print" className="sidebar-action-btn">
        <Printer className={`${sidebarOpen ? "h-5 w-5" : "h-6 w-6"} flex-shrink-0`} />
        {sidebarOpen && <span className="ml-2">Print</span>}
      </Link>
      <motion.div
        onMouseEnter={openPrintHover}
        onMouseLeave={closePrintHover}
        className={`fixed bottom-0 ${
          sidebarOpen ? "left-64" : "left-[4.25rem]"
        } pl-2 pb-3 z-50 ${
          printHovered ? "" : "pointer-events-none"
        }`}
        initial={{ opacity: 0, x: -8 }}
        animate={{
          opacity: printHovered ? 1 : 0,
          x: printHovered ? 0 : -8,
        }}
        transition={{ duration: 0.1, ease: "easeOut" }}
      >
        <motion.div
          className="flex flex-col gap-1.5 min-w-[180px]"
          initial="hidden"
          animate={printHovered ? "visible" : "hidden"}
          variants={{
            hidden: {
              transition: {
                staggerChildren: 0.02,
                staggerDirection: 1,
              },
            },
            visible: {
              transition: {
                staggerChildren: 0.03,
                staggerDirection: -1,
                delayChildren: 0.04,
              },
            },
          }}
        >
          {printTemplates.map((tpl) => {
            const Icon = tpl.icon;
            return (
              <motion.button
                key={tpl.name}
                variants={{
                  hidden: { opacity: 0, y: 4 },
                  visible: { opacity: 1, y: 0 },
                }}
                transition={{ duration: 0.12, ease: "easeOut" }}
                onClick={() => handleQuickPrint(tpl)}
                className="sidebar-action-btn !bg-gray-900/65 hover:!bg-gray-900/95 justify-start text-left"
              >
                <Icon className="w-4 h-4 mr-2 flex-shrink-0" />
                {tpl.name}
              </motion.button>
            );
          })}
        </motion.div>
      </motion.div>
    </div>
  );
}
