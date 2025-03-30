"use client";

import LiveWebcamFeed from "@/components/robotyler/LiveWebcamFeed";

export default function WebcamPage() {
  return (
    <div className="container mx-auto p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Live Webcam Feed</h1>
        <LiveWebcamFeed />
      </div>
    </div>
  );
}
