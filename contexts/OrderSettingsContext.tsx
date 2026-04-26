"use client";

import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useState,
  useRef,
} from "react";
import {
  ColumnTitles,
  ColumnVisibility,
  ItemStatus,
  OrderSettings,
} from "@/typings/types";

type OrderSettingsAction =
  | { type: "SET_SETTINGS"; payload: OrderSettings }
  | { type: "UPDATE_SETTINGS"; payload: Partial<OrderSettings> }
  | {
      type: "UPDATE_COLUMN_VISIBILITY";
      payload: { group: string; field: string; isVisible: boolean };
    }
  | { type: "RESET_SETTINGS" };

const defaultColumnVisibility: ColumnVisibility = {};
Object.values(ItemStatus).forEach((group) => {
  defaultColumnVisibility[group] = {};
  Object.values(ColumnTitles).forEach((field) => {
    defaultColumnVisibility[group]![field] = true;
  });
});

const defaultSettings: OrderSettings = {
  automatronRules: [],
  isAutomatronActive: true,
  columnVisibility: defaultColumnVisibility,
  dueBadgeDays: 3,
  onDeckMinCount: 12,
  statusColors: {
    Done: "bg-green-100",
    Stuck: "bg-red-100",
    "Working On It": "bg-yellow-100",
    New: "bg-blue-100",
  },
  showSortingIcons: false,
  recentEditHours: undefined,
};

const SHARED_SETTINGS_PATCH_DEBOUNCE_MS = 300;
const SHARED_SETTINGS_POLL_MS = 3000;

function orderSettingsReducer(
  state: OrderSettings,
  action: OrderSettingsAction
): OrderSettings {
  switch (action.type) {
    case "SET_SETTINGS":
      return action.payload;
    case "UPDATE_SETTINGS":
      return { ...state, ...action.payload };
    case "UPDATE_COLUMN_VISIBILITY":
      const { group, field, isVisible } = action.payload;
      return {
        ...state,
        columnVisibility: {
          ...state.columnVisibility,
          [group]: {
            ...state.columnVisibility[group],
            [field]: isVisible,
          },
        },
      };
    case "RESET_SETTINGS":
      return defaultSettings;
    default:
      return state;
  }
}

const OrderSettingsContext = createContext<
  | {
      settings: OrderSettings;
      updateSettings: (newSettings: Partial<OrderSettings>) => void;
      updateColumnVisibility: (
        group: string,
        field: string,
        isVisible: boolean
      ) => void;
      resetSettings: () => void;
    }
  | undefined
>(undefined);

export function OrderSettingsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [settings, dispatch] = useReducer(
    orderSettingsReducer,
    defaultSettings
  );
  const [isInitialized, setIsInitialized] = useState(false);
  const serverSyncedRef = useRef(false);
  const lastPatchedSharedRef = useRef<{
    dueBadgeDays: number | null;
    onDeckMinCount: number | null;
  }>({ dueBadgeDays: null, onDeckMinCount: null });

  //╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
  //║ 📦 LOAD: localStorage first, then overlay server-synced fields       ║
  //╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝
  useEffect(() => {
    if (isInitialized) return;

    const savedSettings = localStorage.getItem("orderSettings");
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        dispatch({
          type: "SET_SETTINGS",
          payload: { ...defaultSettings, ...parsed },
        });
      } catch {
        dispatch({ type: "SET_SETTINGS", payload: defaultSettings });
      }
    } else {
      dispatch({ type: "SET_SETTINGS", payload: defaultSettings });
    }
    setIsInitialized(true);
  }, [isInitialized]);

  useEffect(() => {
    if (!isInitialized || serverSyncedRef.current) return;

    let cancelled = false;
    fetch("/api/settings")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        const overlay: Partial<OrderSettings> = {};
        if (typeof data.dueBadgeDays === "number") {
          lastPatchedSharedRef.current.dueBadgeDays = data.dueBadgeDays;
          overlay.dueBadgeDays = data.dueBadgeDays;
        }
        if (typeof data.onDeckMinCount === "number") {
          lastPatchedSharedRef.current.onDeckMinCount = data.onDeckMinCount;
          overlay.onDeckMinCount = data.onDeckMinCount;
        }
        if (Object.keys(overlay).length > 0) {
          dispatch({ type: "UPDATE_SETTINGS", payload: overlay });
        }
        serverSyncedRef.current = true;
      })
      .catch((err) => {
        console.error("Failed to load shared settings:", err);
        serverSyncedRef.current = true;
      });

    return () => {
      cancelled = true;
    };
  }, [isInitialized]);

  //╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
  //║ 💾 SAVE: localStorage cache + debounced server PATCH for shared      ║
  //╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem("orderSettings", JSON.stringify(settings));
    }
  }, [settings, isInitialized]);

  useEffect(() => {
    if (!isInitialized || !serverSyncedRef.current) return;

    const changed: Partial<Pick<OrderSettings, "dueBadgeDays" | "onDeckMinCount">> = {};
    if (settings.dueBadgeDays !== lastPatchedSharedRef.current.dueBadgeDays) {
      changed.dueBadgeDays = settings.dueBadgeDays;
    }
    if (settings.onDeckMinCount !== lastPatchedSharedRef.current.onDeckMinCount) {
      changed.onDeckMinCount = settings.onDeckMinCount;
    }
    if (Object.keys(changed).length === 0) return;

    const handle = setTimeout(() => {
      if (changed.dueBadgeDays !== undefined) {
        lastPatchedSharedRef.current.dueBadgeDays = changed.dueBadgeDays;
      }
      if (changed.onDeckMinCount !== undefined) {
        lastPatchedSharedRef.current.onDeckMinCount = changed.onDeckMinCount;
      }
      fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changed),
      }).catch((err) => {
        console.error("Failed to persist shared settings:", err);
      });
    }, SHARED_SETTINGS_PATCH_DEBOUNCE_MS);

    return () => clearTimeout(handle);
  }, [settings.dueBadgeDays, settings.onDeckMinCount, isInitialized]);

  //╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
  //║ 🔄 POLL: pick up shared-settings changes from other browsers          ║
  //╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝
  // Without this, two open browsers fight: one user changes onDeckMinCount,
  // but other browsers keep their stale value and their auto-promote hook
  // re-promotes the same items the first browser just demoted. Skip overlay
  // while a local edit is still pending the debounced PATCH so the user's
  // own slider drag doesn't get clobbered mid-gesture.
  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    if (!isInitialized) return;

    const handle = setInterval(async () => {
      if (!serverSyncedRef.current) return;

      try {
        const res = await fetch("/api/settings");
        if (!res.ok) return;
        const data = await res.json();

        const overlay: Partial<OrderSettings> = {};
        const current = settingsRef.current;
        const last = lastPatchedSharedRef.current;

        if (
          typeof data.dueBadgeDays === "number" &&
          data.dueBadgeDays !== last.dueBadgeDays &&
          current.dueBadgeDays === last.dueBadgeDays
        ) {
          last.dueBadgeDays = data.dueBadgeDays;
          overlay.dueBadgeDays = data.dueBadgeDays;
        }
        if (
          typeof data.onDeckMinCount === "number" &&
          data.onDeckMinCount !== last.onDeckMinCount &&
          current.onDeckMinCount === last.onDeckMinCount
        ) {
          last.onDeckMinCount = data.onDeckMinCount;
          overlay.onDeckMinCount = data.onDeckMinCount;
        }

        if (Object.keys(overlay).length > 0) {
          dispatch({ type: "UPDATE_SETTINGS", payload: overlay });
        }
      } catch {
        // ignore transient fetch errors
      }
    }, SHARED_SETTINGS_POLL_MS);

    return () => clearInterval(handle);
  }, [isInitialized]);

  const updateSettings = (newSettings: Partial<OrderSettings>) => {
    dispatch({ type: "UPDATE_SETTINGS", payload: newSettings });
  };

  const updateColumnVisibility = (
    group: string,
    field: string,
    isVisible: boolean
  ) => {
    dispatch({
      type: "UPDATE_COLUMN_VISIBILITY",
      payload: { group, field, isVisible },
    });
  };

  const resetSettings = () => {
    dispatch({ type: "RESET_SETTINGS" });
  };

  return (
    <OrderSettingsContext.Provider
      value={{
        settings,
        updateSettings,
        updateColumnVisibility,
        resetSettings,
      }}
    >
      {children}
    </OrderSettingsContext.Provider>
  );
}

export function useOrderSettings() {
  const context = useContext(OrderSettingsContext);
  if (context === undefined) {
    throw new Error(
      "useOrderSettings must be used within an OrderSettingsProvider"
    );
  }
  return context;
}
