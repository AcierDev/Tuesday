"use client";

import type { Metadata } from "next";
import localFont from "next/font/local";
import { useState } from "react";

import "./globals.css";
import { Navbar } from "@/components/ui/Navbar";
import { OrderSettingsProvider } from "@/contexts/OrderSettingsContext";
import { RealmAppProvider } from "@/hooks/useRealmApp";
import { ThemeProvider } from "../components/providers/ThemeProvider";
import { SettingsPanel } from "@/components/setttings/SettingsPanel";
import { UserProvider } from "@/contexts/UserContext";
import { InventoryProvider } from "@/contexts/InventoryContext";
import { DatabaseProvider } from "@/contexts/DatabaseContext";

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

// Root layout component
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Handlers for opening/closing settings panel
  const handleOpenSettings = () => setIsSettingsOpen(true);
  const handleCloseSettings = () => setIsSettingsOpen(false);

  return (
    <html className={`${geistSans.variable} ${geistMono.variable}`} lang="en">
      <body className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        <ThemeProvider enableSystem attribute="class" defaultTheme="system">
          <DatabaseProvider>
            <OrderSettingsProvider>
              <UserProvider>
                <InventoryProvider>
                  <div className="flex h-screen overflow-hidden bg-gray-100 dark:bg-gray-900">
                    <Navbar onOpenSettings={handleOpenSettings} />
                    <div className="flex-1 overflow-auto">
                      <main className="w-full px-4 sm:px-6 lg:px-8">
                        {children}
                      </main>
                    </div>
                    {isSettingsOpen && (
                      <SettingsPanel onClose={handleCloseSettings} />
                    )}
                  </div>
                </InventoryProvider>
              </UserProvider>
            </OrderSettingsProvider>
          </DatabaseProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
