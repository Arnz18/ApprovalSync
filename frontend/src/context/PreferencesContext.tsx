import React, { createContext, useContext, useEffect, useState } from 'react';

export type InterfaceDensity = 'comfortable' | 'compact';
export type ThemeMode = 'light' | 'dark';

export interface PreferencesContextValue {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  highContrast: boolean;
  setHighContrast: (enabled: boolean) => void;
  density: InterfaceDensity;
  setDensity: (density: InterfaceDensity) => void;
}

const STORAGE_KEY_THEME = 'niyamsetu_theme';
const STORAGE_KEY_CONTRAST = 'approvalsync_high_contrast';
const STORAGE_KEY_DENSITY = 'approvalsync_density';

export const PreferencesContext = createContext<PreferencesContextValue | undefined>(undefined);

export interface PreferencesProviderProps {
  children: React.ReactNode;
  initialTheme?: ThemeMode;
  initialHighContrast?: boolean;
  initialDensity?: InterfaceDensity;
}

export const PreferencesProvider: React.FC<PreferencesProviderProps> = ({
  children,
  initialTheme,
  initialHighContrast,
  initialDensity,
}) => {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    if (initialTheme) return initialTheme;
    try {
      const saved = localStorage.getItem(STORAGE_KEY_THEME);
      if (saved === 'dark' || saved === 'light') return saved;
      if (
        typeof window !== 'undefined' &&
        window.matchMedia &&
        window.matchMedia('(prefers-color-scheme: dark)').matches
      ) {
        return 'dark';
      }
    } catch {
      // ignore storage errors
    }
    return 'light';
  });

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

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem(STORAGE_KEY_THEME, newTheme);
    } catch {
      // ignore storage errors
    }
  };

  const toggleTheme = () => {
    const nextTheme: ThemeMode = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
  };

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

    root.setAttribute('data-theme', theme);
    root.setAttribute('data-contrast', highContrast ? 'high' : 'normal');
    root.setAttribute('data-density', density);

    root.classList.toggle('dark', theme === 'dark');
    root.classList.toggle('high-contrast', highContrast);
    root.classList.toggle('density-compact', density === 'compact');
    root.classList.toggle('density-comfortable', density === 'comfortable');
  }, [theme, highContrast, density]);

  return (
    <PreferencesContext.Provider
      value={{
        theme,
        setTheme,
        toggleTheme,
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
    return {
      theme: 'light',
      setTheme: () => {},
      toggleTheme: () => {},
      highContrast: false,
      setHighContrast: () => {},
      density: 'comfortable',
      setDensity: () => {},
    };
  }
  return context;
}
