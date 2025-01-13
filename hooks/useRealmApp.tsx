"use client";

import { createContext, useContext } from "react";

// This is now just a simple context provider for sharing the mode across components
interface AppContextType {
  mode: string;
}

const AppContext = createContext<AppContextType>({
  mode: process.env.NEXT_PUBLIC_MODE || "development",
});

export function useApp() {
  return useContext(AppContext);
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const value = {
    mode: process.env.NEXT_PUBLIC_MODE || "development",
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
