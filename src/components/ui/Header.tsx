"use client";

// src/components/ui/Header.tsx
import React, { useContext } from 'react';
import { ThemeContext } from '@/contexts/ThemeContext';
import { AppBar, Toolbar, Typography, Switch, Box } from '@mui/material';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import Brightness4Icon from '@mui/icons-material/Brightness4';

export function Header() {
  const { darkMode, toggleDarkMode } = useContext(ThemeContext);

  return (
    <AppBar position="static" color="default" sx={{ background: 'transparent', boxShadow: 'none' }}>
      <Toolbar sx={{ justifyContent: 'space-between' }}>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1, color: darkMode ? '#fff' : '#111' }}>
          Shadecode Student
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {darkMode ? <Brightness4Icon color="inherit" /> : <Brightness7Icon color="inherit" />}
          <Switch checked={darkMode} onChange={toggleDarkMode} color="default" />
        </Box>
      </Toolbar>
    </AppBar>
  );
}
export default Header;
