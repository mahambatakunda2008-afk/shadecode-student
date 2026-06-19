"use client";

// src/contexts/ThemeContext.tsx
import React, { createContext, useEffect, useState } from 'react';
import Cookies from 'js-cookie';

export interface ThemeContextProps {
  darkMode: boolean;
  toggleDarkMode: () => void;
}

export const ThemeContext = createContext<ThemeContextProps>({
  darkMode: false,
  toggleDarkMode: () => {},
});

// Exported as ThemeContextProvider for consistency with imports
export const ThemeContextProvider = ({ children }: { children: React.ReactNode }) => {
  const [darkMode, setDarkMode] = useState<boolean>(false);

  // Initialize from cookie or system preference
  useEffect(() => {
    const cookie = Cookies.get('darkMode');
    if (cookie !== undefined) {
      setDarkMode(cookie === 'true');
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setDarkMode(prefersDark);
    }
  }, []);

  // Sync to localStorage and cookie
  useEffect(() => {
    localStorage.setItem('darkMode', String(darkMode));
    Cookies.set('darkMode', String(darkMode), { expires: 365 });

    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const toggleDarkMode = () => setDarkMode(prev => !prev);

  return (
    <ThemeContext.Provider value={{ darkMode, toggleDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
};
