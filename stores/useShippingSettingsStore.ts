import { create } from "zustand";
import { type ShippingSettings } from "@/typings/types";

interface ShippingSettingsState {
  settings: ShippingSettings | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  fetchSettings: (force?: boolean) => Promise<ShippingSettings | null>;
  saveSettings: (settings: ShippingSettings) => Promise<ShippingSettings>;
}

export const useShippingSettingsStore = create<ShippingSettingsState>(
  (set, get) => ({
    settings: null,
    isLoading: false,
    isSaving: false,
    error: null,

    fetchSettings: async (force = false) => {
      if (!force && get().settings) {
        return get().settings;
      }

      set({ isLoading: true, error: null });

      try {
        const response = await fetch("/api/settings/shipping");
        if (!response.ok) {
          throw new Error("Failed to load shipping settings");
        }

        const settings = (await response.json()) as ShippingSettings;
        set({ settings, isLoading: false });
        return settings;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to load shipping settings";
        set({ error: message, isLoading: false });
        return null;
      }
    },

    saveSettings: async (settings) => {
      set({ isSaving: true, error: null });

      try {
        const response = await fetch("/api/settings/shipping", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(settings),
        });

        if (!response.ok) {
          throw new Error("Failed to save shipping settings");
        }

        const savedSettings = (await response.json()) as ShippingSettings;
        set({ settings: savedSettings, isSaving: false });
        return savedSettings;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to save shipping settings";
        set({ error: message, isSaving: false });
        throw error;
      }
    },
  })
);

if (typeof window !== "undefined") {
  useShippingSettingsStore
    .getState()
    .fetchSettings()
    .catch((error) => {
      console.error("Failed to initialize shipping settings store", error);
    });
}
