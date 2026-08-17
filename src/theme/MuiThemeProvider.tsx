"use client";

// src/theme/MuiThemeProvider.tsx
import React, { ReactNode, useContext } from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeContext } from "@/contexts/ThemeContext";

export const MuiThemeProvider = ({ children }: { children: ReactNode }) => {
  const { darkMode } = useContext(ThemeContext);
  const isDark = Boolean(darkMode);

  const theme = createTheme({
    palette: {
      mode: isDark ? "dark" : "light",
      primary: { main: isDark ? "#22D3EE" : "#0891B2" },
      secondary: { main: isDark ? "#67E8F9" : "#0E7490" },
      background: {
        default: isDark ? "#06111C" : "#F7FAFC",
        paper: isDark ? "#0B1724" : "#FFFFFF",
      },
      text: {
        primary: isDark ? "#F4FBFD" : "#0B1724",
        secondary: isDark ? "#9FB2BC" : "#5F6F7A",
      },
    },
    typography: {
      fontFamily: "var(--font-inter), Inter, system-ui, sans-serif",
      h1: { fontFamily: "var(--font-brand), Michroma, sans-serif" },
      h2: { fontFamily: "var(--font-brand), Michroma, sans-serif" },
      h3: { fontFamily: "var(--font-brand), Michroma, sans-serif" },
    },
    shape: {
      borderRadius: 12,
    },
  });

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
};
