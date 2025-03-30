import React, { createContext, useContext } from "react";
import { useWebSocketManager } from "@/hooks/useRouterWebsocket";

const RouterContext = createContext<ReturnType<
  typeof useWebSocketManager
> | null>(null);

export function RouterProvider({ children }: { children: React.ReactNode }) {
  const websocketManager = useWebSocketManager();

  return (
    <RouterContext.Provider value={websocketManager}>
      {children}
    </RouterContext.Provider>
  );
}

export function useRouter() {
  const context = useContext(RouterContext);
  if (!context) {
    throw new Error("useRouter must be used within a RouterProvider");
  }
  return context;
}
