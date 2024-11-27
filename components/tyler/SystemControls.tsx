import React from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Home,
  Droplet,
  SprayCanIcon as Spray,
  Play,
  Pause,
  Square,
  Zap,
  BarChart,
  ChevronRight,
} from "lucide-react";

const SystemControls = ({
  status,
  wsConnected,
  showHomeButton,
  showStartButton,
  showPauseButton,
  showStopButton,
  showPrimeButton,
  showCleanButton,
  showCalibrateButton,
  showPaintSidesButtons,
  sendCommand,
  isPaused,
}) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
      <Tabs defaultValue="primary" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="primary" className="flex items-center gap-2">
            <Home className="w-4 h-4" />
            Primary Controls
          </TabsTrigger>
          <TabsTrigger value="operations" className="flex items-center gap-2">
            <BarChart className="w-4 h-4" />
            Operations
          </TabsTrigger>
        </TabsList>

        <TabsContent value="primary" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Button
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-md"
              onClick={() => sendCommand({ type: "HOME_SYSTEM" })}
              disabled={!showHomeButton || !wsConnected}
            >
              <Home className="mr-2" size={18} />
              Home System
            </Button>
            <Button
              className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white shadow-md"
              onClick={() => sendCommand({ type: "PRIME_GUN" })}
              disabled={!showPrimeButton || !wsConnected}
            >
              <Spray className="mr-2" size={18} />
              Prime Gun
            </Button>
            <Button
              className="w-full bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white shadow-md"
              onClick={() => sendCommand({ type: "CLEAN_GUN" })}
              disabled={!showCleanButton || !wsConnected}
            >
              <Droplet className="mr-2" size={18} />
              Clean Gun
            </Button>
            <Button
              className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-md"
              onClick={() => sendCommand({ type: "QUICK_CALIBRATE" })}
              disabled={!showCalibrateButton || !wsConnected}
            >
              <Zap className="mr-2" size={18} />
              Quick Calibrate
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="operations">
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <Button
                onClick={() => sendCommand({ type: "START_PAINTING" })}
                disabled={!showStartButton || !wsConnected}
                className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-md"
              >
                <Play className="mr-2" size={18} />
                Start
              </Button>
              <Button
                onClick={() => sendCommand({ type: "PAUSE_PAINTING" })}
                disabled={!showPauseButton || !wsConnected}
                className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white shadow-md"
              >
                {isPaused ? <Play size={18} /> : <Pause size={18} />}
                {isPaused ? "Resume" : "Pause"}
              </Button>
              <Button
                onClick={() => sendCommand({ type: "STOP_PAINTING" })}
                disabled={!showStopButton || !wsConnected}
                className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-md"
              >
                <Square className="mr-2" size={18} />
                Stop
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {["Front", "Right", "Back", "Left"].map((side) => (
                <Button
                  key={side}
                  variant="outline"
                  className="w-full border-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  onClick={() =>
                    sendCommand({ type: `PAINT_${side.toUpperCase()}` })
                  }
                  disabled={!showPaintSidesButtons || !wsConnected}
                >
                  <ChevronRight className="mr-2" size={18} />
                  Paint {side}
                </Button>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SystemControls;
