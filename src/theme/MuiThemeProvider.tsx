"use client";

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
      h1: { fontFamily: "var(--font-display), Space Grotesk, sans-serif", fontWeight: 600, letterSpacing: "-0.035em" },
      h2: { fontFamily: "var(--font-display), Space Grotesk, sans-serif", fontWeight: 600, letterSpacing: "-0.025em" },
      h3: { fontFamily: "var(--font-display), Space Grotesk, sans-serif", fontWeight: 600, letterSpacing: "-0.012em" },
      button: { fontFamily: "var(--font-display), Space Grotesk, sans-serif", fontWeight: 600, textTransform: "none" },
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
