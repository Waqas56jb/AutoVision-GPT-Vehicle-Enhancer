import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getPref, setPref } from '../utils/prefs.js';

const THEMES = ['light', 'dark'];
const ThemeContext = createContext(null);

function applyTheme(theme) {
  const dark = theme === 'dark';
  const root = document.documentElement;
  root.classList.toggle('dark', dark);
  root.style.colorScheme = dark ? 'dark' : 'light';
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', dark ? '#0a1738' : '#f7faff');
}

function readTheme() {
  const saved = getPref('theme', 'light');
  return THEMES.includes(saved) ? saved : 'light';
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(readTheme);

  useEffect(() => {
    applyTheme(theme);
    setPref('theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setThemeState((t) => (t === 'dark' ? 'light' : 'dark'));
  }, []);

  const value = useMemo(
    () => ({ theme, setTheme: setThemeState, toggleTheme, isDark: theme === 'dark' }),
    [theme, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

export default useTheme;
