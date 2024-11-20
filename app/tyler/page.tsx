"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Home,
  Droplet,
  SprayCanIcon as Spray,
  Play,
  Pause,
  Square,
  RotateCcw,
  Zap,
  BarChart,
  Info,
  Cpu,
  Thermometer,
  Clock,
} from "lucide-react";

export default function Dashboard() {
  const [speeds, setSpeeds] = useState({
    front: 50,
    right: 50,
    back: 50,
    left: 50,
  });
  const [isPainting, setIsPainting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const handleSpeedChange = (side: keyof typeof speeds, value: number[]) => {
    setSpeeds((prev) => ({ ...prev, [side]: value[0] }));
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-6">
      <header className="mb-6">
        <h1 className="text-3xl font-bold">Automatic Paint System Control</h1>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <motion.div
          className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            System Control
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <Button className="w-full">
              <Home className="mr-2" size={18} />
              Home System
            </Button>
            <Button className="w-full">
              <Spray className="mr-2" size={18} />
              Prime Gun
            </Button>
            <Button className="w-full">
              <Droplet className="mr-2" size={18} />
              Clean Gun
            </Button>
            <Button className="w-full">
              <Zap className="mr-2" size={18} />
              Quick Calibrate
            </Button>
          </div>
        </motion.div>

        <motion.div
          className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <BarChart className="mr-2" size={20} />
            Painting Operations
          </h3>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <Button
              onClick={() => setIsPainting(true)}
              disabled={isPainting}
              className="w-full bg-green-500 hover:bg-green-600 text-white"
            >
              <Play className="mr-2" size={18} />
              Start
            </Button>
            <Button
              onClick={() => setIsPaused(!isPaused)}
              disabled={!isPainting}
              className="w-full bg-yellow-500 hover:bg-yellow-600 text-white"
            >
              {isPaused ? <Play size={18} /> : <Pause size={18} />}
              {isPaused ? "Resume" : "Pause"}
            </Button>
            <Button
              onClick={() => {
                setIsPainting(false);
                setIsPaused(false);
              }}
              disabled={!isPainting}
              className="w-full bg-red-500 hover:bg-red-600 text-white"
            >
              <Square className="mr-2" size={18} />
              Stop
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Button variant="outline" className="w-full">
              Paint Front
            </Button>
            <Button variant="outline" className="w-full">
              Paint Right
            </Button>
            <Button variant="outline" className="w-full">
              Paint Back
            </Button>
            <Button variant="outline" className="w-full">
              Paint Left
            </Button>
          </div>
        </motion.div>

        <motion.div
          className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Info className="mr-2" size={20} />
            System Info
          </h3>
          <div className="grid grid-cols-1 gap-4">
            <div className="flex items-center justify-between">
              <span className="flex items-center">
                <Cpu className="mr-2" size={18} />
                System Status:
              </span>
              <span className="font-semibold text-green-500">Operational</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center">
                <Thermometer className="mr-2" size={18} />
                Temperature:
              </span>
              <span className="font-semibold">24°C</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center">
                <Clock className="mr-2" size={18} />
                Uptime:
              </span>
              <span className="font-semibold">3d 7h 22m</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center">
                <RotateCcw className="mr-2" size={18} />
                Last Maintenance:
              </span>
              <span className="font-semibold">2023-06-15</span>
            </div>
          </div>
        </motion.div>

        <motion.div
          className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md md:col-span-2 lg:col-span-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Zap className="mr-2" size={20} />
            Speed Control
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(speeds).map(([side, speed]) => (
              <div key={side} className="flex items-center gap-4">
                <span className="w-20">
                  {side.charAt(0).toUpperCase() + side.slice(1)}:
                </span>
                <Slider
                  value={[speed]}
                  onValueChange={(value) =>
                    handleSpeedChange(side as keyof typeof speeds, value)
                  }
                  max={100}
                  step={1}
                  className="flex-1"
                />
                <span className="w-12 text-right">{speed}%</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
