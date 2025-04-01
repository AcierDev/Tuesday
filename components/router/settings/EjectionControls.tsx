"use client";

import { useEffect, useState } from "react";
import GlobalSettings from "./GlobalSettings";
import PerClassSettings from "./PerClassSettings";
import { AdvancedSettings } from "./AdvancedSettings";
import PresetSettings from "./PresetSettings";
import ManualControls from "./ManualControls";
import { useRouter } from "@/contexts/RouterContext";
import { useEjectionConfig } from "@/hooks/useEjectionConfig";
import { AnimatedTabs } from "@/components/ui/animated-tabs";
import {
  Settings2,
  Sliders,
  Target,
  BookMarked,
  ChevronDown,
  ChevronUp,
  Hand,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

export default function ImprovedEjectionControlGUI() {
  const { updateEjectionSettings, state, sendManualCommand } = useRouter();
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
  const [isMobile, setIsMobile] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(
    "general"
  );

  // Check if mobile and update on resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (state.settings) {
      updateConfigFromServer(state.settings);
    }
  }, [state.settings, updateConfigFromServer]);

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  // Mobile-specific view with collapsible sections
  const renderMobileView = () => {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-lg font-semibold">Settings</h2>
          <div className="flex gap-2">
            {hasChanges && (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex gap-2"
              >
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleReset}
                  className="h-8 text-xs bg-transparent border-gray-700 hover:bg-gray-800"
                >
                  Reset
                </Button>
                <Button
                  size="sm"
                  variant="default"
                  onClick={handleSave}
                  className="h-8 text-xs bg-blue-600 hover:bg-blue-700"
                >
                  Save
                </Button>
              </motion.div>
            )}
          </div>
        </div>

        {/* General Settings Section */}
        <motion.div
          className="rounded-lg overflow-hidden border border-gray-800 bg-gray-900/50"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div
            className="flex items-center justify-between p-3 cursor-pointer"
            onClick={() => toggleSection("general")}
          >
            <div className="flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-blue-400" />
              <h3 className="font-medium">General Settings</h3>
            </div>
            <motion.div
              animate={{ rotate: expandedSection === "general" ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              {expandedSection === "general" ? (
                <ChevronUp className="h-5 w-5 text-gray-400" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-400" />
              )}
            </motion.div>
          </div>
          <AnimatePresence>
            {expandedSection === "general" && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div className="p-3 pt-0">
                  <GlobalSettings
                    config={config}
                    updateConfig={updateConfig}
                    validationErrors={validationErrors}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Manual Controls Section */}
        <motion.div
          className="rounded-lg overflow-hidden border border-gray-800 bg-gray-900/50"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <div
            className="flex items-center justify-between p-3 cursor-pointer"
            onClick={() => toggleSection("manual")}
          >
            <div className="flex items-center gap-2">
              <Hand className="h-4 w-4 text-blue-400" />
              <h3 className="font-medium">Manual Controls</h3>
            </div>
            <motion.div
              initial={{ rotate: 0 }}
              animate={{ rotate: expandedSection === "manual" ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              {expandedSection === "manual" ? (
                <ChevronUp className="h-5 w-5 text-gray-400" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-400" />
              )}
            </motion.div>
          </div>
          <AnimatePresence>
            {expandedSection === "manual" && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div className="p-3 pt-0">
                  <ManualControls
                    config={config}
                    slaveState={state}
                    sendManualCommand={sendManualCommand}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Per-Class Settings Section */}
        <motion.div
          className="rounded-lg overflow-hidden border border-gray-800 bg-gray-900/50"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div
            className="flex items-center justify-between p-3 cursor-pointer"
            onClick={() => toggleSection("perClass")}
          >
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-green-400" />
              <h3 className="font-medium">Per-Class Settings</h3>
            </div>
            <motion.div
              animate={{ rotate: expandedSection === "perClass" ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              {expandedSection === "perClass" ? (
                <ChevronUp className="h-5 w-5 text-gray-400" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-400" />
              )}
            </motion.div>
          </div>
          <AnimatePresence>
            {expandedSection === "perClass" && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div className="p-3 pt-0">
                  <PerClassSettings
                    config={config}
                    updateConfig={updateConfig}
                    validationErrors={validationErrors}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Advanced Settings Section */}
        <motion.div
          className="rounded-lg overflow-hidden border border-gray-800 bg-gray-900/50"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div
            className="flex items-center justify-between p-3 cursor-pointer"
            onClick={() => toggleSection("advanced")}
          >
            <div className="flex items-center gap-2">
              <Sliders className="h-4 w-4 text-purple-400" />
              <h3 className="font-medium">Advanced Settings</h3>
            </div>
            <motion.div
              animate={{ rotate: expandedSection === "advanced" ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              {expandedSection === "advanced" ? (
                <ChevronUp className="h-5 w-5 text-gray-400" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-400" />
              )}
            </motion.div>
          </div>
          <AnimatePresence>
            {expandedSection === "advanced" && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div className="p-3 pt-0">
                  <AdvancedSettings
                    config={config}
                    updateConfig={updateConfig}
                    imageSrc="/placeholder-roi.jpg"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Presets Section */}
        <motion.div
          className="rounded-lg overflow-hidden border border-gray-800 bg-gray-900/50"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div
            className="flex items-center justify-between p-3 cursor-pointer"
            onClick={() => toggleSection("presets")}
          >
            <div className="flex items-center gap-2">
              <BookMarked className="h-4 w-4 text-amber-400" />
              <h3 className="font-medium">Presets</h3>
            </div>
            <motion.div
              animate={{ rotate: expandedSection === "presets" ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              {expandedSection === "presets" ? (
                <ChevronUp className="h-5 w-5 text-gray-400" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-400" />
              )}
            </motion.div>
          </div>
          <AnimatePresence>
            {expandedSection === "presets" && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div className="p-3 pt-0">
                  <PresetSettings config={config} updateConfig={updateConfig} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    );
  };

  return (
    <div className="w-full">
      {isMobile ? (
        renderMobileView()
      ) : (
        <AnimatedTabs
          tabs={[
            {
              id: "general",
              label: "General",
              icon: Settings2,
            },
            {
              id: "manual",
              label: "Manual Controls",
              icon: Hand,
            },
            {
              id: "perClass",
              label: "Per-Class",
              icon: Target,
            },
            {
              id: "advanced",
              label: "Advanced",
              icon: Sliders,
            },
            {
              id: "presets",
              label: "Presets",
              icon: BookMarked,
            },
          ]}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
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
          <ManualControls
            config={config}
            slaveState={state}
            sendManualCommand={sendManualCommand}
          />
          <PerClassSettings
            config={config}
            updateConfig={updateConfig}
            validationErrors={validationErrors}
          />
          <AdvancedSettings
            config={config}
            updateConfig={updateConfig}
            imageSrc="/placeholder-roi.jpg"
          />
          <PresetSettings config={config} updateConfig={updateConfig} />
        </AnimatedTabs>
      )}
      {!isMobile && hasChanges && (
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={handleReset}>
            Reset
          </Button>
          <Button variant="default" onClick={handleSave}>
            Save Changes
          </Button>
        </div>
      )}
    </div>
  );
}
