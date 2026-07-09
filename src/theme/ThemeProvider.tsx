import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useColorScheme } from 'react-native';

import { darkPalette, lightPalette, type Palette } from './palettes';

export type ThemeMode = 'dark' | 'light';
export type ThemePreference = 'system' | ThemeMode;

const STORAGE_KEY = 'prc.themePreference';

function isThemePreference(value: string | null): value is ThemePreference {
  return value === 'system' || value === 'dark' || value === 'light';
}

export type ThemeContextValue = {
  /** The active palette — resolved from preference (+ system scheme). */
  colors: Palette;
  mode: ThemeMode;
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  // Brand-first: the club look is dark, so that's the default preference.
  const [preference, setPreferenceState] = useState<ThemePreference>('dark');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (isThemePreference(stored)) setPreferenceState(stored);
      })
      .catch(() => {
        // Storage unavailable — stick with the default.
      });
  }, []);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {
      // Persisting is best-effort; the in-memory preference still applies.
    });
  }, []);

  const mode: ThemeMode =
    preference === 'system' ? (systemScheme === 'light' ? 'light' : 'dark') : preference;

  const value = useMemo<ThemeContextValue>(
    () => ({
      colors: mode === 'dark' ? darkPalette : lightPalette,
      mode,
      preference,
      setPreference,
    }),
    [mode, preference, setPreference]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
