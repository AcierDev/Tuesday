"use client";

import { useEffect, useState } from "react";
import GlobalSettings from "./GlobalSettings";
import PerClassSettings from "./PerClassSettings";
import { AdvancedSettings } from "./AdvancedSettings";
import PresetSettings from "./PresetSettings";
import { useRouter } from "@/contexts/RouterContext";
import { useEjectionConfig } from "@/hooks/useEjectionConfig";
import { AnimatedTabs } from "@/components/ui/animated-tabs";
import { Settings2, Sliders, Target, BookMarked } from "lucide-react";

export default function ImprovedEjectionControlGUI() {
  const { updateEjectionSettings, state } = useRouter();
  const {
    config,
    hasChanges,
    validationErrors,
    updateConfig,
    handleReset,
    handleSave,
    updateConfigFromServer,
  } = useEjectionConfig(updateEjectionSettings);

  const [activeTab, setActiveTab] = useState("general");

  useEffect(() => {
    if (state.settings) {
      updateConfigFromServer(state.settings);
    }
  }, [state.settings, updateConfigFromServer]);

  const tabs = [
    {
      id: "general",
      label: "General Settings",
      icon: Settings2,
      description: "Configure system-wide ejection parameters",
    },
    {
      id: "perClass",
      label: "Per-Class Settings",
      icon: Sliders,
      description: "Adjust settings for individual defect classes",
    },
    {
      id: "advanced",
      label: "Advanced Settings",
      icon: Target,
      description: "Fine-tune detection regions and advanced parameters",
    },
    {
      id: "presets",
      label: "Preset Settings",
      icon: BookMarked,
      description: "Load and save configuration presets",
    },
  ];

  return (
    <div className="container mx-auto p-4">
      <AnimatedTabs
        id="ejection-controls"
        tabs={tabs}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        variant="card"
        className="min-h-[600px] shadow-card bg-gradient-to-br from-blue-500/5 to-purple-500/5 dark:from-blue-900/10 dark:to-purple-900/10 p-0.5"
        tabClassName="px-6 py-4 text-base font-semibold hover:bg-gray-100 dark:hover:bg-gray-700/50 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500/10 data-[state=active]:to-purple-500/10 dark:data-[state=active]:from-blue-900/20 dark:data-[state=active]:to-purple-900/20 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 rounded-t-lg transition-all duration-200"
        contentClassName="p-6 bg-white dark:bg-transparent rounded-b-lg"
        tabListClassName="bg-gray-50 dark:bg-transparent p-2 rounded-t-lg gap-2"
        hasChanges={hasChanges}
        onReset={handleReset}
        onSave={handleSave}
        validationErrors={validationErrors}
      >
        <GlobalSettings
          config={config}
          updateConfig={updateConfig}
          validationErrors={validationErrors}
        />
        <PerClassSettings
          config={config}
          updateConfig={updateConfig}
          validationErrors={validationErrors}
        />
        <AdvancedSettings
          config={config}
          updateConfig={updateConfig}
          imageSrc="./images/pfp/akiva.png"
        />
        <PresetSettings config={config} updateConfig={updateConfig} />
      </AnimatedTabs>
    </div>
  );
}
