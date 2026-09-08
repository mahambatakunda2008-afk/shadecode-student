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
      primary: { main: isDark ? "#7C3AED" : "#5B21B6" },
      secondary: { main: isDark ? "#3FC8FF" : "#0891B2" },
      background: {
        default: isDark ? "#080A10" : "#F7F8FA",
        paper: isDark ? "#11141C" : "#FFFFFF",
      },
      text: {
        primary: isDark ? "#F7F8FC" : "#101828",
        secondary: isDark ? "#A7AAB5" : "#667085",
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
    shape: {
      borderRadius: 12,
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            boxShadow: "none",
          },
          contained: {
            boxShadow: "0 10px 28px rgba(124,58,237,0.16)",
            "&:hover": { boxShadow: "0 12px 32px rgba(124,58,237,0.20)" },
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
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
          },
        },
      },
    },
  });

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
};
