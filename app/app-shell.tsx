"use client";

import { useState } from "react";

import { Navbar } from "@/components/ui/Navbar";
import {
  OrderSettingsProvider,
  useOrderSettings,
} from "@/contexts/OrderSettingsContext";
import { SettingsPanel } from "@/components/settings/SettingsPanel";
import { TooltipProvider } from "@/components/ui/tooltip";
import { UploadProgressToast } from "@/components/shipping/UploadProgress";
import { MorningBriefing } from "@/components/orders/MorningBriefing";
import { MobilePageSwitcher } from "@/components/ui/MobilePageSwitcher";
import { AskTuesday } from "@/components/ask-tuesday/AskTuesday";
import { TuesdayScanProvider } from "@/components/ask-tuesday/TuesdayScanProvider";
import { Toaster } from "@/components/ui/app-toast";

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
    <TuesdayScanProvider>
    <div className="flex h-screen overflow-hidden bg-gray-100 dark:bg-gray-900">
      <Navbar
        onOpenSettings={handleOpenSettings}
        sidebarOpen={sidebarOpen}
        onSidebarOpenChange={setSidebarOpen}
      />
      <div className="flex-1 overflow-auto no-scrollbar border-t border-sky-400/40">
        <div
          className={`${
            sidebarOpen ? "lg:ml-64" : "lg:ml-[4.25rem]"
          } transition-[margin] duration-300`}
        >
          <main className="w-full">{children}</main>
        </div>
      </div>
      <MobilePageSwitcher />
      <MorningBriefing />
      <AskTuesday />
      {isSettingsOpen && (
        <SettingsPanel
          onClose={handleCloseSettings}
          settings={settings}
          updateSettings={updateSettings}
          initialTab={settingsInitialTab}
        />
      )}
    </div>
    </TuesdayScanProvider>
  );
}

// The signed-in app: navigation, settings and the data stores they load.
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider>
      <OrderSettingsProvider>
        <LayoutContent>{children}</LayoutContent>
        <UploadProgressToast />
        <Toaster />
      </OrderSettingsProvider>
    </TooltipProvider>
  );
}
