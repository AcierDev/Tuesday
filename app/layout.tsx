import type { Metadata } from "next";
import localFont from "next/font/local";

import "./globals.css";
import { RootShell } from "./root-shell";

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

export const metadata: Metadata = {
  title: "Tuesday",
  description: "Replacing Monday",
};

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
        <RootShell>{children}</RootShell>
      </body>
    </html>
  );
}
