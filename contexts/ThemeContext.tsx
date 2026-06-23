import React, { createContext, useContext, useState, useEffect } from 'react';
import { LightColors, DarkColors, ColorScheme } from '@/lib/constants';

const THEME_KEY = 'app_theme_preference';

function loadTheme(): boolean {
  try {
    return localStorage.getItem(THEME_KEY) === 'dark';
  } catch {
    return false;
  }
}

function saveTheme(isDark: boolean) {
  try {
    localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
  } catch {}
}

interface ThemeContextType {
  colors: ColorScheme;
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  colors: LightColors,
  isDark: false,
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(loadTheme());
  }, []);

  function toggleTheme() {
    setIsDark((prev) => {
      const next = !prev;
      saveTheme(next);
      return next;
    });
  }

  const colors = isDark ? DarkColors : LightColors;

  return (
    <ThemeContext.Provider value={{ colors, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
