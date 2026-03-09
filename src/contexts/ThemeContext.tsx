import React, { createContext, useContext, useState, useEffect } from 'react';
import { ThemeConfig } from '../types';

interface ThemeContextType {
  theme: ThemeConfig | null;
  mode: 'light' | 'dark';
  setMode: (mode: 'light' | 'dark') => void;
  refreshTheme: () => Promise<void>;
  isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<ThemeConfig | null>(null);
  const [mode, setModeState] = useState<'light' | 'dark'>('light');
  const [isLoading, setIsLoading] = useState(true);

  const refreshTheme = async () => {
    try {
      const response = await fetch('/api/theme/resolved', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'x-app-session': localStorage.getItem('app_session') || ''
        }
      });
      if (response.ok) {
        const resolvedTheme: ThemeConfig = await response.json();
        setTheme(resolvedTheme);
        
        // Initial mode setup
        const savedMode = localStorage.getItem('user-theme-mode') as 'light' | 'dark' | null;
        if (resolvedTheme.allowUserModeToggle && savedMode) {
          setModeState(savedMode);
        } else {
          // Fallback to defaultMode or system
          if (resolvedTheme.defaultMode === 'system') {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            setModeState(prefersDark ? 'dark' : 'light');
          } else {
            setModeState(resolvedTheme.defaultMode as 'light' | 'dark');
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch theme:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshTheme();
  }, []);

  useEffect(() => {
    if (!theme) return;

    const root = window.document.documentElement;
    
    // Apply colors
    root.style.setProperty('--primary-color', theme.primaryColor);
    if (theme.secondaryColor) root.style.setProperty('--secondary-color', theme.secondaryColor);
    if (theme.accentColor) root.style.setProperty('--accent-color', theme.accentColor);
    if (theme.fontFamily) root.style.setProperty('--font-family', theme.fontFamily);

    // Apply layout colors
    if (theme.layoutColors) {
      if (theme.layoutColors.header) root.style.setProperty('--header-color', theme.layoutColors.header);
      if (theme.layoutColors.leftPanel) root.style.setProperty('--panel-color', theme.layoutColors.leftPanel);
      if (theme.layoutColors.mainPage) root.style.setProperty('--main-color', theme.layoutColors.mainPage);
      if (theme.layoutColors.font) root.style.setProperty('--font-color', theme.layoutColors.font);
    }

    // Apply graph colors
    if (theme.graphColors) {
      theme.graphColors.forEach((color, index) => {
        root.style.setProperty(`--graph-color-${index + 1}`, color);
      });
    }

    // Apply mode class
    if (mode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme, mode]);

  const setMode = (newMode: 'light' | 'dark') => {
    if (theme?.allowUserModeToggle) {
      setModeState(newMode);
      localStorage.setItem('user-theme-mode', newMode);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, mode, setMode, refreshTheme, isLoading }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
