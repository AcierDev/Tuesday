import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";

interface WebSocketContextType {
  sendCommand: (command: string) => void;
  connected: boolean;
  suctionState: boolean;
  extensionState: boolean;
  lastReceivedCommand: string;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

// For development, replace with your ESP32's IP address
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://192.168.1.1/ws";

export const WebSocketProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [suctionState, setSuctionState] = useState(false);
  const [extensionState, setExtensionState] = useState(false);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const [lastReceivedCommand, setLastReceivedCommand] = useState<string>("");

  const connect = useCallback(() => {
    try {
      if (socket?.readyState === WebSocket.OPEN) {
        return; // Don't create a new connection if one exists
      }

      console.log(`Attempting to connect to ${WS_URL}`);
      const ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        console.log("Connected to WebSocket");
        setConnected(true);
        setReconnectAttempt(0);
      };

      ws.onclose = () => {
        console.log("WebSocket connection closed");
        setConnected(false);
        setSocket(null);

        // Implement exponential backoff for reconnection
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempt), 10000);
        console.log(`Reconnecting in ${delay}ms...`);
        setTimeout(() => {
          setReconnectAttempt((prev) => prev + 1);
          connect(); // Attempt to reconnect
        }, delay);
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
      };

      ws.onmessage = (event) => {
        console.log("Received:", event.data);
        if (event.data === "Suction ON") {
          setSuctionState(true);
        } else if (event.data === "Suction OFF") {
          setSuctionState(false);
        } else if (event.data === "Extension ON") {
          setExtensionState(true);
        } else if (event.data === "Extension OFF") {
          setExtensionState(false);
        }

        // Handle acknowledgments
        if (event.data.startsWith("ack:")) {
          setLastReceivedCommand(event.data.substring(4));
          return;
        }
      };

      setSocket(ws);
    } catch (error) {
      console.error("Failed to create WebSocket connection:", error);
      setConnected(false);
    }
  }, [reconnectAttempt]); // Only depend on reconnectAttempt

  useEffect(() => {
    connect();

    return () => {
      if (socket?.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, [connect]); // Only depend on the connect function

  const sendCommand = useCallback(
    (command: string) => {
      if (socket?.readyState === WebSocket.OPEN) {
        console.log("Sending command:", command);
        socket.send(command);
      } else {
        console.warn("WebSocket is not connected. Command not sent:", command);
      }
    },
    [socket]
  );

  return (
    <WebSocketContext.Provider
      value={{
        sendCommand,
        connected,
        suctionState,
        extensionState,
        lastReceivedCommand,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error("useWebSocket must be used within a WebSocketProvider");
  }
  return context;
};
