import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { StatsSidebar } from "./components/StatsSidebar";

export default function StatsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen px-6 py-8 lg:px-10 lg:py-10 text-slate-100">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/orders"
          className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white transition mb-4"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to orders
        </Link>

        <h1 className="heading-page mb-6">Stats</h1>

        <div className="flex gap-8">
          <StatsSidebar />
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </div>
    </div>
  );
}
