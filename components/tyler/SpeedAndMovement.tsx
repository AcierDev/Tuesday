import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Zap, Settings, RotateCw, RotateCcwIcon, Save } from "lucide-react";

const CombinedControls = ({
  status,
  pendingSpeedChanges,
  handleSpeedChange,
  handleRotate,
  handleSaveChanges,
  wsConnected,
}) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
      <Tabs defaultValue="speed" className="space-y-4">
        <div className="flex justify-between items-center mb-4">
          <TabsList>
            <TabsTrigger value="speed" className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Speed Control
            </TabsTrigger>
            <TabsTrigger value="movement" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Movement
            </TabsTrigger>
          </TabsList>

          {Object.keys(pendingSpeedChanges).length > 0 && (
            <Button
              size="sm"
              onClick={handleSaveChanges}
              className="bg-cyan-500 hover:bg-cyan-600 text-white"
            >
              <Save className="h-4 w-4 mr-1" />
              Save Changes
            </Button>
          )}
        </div>

        <TabsContent value="speed" className="space-y-4">
          {Object.entries(status.speeds).map(([side, speed]) => (
            <div
              key={side}
              className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg"
            >
              <div className="flex items-center gap-4">
                <span className="w-20 font-medium text-gray-700 dark:text-gray-300">
                  {side.charAt(0).toUpperCase() + side.slice(1)}:
                </span>
                <Slider
                  value={[pendingSpeedChanges[side] ?? speed]}
                  onValueChange={(value) => handleSpeedChange(side, value)}
                  max={100}
                  step={1}
                  className="flex-1"
                  disabled={!wsConnected}
                />
                <span className="w-16 text-right font-semibold bg-white dark:bg-gray-800 px-3 py-1 rounded-md">
                  {pendingSpeedChanges[side] ?? speed}%
                </span>
              </div>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="movement" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Button
              className="w-full h-16 text-lg bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white shadow-md"
              onClick={() => handleRotate("left")}
              disabled={!wsConnected}
            >
              <RotateCcwIcon className="mr-2" size={20} />
              Turn Left 90°
            </Button>
            <Button
              className="w-full h-16 text-lg bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white shadow-md"
              onClick={() => handleRotate("right")}
              disabled={!wsConnected}
            >
              <RotateCw className="mr-2" size={20} />
              Turn Right 90°
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CombinedControls;
