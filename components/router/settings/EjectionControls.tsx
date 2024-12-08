"use client";

import { useEffect, useState } from "react";
import GlobalSettings from "./GlobalSettings";
import PerClassSettings from "./PerClassSettings";
import { AdvancedSettings } from "./AdvancedSettings";
import PresetSettings from "./PresetSettings";
import { useWebSocketManager } from "@/hooks/useRouterWebsocket";
import { useEjectionConfig } from "@/hooks/useEjectionConfig";
import { AnimatedTabs } from "@/components/ui/animated-tabs";
import { Settings2, Sliders, Target, BookMarked } from "lucide-react";

export default function ImprovedEjectionControlGUI() {
  const { updateEjectionSettings, state } = useWebSocketManager();
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
        className="min-h-[600px] shadow-card"
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
