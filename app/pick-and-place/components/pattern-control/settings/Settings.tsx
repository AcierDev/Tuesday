import React from "react";
import Grid from "./Grid";
import StartCoordinates from "./StartCoordinates";
import EndCoordinates from "./EndCoordinates";
import PickupCoordinates from "./PickupCoordinates";
import SpeedAndAcceleration from "./SpeedAndAcceleration";

const Settings = () => {
  return (
    <div className="p-6 rounded-lg bg-white shadow-md dark:bg-gray-700/20">
      <h2 className="text-xl font-semibold mb-4 dark:text-white">Settings</h2>
      <div className="space-y-4">
        <Grid />
        <StartCoordinates />
        <EndCoordinates />
        <PickupCoordinates />
        <SpeedAndAcceleration />
      </div>
    </div>
  );
};

export default Settings;
