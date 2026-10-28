import React, { createContext, useContext, useEffect, useState } from 'react';

export type InterfaceDensity = 'comfortable' | 'compact';

export interface PreferencesContextValue {
  highContrast: boolean;
  setHighContrast: (enabled: boolean) => void;
  density: InterfaceDensity;
  setDensity: (density: InterfaceDensity) => void;
}

const STORAGE_KEY_CONTRAST = 'approvalsync_high_contrast';
const STORAGE_KEY_DENSITY = 'approvalsync_density';

export const PreferencesContext = createContext<PreferencesContextValue | undefined>(undefined);

export interface PreferencesProviderProps {
  children: React.ReactNode;
  initialHighContrast?: boolean;
  initialDensity?: InterfaceDensity;
}

export const PreferencesProvider: React.FC<PreferencesProviderProps> = ({
  children,
  initialHighContrast,
  initialDensity,
}) => {
  const [highContrast, setHighContrastState] = useState<boolean>(() => {
    if (typeof initialHighContrast === 'boolean') return initialHighContrast;
    try {
      return localStorage.getItem(STORAGE_KEY_CONTRAST) === 'true';
    } catch {
      return false;
    }
  });

  const [density, setDensityState] = useState<InterfaceDensity>(() => {
    if (initialDensity) return initialDensity;
    try {
      const saved = localStorage.getItem(STORAGE_KEY_DENSITY);
      return saved === 'compact' ? 'compact' : 'comfortable';
    } catch {
      return 'comfortable';
    }
  });

  const setHighContrast = (enabled: boolean) => {
    setHighContrastState(enabled);
    try {
      localStorage.setItem(STORAGE_KEY_CONTRAST, String(enabled));
    } catch {
      // ignore storage errors
    }
  };

  const setDensity = (newDensity: InterfaceDensity) => {
    setDensityState(newDensity);
    try {
      localStorage.setItem(STORAGE_KEY_DENSITY, newDensity);
    } catch {
      // ignore storage errors
    }
  };

  // Sync with document element attributes for instant CSS token response
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;

    root.setAttribute('data-contrast', highContrast ? 'high' : 'normal');
    root.setAttribute('data-density', density);

    root.classList.toggle('high-contrast', highContrast);
    root.classList.toggle('density-compact', density === 'compact');
    root.classList.toggle('density-comfortable', density === 'comfortable');
  }, [highContrast, density]);

  return (
    <PreferencesContext.Provider
      value={{
        highContrast,
        setHighContrast,
        density,
        setDensity,
      }}
    >
      {children}
    </PreferencesContext.Provider>
  );
};

export function usePreferences(): PreferencesContextValue {
  const context = useContext(PreferencesContext);
  if (!context) {
    // Provide safe fallback if accessed outside of provider
    return {
      highContrast: false,
      setHighContrast: () => {},
      density: 'comfortable',
      setDensity: () => {},
    };
  }
  return context;
}
