import type { Metadata } from "next";
import localFont from "next/font/local";

import "./globals.css";
import { Navbar } from "@/components/ui/Navbar";
import { OrderSettingsProvider } from "@/contexts/OrderSettingsContext";
import { RealmAppProvider } from "@/hooks/useRealmApp";

import { ThemeProvider } from "../components/providers/ThemeProvider"

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

export const metadata: Metadata = {
  title: "Tuesday",
  description: "Replacing Monday",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html className={`${geistSans.variable} ${geistMono.variable}`} lang="en">
      <body>
        <ThemeProvider enableSystem attribute="class" defaultTheme="system">
          <RealmAppProvider>
            <OrderSettingsProvider>
              <div className="min-h-screen bg-gray-100">
                <Navbar />
                <main className="w-full px-4 sm:px-6 lg:px-8 py-6">
                  {children}
                </main>
              </div>
            </OrderSettingsProvider>
          </RealmAppProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}