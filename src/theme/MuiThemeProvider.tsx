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
      primary: { main: isDark ? "#00A8FF" : "#245BFF" },
      secondary: { main: isDark ? "#245BFF" : "#0891B2" },
      background: {
        default: isDark ? "#080B12" : "#F7F8FA",
        paper: isDark ? "#10141C" : "#FFFFFF",
      },
      text: {
        primary: isDark ? "#F5F7FA" : "#101828",
        secondary: isDark ? "#AAB2BF" : "#667085",
      },
      divider: isDark ? "rgba(255,255,255,0.09)" : "rgba(16,24,40,0.10)",
    },
    typography: {
      fontFamily: "var(--font-inter), Inter, system-ui, sans-serif",
      h1: { fontFamily: "var(--font-display), Space Grotesk, sans-serif", fontWeight: 600, letterSpacing: "-0.035em" },
      h2: { fontFamily: "var(--font-display), Space Grotesk, sans-serif", fontWeight: 600, letterSpacing: "-0.025em" },
      h3: { fontFamily: "var(--font-display), Space Grotesk, sans-serif", fontWeight: 600, letterSpacing: "-0.012em" },
      button: { fontFamily: "var(--font-display), Space Grotesk, sans-serif", fontWeight: 600, textTransform: "none" },
    },
    shape: { borderRadius: 12 },
    components: {
      MuiButton: {
        styleOverrides: {
          root: { borderRadius: 10, boxShadow: "none" },
          contained: {
            boxShadow: isDark ? "0 10px 28px rgba(0,168,255,0.13)" : "0 10px 28px rgba(36,91,255,0.12)",
            "&:hover": { boxShadow: isDark ? "0 12px 32px rgba(0,168,255,0.18)" : "0 12px 32px rgba(36,91,255,0.16)" },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
            border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(16,24,40,0.10)",
          },
        },
      },
      MuiCard: { styleOverrides: { root: { backgroundImage: "none" } } },
    },
  });

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
};
