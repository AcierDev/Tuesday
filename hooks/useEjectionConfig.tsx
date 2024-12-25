import { RouterSettings, ValidationErrors } from "@/typings/types";
import { DEFAULT_ROUTER_SETTINGS } from "@/typings/constants";
import { useState, useCallback, useRef } from "react";

export const VALIDATION_RULES = {
  slave: {
    pushDuration: {
      min: 100,
      message: "Push duration must be at least 100ms",
    },
    riserDuration: {
      min: 100,
      message: "Riser duration must be at least 100ms",
    },
    ejectionDuration: {
      min: 100,
      message: "Ejection duration must be at least 100ms",
    },
  },
  ejection: {
    minArea: {
      min: 0,
      message: "Minimum area cannot be negative",
    },
    confidence: {
      min: 0,
      max: 1,
      message: "Confidence must be between 0 and 1",
    },
    maxCount: {
      min: 1,
      message: "Maximum count must be at least 1",
    },
  },
};

export const useEjectionConfig = (
  onUpdateSettings: (settings: RouterSettings) => void
) => {
  // Use useRef to track initialization
  const isInitialized = useRef(false);

  const [config, setConfig] = useState<RouterSettings>(() => {
    // Only use DEFAULT_ROUTER_SETTINGS as initial state
    return DEFAULT_ROUTER_SETTINGS;
  });

  const [validationErrors, setValidationErrors] = useState<ValidationErrors>(
    {}
  );
  const [hasChanges, setHasChanges] = useState(false);

  // Remove the useEffect that was setting config to DEFAULT_ROUTER_SETTINGS
  // This was causing the config to reset when DEFAULT_ROUTER_SETTINGS changed

  const updateConfigFromServer = useCallback((newConfig: RouterSettings) => {
    // Only update if the new config is different from current
    setConfig((prevConfig) => {
      const configChanged =
        JSON.stringify(prevConfig) !== JSON.stringify(newConfig);
      if (configChanged) {
        // If this is the first initialization, don't mark as having changes
        if (!isInitialized.current) {
          isInitialized.current = true;
          setHasChanges(false);
        }
        return newConfig;
      }
      return prevConfig;
    });

    setValidationErrors({});
  }, []);

  const validateConfig = useCallback((): boolean => {
    const errors: ValidationErrors = {};

    // Validate slave settings
    Object.entries(VALIDATION_RULES.slave).forEach(([key, rule]) => {
      if (key === "analysisMode") return;

      if (config.slave[key as keyof SlaveSettings] < rule.min) {
        errors[key] = rule.message;
      }
    });

    // Validate ejection settings
    if (config.ejection.globalSettings?.minTotalArea < 0) {
      errors.minTotalArea = "Minimum total area cannot be negative";
    }

    // Per-class settings validation
    Object.entries(config.ejection.perClassSettings).forEach(
      ([className, settings]) => {
        if (
          settings.minConfidence < VALIDATION_RULES.ejection.confidence.min ||
          settings.minConfidence > VALIDATION_RULES.ejection.confidence.max
        ) {
          errors[`${className}.minConfidence`] =
            VALIDATION_RULES.ejection.confidence.message;
        }
        if (settings.minArea < VALIDATION_RULES.ejection.minArea.min) {
          errors[`${className}.minArea`] =
            VALIDATION_RULES.ejection.minArea.message;
        }
        if (settings.maxCount < VALIDATION_RULES.ejection.maxCount.min) {
          errors[`${className}.maxCount`] =
            VALIDATION_RULES.ejection.maxCount.message;
        }
      }
    );

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [config]);

  const updateConfig = useCallback((path: string, value: any) => {
    setConfig((prevConfig) => {
      const newConfig = { ...prevConfig };
      const keys = path.split(".");
      let current: any = newConfig;

      keys.forEach((key, index) => {
        if (index === keys.length - 1) {
          current[key] = value;
        } else {
          current[key] = { ...current[key] };
          current = current[key];
        }
      });

      return newConfig;
    });

    setHasChanges(true);
  }, []);

  const handleSave = useCallback(() => {
    if (validateConfig()) {
      onUpdateSettings(config);
      setHasChanges(false);
      return true;
    }
    return false;
  }, [config, validateConfig, onUpdateSettings]);

  const handleReset = useCallback(() => {
    // Reset to the most recent server config instead of DEFAULT_ROUTER_SETTINGS
    setConfig(DEFAULT_ROUTER_SETTINGS);
    setHasChanges(false);
    setValidationErrors({});
  }, []);

  return {
    config,
    hasChanges,
    validationErrors,
    updateConfigFromServer,
    updateConfig,
    handleSave,
    handleReset,
    validateConfig,
  };
};
