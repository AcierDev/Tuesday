"use client";

import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useState,
} from "react";
import {
  ColumnTitles,
  ColumnVisibility,
  ItemStatus,
  OrderSettings,
} from "@/typings/types";
import { removeDeprecatedDueBadgeDays } from "@/lib/order-settings";

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
  statusColors: {
    Done: "bg-green-100",
    Stuck: "bg-red-100",
    "Working On It": "bg-yellow-100",
    New: "bg-blue-100",
  },
  showSortingIcons: false,
  recentEditHours: undefined,
};

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

  //╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
  //║ 📦 LOAD: localStorage                                                ║
  //╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝
  useEffect(() => {
    if (isInitialized) return;

    const savedSettings = localStorage.getItem("orderSettings");
    if (savedSettings) {
      try {
        const parsed = removeDeprecatedDueBadgeDays(
          JSON.parse(savedSettings)
        );
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

  //╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
  //║ 💾 SAVE: localStorage                                                ║
  //╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem("orderSettings", JSON.stringify(settings));
    }
  }, [settings, isInitialized]);

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
