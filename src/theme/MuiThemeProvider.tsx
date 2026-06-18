// src/theme/MuiThemeProvider.tsx
import React, { ReactNode, useContext } from 'react';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material/styles';
import { ThemeContext } from '@/contexts/ThemeContext';

export const MuiThemeProvider = ({ children }: { children: ReactNode }) => {
  const { darkMode } = useContext(ThemeContext);
  const theme = createTheme({
    palette: {
      mode: darkMode ? 'dark' : 'light',
      primary: { main: '#6366f1' },
      secondary: { main: '#f59e0b' },
    },
    // You can extend the theme here with custom colors if desired
  });

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
};
