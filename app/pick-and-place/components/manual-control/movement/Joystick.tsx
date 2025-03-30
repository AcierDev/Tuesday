import React, { useEffect, useRef, useState } from "react";
import { useWebSocket } from "../../../contexts/WebSocketContext";

interface Position {
  x: number;
  y: number;
}

interface JoystickProps {
  size?: number;
}

const Joystick = ({ size = 100 }: JoystickProps) => {
  const { sendCommand } = useWebSocket();
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 });
  const lastCommandRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    setDragging(true);
    updatePosition(e);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!dragging) return;
    updatePosition(e);
  };

  const handleMouseUp = () => {
    setDragging(false);
    setPosition({ x: 0, y: 0 });
    // Stop both axes when released
    sendCommand("stopX");
    sendCommand("stopY");
    lastCommandRef.current = { x: 0, y: 0 };
  };

  const updatePosition = (e: MouseEvent | React.MouseEvent) => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    let x = (e.clientX - centerX) / (size / 2);
    let y = (e.clientY - centerY) / (size / 2);

    // Clamp values to -1 to 1
    const magnitude = Math.sqrt(x * x + y * y);
    if (magnitude > 1) {
      x /= magnitude;
      y /= magnitude;
    }

    setPosition({ x, y });
    updateMovement(x, -y); // Invert Y for intuitive control
  };

  const updateMovement = (x: number, y: number) => {
    const deadzone = 0.2;

    // Handle X axis
    const newXDir = Math.abs(x) < deadzone ? 0 : Math.sign(x);
    if (newXDir !== lastCommandRef.current.x) {
      if (newXDir === 0) {
        sendCommand("stopX");
      } else {
        sendCommand(`startX ${newXDir}`);
      }
      lastCommandRef.current.x = newXDir;
    }

    // Handle Y axis
    const newYDir = Math.abs(y) < deadzone ? 0 : Math.sign(y);
    if (newYDir !== lastCommandRef.current.y) {
      if (newYDir === 0) {
        sendCommand("stopY");
      } else {
        sendCommand(`startY ${newYDir}`);
      }
      lastCommandRef.current.y = newYDir;
    }
  };

  useEffect(() => {
    if (dragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragging]);

  const knobSize = size * 0.4;
  const knobPosition = {
    left: `${50 + position.x * (50 - (knobSize / size) * 50)}%`,
    top: `${50 + position.y * (50 - (knobSize / size) * 50)}%`,
  };

  return (
    <div className="relative">
      {/* Y Label */}
      <div className="absolute left-1/2 -top-8 -translate-x-1/2 text-lg font-medium text-gray-700 dark:text-gray-200">
        Y
      </div>

      {/* X Label */}
      <div className="absolute -right-6 top-1/2 -translate-y-1/2 text-lg font-medium text-gray-700 dark:text-gray-200">
        X
      </div>

      {/* Joystick */}
      <div
        ref={containerRef}
        className="relative rounded-full bg-gray-200 dark:bg-gray-700 cursor-pointer"
        style={{ width: size, height: size }}
        onMouseDown={handleMouseDown}
      >
        <div
          className="absolute bg-red-500 rounded-full transition-transform duration-75"
          style={{
            width: knobSize,
            height: knobSize,
            left: knobPosition.left,
            top: knobPosition.top,
            transform: "translate(-50%, -50%)",
          }}
        />
      </div>
    </div>
  );
};

export default Joystick;
