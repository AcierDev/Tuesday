"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { PlusCircle } from "lucide-react";
import { RouterSettings } from "@/typings/types";
import { motion } from "framer-motion";

interface PresetSettingsProps {
  config: RouterSettings;
  updateConfig: (path: string, value: any) => void;
  onLoadPreset?: (preset: string) => void;
  onSavePreset?: (name: string) => void;
}

const presets = [
  {
    id: "highSensitivity",
    name: "High Sensitivity",
    description: "Detects smaller defects with higher confidence thresholds",
  },
  {
    id: "balancedDetection",
    name: "Balanced Detection",
    description: "Moderate thresholds suitable for most use cases",
  },
  {
    id: "lowSensitivity",
    name: "Low Sensitivity",
    description: "Only detects significant defects, reduces false positives",
  },
];

export default function PresetSettings({
  config,
  updateConfig,
  onLoadPreset = () => {},
  onSavePreset = () => {},
}: PresetSettingsProps) {
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);

  const handlePresetClick = (presetId: string) => {
    setSelectedPreset(presetId);
    onLoadPreset(presetId);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div>
        <Label className="mb-4 block text-lg">Ejection Presets</Label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {presets.map((preset) => (
            <motion.div
              key={preset.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Card
                className={`relative overflow-hidden group cursor-pointer hover:border-primary transition-colors dark:bg-gray-800 dark:border-gray-600 ${
                  selectedPreset === preset.id
                    ? "border-primary dark:border-primary"
                    : ""
                }`}
                onClick={() => handlePresetClick(preset.id)}
              >
                <div className="p-6">
                  <h3 className="font-semibold mb-2">{preset.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {preset.description}
                  </p>
                  <div
                    className={`absolute inset-0 bg-primary/5 transition-opacity ${
                      selectedPreset === preset.id
                        ? "opacity-100"
                        : "opacity-0 group-hover:opacity-100"
                    }`}
                  />
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          onClick={() => {
            const presetName = prompt("Enter a name for the new preset:");
            if (presetName) {
              onSavePreset(presetName);
            }
          }}
          variant="outline"
          className="w-full md:w-auto dark:bg-gray-700 dark:hover:bg-gray-600"
        >
          <PlusCircle className="mr-2 h-4 w-4" /> Save Current as Preset
        </Button>
      </div>
    </motion.div>
  );
}
