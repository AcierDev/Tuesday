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
import { ThemeProvider } from "../components/providers/ThemeProvider";
import { SettingsPanel } from "@/components/setttings/SettingsPanel";
import { UserProvider } from "@/contexts/UserContext";
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { settings, updateSettings } = useOrderSettings();

  const handleOpenSettings = () => setIsSettingsOpen(true);
  const handleCloseSettings = () => setIsSettingsOpen(false);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100 dark:bg-gray-900">
      <Navbar
        onOpenSettings={handleOpenSettings}
        sidebarOpen={sidebarOpen}
        onSidebarOpenChange={setSidebarOpen}
      />
      <div className="flex-1 overflow-auto">
        <div
          className={`${
            sidebarOpen ? "lg:ml-64" : "lg:ml-16"
          } mt-14 lg:mt-0 transition-[margin] duration-300`}
        >
          <main className="w-full px-4 sm:px-6 lg:px-8">{children}</main>
        </div>
      </div>
      {isSettingsOpen && (
        <SettingsPanel
          onClose={handleCloseSettings}
          settings={settings}
          updateSettings={updateSettings}
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
    <html className={`${geistSans.variable} ${geistMono.variable}`} lang="en">
      <body className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        <TooltipProvider>
          <ThemeProvider enableSystem attribute="class" defaultTheme="dark">
            <OrderSettingsProvider>
              <UserProvider>
                <Toaster position="top-center" />
                <LayoutContent>{children}</LayoutContent>
                <UploadProgressToast />
              </UserProvider>
            </OrderSettingsProvider>
          </ThemeProvider>
        </TooltipProvider>
      </body>
    </html>
  );
}
