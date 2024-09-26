// app/layout.tsx or app/layout.jsx

"use client";

import type { Metadata } from "next";
import localFont from "next/font/local";
import { useState } from "react";

import "./globals.css";
import { Navbar } from "@/components/ui/Navbar";
import { OrderSettingsProvider } from "@/contexts/OrderSettingsContext";
import { RealmAppProvider } from "@/hooks/useRealmApp";
import { ThemeProvider } from "../components/providers/ThemeProvider";
import { SettingsPanel } from "@/components/ui/SettingsPanel";

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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleOpenSettings = () => {
    setIsSettingsOpen(true);
  };

  const handleCloseSettings = () => {
    setIsSettingsOpen(false);
  };

  return (
    <html className={`${geistSans.variable} ${geistMono.variable}`} lang="en">
      <body>
        <ThemeProvider enableSystem attribute="class" defaultTheme="system">
          <RealmAppProvider>
            <OrderSettingsProvider>
              <div className="min-h-screen bg-gray-100">
                <Navbar onOpenSettings={handleOpenSettings} />
                <main className="w-full px-4 sm:px-6 lg:px-8 py-6">
                  {children}
                </main>
                {/* Settings Panel */}
                {isSettingsOpen && (
                  <SettingsPanel onClose={handleCloseSettings} />
                )}
              </div>
            </OrderSettingsProvider>
          </RealmAppProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
