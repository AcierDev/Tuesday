"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DeliveryBriefing } from "@/app/stats/components/DeliveryBriefing";
import type { DeliveryBriefing as BriefingReport } from "@/lib/delivery-briefing";
import { deliverMorningBriefing, isMorningBriefingPage, MORNING_BRIEFING_CONFIG } from "@/lib/morning-briefing";
import { isAnyModalDialogOpen } from "@/utils/dnd-modal-guard";

export function MorningBriefing() {
  const pathname = usePathname();
  const [report, setReport] = useState<BriefingReport | null>(null);
  const eligible = isMorningBriefingPage(pathname ?? "");

  useEffect(() => {
    setReport(null);
    if (!eligible) return;
    const lifetime = new AbortController();
    let busy = false;
    const available = () => !lifetime.signal.aborted && document.visibilityState === "visible"
      && document.hasFocus() && !isAnyModalDialogOpen();
    const check = async () => {
      if (busy || !available()) return;
      busy = true;
      const deliver = async () => {
        await deliverMorningBriefing({
          now: () => new Date(),
          available,
          readReceivedDay: () => localStorage.getItem(MORNING_BRIEFING_CONFIG.storageKey),
          writeReceivedDay: (day) => localStorage.setItem(MORNING_BRIEFING_CONFIG.storageKey, day),
          load: async () => {
            const request = new AbortController();
            const cancel = () => request.abort();
            lifetime.signal.addEventListener("abort", cancel);
            const timeout = setTimeout(cancel, MORNING_BRIEFING_CONFIG.requestTimeoutMs);
            try {
              const response = await fetch(MORNING_BRIEFING_CONFIG.endpoint, { cache: "no-store", signal: request.signal });
              if (!response.ok) throw new Error("Morning briefing unavailable");
              return await response.json();
            } finally {
              clearTimeout(timeout);
              lifetime.signal.removeEventListener("abort", cancel);
            }
          },
          show: setReport,
        });
      };
      try {
        if (navigator.locks) {
          await navigator.locks.request(MORNING_BRIEFING_CONFIG.lockName, { ifAvailable: true }, async (lock) => {
            if (lock) await deliver();
          });
        } else {
          await deliver();
        }
      } catch {
        // Quietly retry on focus or the next check; never consume today's popup on failure.
      } finally {
        busy = false;
      }
    };
    void check();
    const interval = setInterval(() => void check(), MORNING_BRIEFING_CONFIG.checkIntervalMs);
    window.addEventListener("focus", check);
    document.addEventListener("visibilitychange", check);
    return () => {
      lifetime.abort();
      clearInterval(interval);
      window.removeEventListener("focus", check);
      document.removeEventListener("visibilitychange", check);
    };
  }, [eligible, pathname]);

  return (
    <Dialog open={eligible && report !== null} onOpenChange={(open) => !open && setReport(null)}>
      <DialogContent className="max-h-[85vh] overflow-y-auto rounded-2xl border-slate-700 bg-slate-950 p-5 sm:max-w-3xl sm:p-7">
        <div className="pr-6">
          <DialogTitle className="text-xl font-semibold text-white">Your morning briefing</DialogTitle>
          <DialogDescription className="mt-1 text-slate-400">Today's delivery outlook and priorities.</DialogDescription>
        </div>
        {report && <DeliveryBriefing snapshot={report} />}
        <div className="flex justify-end">
          <Button onClick={() => setReport(null)}>Got it</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
