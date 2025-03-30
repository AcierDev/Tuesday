"use client";

import React from "react";
import { WebSocketProvider } from "./contexts/WebSocketContext";
import PickAndPlaceContent from "./components/PickAndPlaceContent";

const PickAndPlace = () => {
  return (
    <WebSocketProvider>
      <PickAndPlaceContent />
    </WebSocketProvider>
  );
};

export default PickAndPlace;
