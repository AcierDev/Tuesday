"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Info, Save, Undo } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import GlobalSettings from "./GlobalSettings";
import PerClassSettings from "./PerClassSettings";
import { AdvancedSettings } from "./AdvancedSettings";
import PresetSettings from "./PresetSettings";
import { useWebSocketManager } from "@/hooks/useWebsocket";
import { useEjectionConfig } from "@/hooks/useEjectionConfig";

export default function ImprovedEjectionControlGUI() {
  const { status, updateEjectionSettings } = useWebSocketManager();
  const {
    config,
    hasChanges,
    validationErrors,
    updateConfig,
    handleReset,
    handleSave,
  } = useEjectionConfig(status.ejectionSettings, updateEjectionSettings);

  const [activeTab, setActiveTab] = useState("global");
  const [showUnsavedChanges, setShowUnsavedChanges] = useState(false);
  const [contentHeight, setContentHeight] = useState("auto");

  const handleExportConfig = () => {
    if (handleSave()) {
      setShowUnsavedChanges(false);
    }
  };

  // Helper to preserve height during tab transitions
  const measureHeight = (element) => {
    if (element) {
      const height = element.offsetHeight;
      setContentHeight(`${height}px`);
    }
  };

  return (
    <div className="container mx-auto bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg p-4">
      <Card className="dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center">
                Ejection Control Settings
              </CardTitle>
              <CardDescription className="pt-2">
                Adjust settings to optimize defect detection and ejection
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Dialog
                open={showUnsavedChanges}
                onOpenChange={setShowUnsavedChanges}
              >
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => hasChanges && setShowUnsavedChanges(true)}
                    className="flex items-center gap-2 dark:bg-gray-700"
                    disabled={!hasChanges}
                  >
                    <Undo className="h-4 w-4" />
                    Reset
                  </Button>
                </DialogTrigger>
                <DialogContent className="dark:bg-gray-800">
                  <DialogHeader>
                    <DialogTitle>Unsaved Changes</DialogTitle>
                    <DialogDescription>
                      Are you sure you want to reset all changes? This action
                      cannot be undone.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button
                      variant="ghost"
                      onClick={() => setShowUnsavedChanges(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => {
                        handleReset();
                        setShowUnsavedChanges(false);
                      }}
                    >
                      Reset Changes
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Button
                variant={hasChanges ? "default" : "outline"}
                size="sm"
                onClick={handleExportConfig}
                className={`flex items-center gap-2 ${
                  hasChanges
                    ? "bg-blue-500 hover:bg-blue-600 text-white"
                    : "dark:bg-gray-700"
                }`}
              >
                <Save className="h-4 w-4" />
                {hasChanges ? "Save Changes" : "Save"}
              </Button>
            </div>
          </div>
          {hasChanges && (
            <Alert className="mt-4 border-yellow-500 text-yellow-500 bg-yellow-500/10">
              <Info className="h-4 w-4" />
              <AlertTitle>You have unsaved changes</AlertTitle>
              <AlertDescription>
                Please save your changes or reset to the previous configuration.
              </AlertDescription>
            </Alert>
          )}
          {Object.keys(validationErrors).length > 0 && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Validation Errors</AlertTitle>
              <AlertDescription>
                <ul className="list-disc pl-4">
                  {Object.values(validationErrors).map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4 dark:bg-gray-700">
              <TabsTrigger
                value="global"
                className="dark:data-[state=active]:bg-gray-600"
              >
                Global Settings
              </TabsTrigger>
              <TabsTrigger
                value="perClass"
                className="dark:data-[state=active]:bg-gray-600"
              >
                Per-Class Settings
              </TabsTrigger>
              <TabsTrigger
                value="advanced"
                className="dark:data-[state=active]:bg-gray-600"
              >
                Advanced Settings
              </TabsTrigger>
              <TabsTrigger
                value="presets"
                className="dark:data-[state=active]:bg-gray-600"
              >
                Preset Settings
              </TabsTrigger>
            </TabsList>

            <div className="relative" style={{ height: contentHeight }}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{
                    duration: 0.2,
                    ease: "easeInOut",
                  }}
                  className="absolute w-full"
                  onLayoutAnimationComplete={() => setContentHeight("auto")}
                  ref={measureHeight}
                >
                  {activeTab === "global" && (
                    <GlobalSettings
                      config={config}
                      updateConfig={updateConfig}
                      validationErrors={validationErrors}
                    />
                  )}
                  {activeTab === "perClass" && (
                    <PerClassSettings
                      config={config}
                      updateConfig={updateConfig}
                      validationErrors={validationErrors}
                    />
                  )}
                  {activeTab === "advanced" && (
                    <AdvancedSettings
                      config={config}
                      updateConfig={updateConfig}
                    />
                  )}
                  {activeTab === "presets" && (
                    <PresetSettings
                      config={config}
                      updateConfig={updateConfig}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
