"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

export const ThemeToggle = () => {
  const { darkMode, toggleDarkMode } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleDarkMode}
      className="ssc-icon-button"
      aria-label="Toggle theme"
      title="Toggle theme"
    >
      {darkMode ? <Moon size={18} /> : <Sun size={18} />}
    </button>
  );
};
