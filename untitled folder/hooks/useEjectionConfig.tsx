import { EjectionSettings, ValidationErrors } from "@/typings/types";
import { useState, useEffect, useCallback } from "react";

export const VALIDATION_RULES = {
  ejectionDuration: {
    min: 100,
    message: "Ejection duration must be at least 100ms",
  },
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
};

export const useEjectionConfig = (
  currentSettings: EjectionSettings,
  onUpdateSettings: (settings: EjectionSettings) => void
) => {
  const [config, setConfig] = useState<EjectionSettings>(currentSettings);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>(
    {}
  );
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setConfig(currentSettings);
    setHasChanges(false);
  }, [currentSettings]);

  const validateConfig = useCallback((): boolean => {
    const errors: ValidationErrors = {};

    // Global settings validation
    if (
      config.globalSettings?.ejectionDuration <
      VALIDATION_RULES.ejectionDuration.min
    ) {
      errors.ejectionDuration = VALIDATION_RULES.ejectionDuration.message;
    }

    if (config.globalSettings?.minTotalArea < 0) {
      errors.minTotalArea = "Minimum total area cannot be negative";
    }

    // Per-class settings validation
    Object.entries(config.perClassSettings).forEach(([className, settings]) => {
      if (
        settings.minConfidence < VALIDATION_RULES.confidence.min ||
        settings.minConfidence > VALIDATION_RULES.confidence.max
      ) {
        errors[`${className}.minConfidence`] =
          VALIDATION_RULES.confidence.message;
      }
      if (settings.minArea < VALIDATION_RULES.minArea.min) {
        errors[`${className}.minArea`] = VALIDATION_RULES.minArea.message;
      }
      if (settings.maxCount < VALIDATION_RULES.maxCount.min) {
        errors[`${className}.maxCount`] = VALIDATION_RULES.maxCount.message;
      }
    });

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [config]);

  const updateConfig = useCallback((path: string, value: any) => {
    console.log("updateConfig");
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

      setHasChanges(true);
      return newConfig;
    });
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
    setConfig(currentSettings);
    setHasChanges(false);
    setValidationErrors({});
  }, [currentSettings]);

  return {
    config,
    hasChanges,
    validationErrors,
    updateConfig,
    handleSave,
    handleReset,
    validateConfig,
  };
};
