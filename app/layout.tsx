"use client";

import type { Metadata } from "next";
import localFont from "next/font/local";
import { useState } from "react";

import "./globals.css";
import { Navbar } from "@/components/ui/Navbar";
import {
  OrderSettingsProvider,
  useOrderSettings,
} from "@/contexts/OrderSettingsContext";
import { SettingsPanel } from "@/components/settings/SettingsPanel";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { UploadProgressToast } from "@/components/shipping/UploadProgress";

// Load custom fonts
const geistSans = localFont({
  src: "../fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});

const geistMono = localFont({
  src: "../fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

const metadata: Metadata = {
  title: "Tuesday",
  description: "Replacing Monday",
};

// Create a wrapper component that uses the context
function LayoutContent({ children }: { children: React.ReactNode }) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<
    string | undefined
  >(undefined);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { settings, updateSettings } = useOrderSettings();

  const handleOpenSettings = (tab?: string) => {
    setSettingsInitialTab(tab);
    setIsSettingsOpen(true);
  };
  const handleCloseSettings = () => setIsSettingsOpen(false);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100 dark:bg-gray-900">
      <Navbar
        onOpenSettings={handleOpenSettings}
        sidebarOpen={sidebarOpen}
        onSidebarOpenChange={setSidebarOpen}
      />
      <div className="flex-1 overflow-auto no-scrollbar border-t border-sky-400/40">
        <div
          className={`${
            sidebarOpen ? "lg:ml-64" : "lg:ml-16"
          } transition-[margin] duration-300`}
        >
          <main className="w-full">{children}</main>
        </div>
      </div>
      {isSettingsOpen && (
        <SettingsPanel
          onClose={handleCloseSettings}
          settings={settings}
          updateSettings={updateSettings}
          initialTab={settingsInitialTab}
        />
      )}
    </div>
  );
}

// Root layout component
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      className={`dark ${geistSans.variable} ${geistMono.variable}`}
      lang="en"
      style={{ colorScheme: "dark", forcedColorAdjust: "none" }}
      suppressHydrationWarning
    >
      <head>
        {/* Belt-and-suspenders: re-assert .dark on the html element on
            every load (synchronous, before paint). Some Windows Chrome
            installs were stripping the className during hydration and
            falling back to text-gray-900 on every dark: variant. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "document.documentElement.classList.add('dark');document.documentElement.style.colorScheme='dark';",
          }}
        />
      </head>
      <body
        className="bg-gray-900 text-gray-100"
        style={{ forcedColorAdjust: "none", color: "rgb(243 244 246)" }}
      >
        <TooltipProvider>
          <OrderSettingsProvider>
            <Toaster position="top-center" />
            <LayoutContent>{children}</LayoutContent>
            <UploadProgressToast />
          </OrderSettingsProvider>
        </TooltipProvider>
      </body>
    </html>
  );
}
