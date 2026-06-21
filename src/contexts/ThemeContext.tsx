"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type ThemeMode = "light" | "dark";

export interface ThemeContextProps {
  theme: ThemeMode;
  darkMode: boolean;
  setTheme: (theme: ThemeMode) => void;
  toggleDarkMode: () => void;
}

const STORAGE_KEY = "theme";

export const ThemeContext = createContext<ThemeContextProps>({
  theme: "dark",
  darkMode: true,
  setTheme: () => {},
  toggleDarkMode: () => {},
});

function getInitialTheme(): ThemeMode {
  if (typeof window === "undefined") return "dark";

  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (saved === "light" || saved === "dark") return saved;

  const legacy = window.localStorage.getItem("darkMode");
  if (legacy === "true") return "dark";
  if (legacy === "false") return "light";

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyTheme(theme: ThemeMode) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
}

export const ThemeContextProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [theme, setThemeState] = useState<ThemeMode>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const initial = getInitialTheme();
    setThemeState(initial);
    applyTheme(initial);
    setMounted(true);
  }, []);

  const setTheme = useCallback((nextTheme: ThemeMode) => {
    setThemeState(nextTheme);
    window.localStorage.setItem(STORAGE_KEY, nextTheme);
    window.localStorage.setItem("darkMode", String(nextTheme === "dark"));
    applyTheme(nextTheme);
  }, []);

  const toggleDarkMode = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [setTheme, theme]);

  const value = useMemo(
    () => ({
      theme,
      darkMode: theme === "dark",
      setTheme,
      toggleDarkMode,
    }),
    [setTheme, theme, toggleDarkMode]
  );

  return (
    <ThemeContext.Provider value={value}>
      <div className={mounted ? "ssc-theme-ready" : "ssc-theme-ready"}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
};

export function useTheme() {
  return useContext(ThemeContext);
}
