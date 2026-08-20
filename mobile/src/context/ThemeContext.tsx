import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'dark' | 'light';

interface ThemeContextType {
  theme: ThemeMode;
  toggleTheme: () => void;
  colors: {
    background: string;
    card: string;
    text: string;
    textMuted: string;
    primary: string;
    border: string;
    statusBar: string;
  };
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<ThemeMode>('dark');

  useEffect(() => {
    const loadTheme = async () => {
      const stored = await AsyncStorage.getItem('themeMode');
      if (stored === 'light') {
        setTheme('light');
      }
    };
    loadTheme();
  }, []);

  const toggleTheme = async () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    await AsyncStorage.setItem('themeMode', next);
  };

  const colors = theme === 'dark' 
    ? {
        background: '#000000', // pure black
        card: '#121212', // dark gray card
        text: '#ffffff', // white text
        textMuted: '#a3a3a3', // neutral gray muted text
        primary: '#ffffff', // black & white style primary accent
        border: '#262626', // sharp dark border
        statusBar: 'light',
      }
    : {
        background: '#ffffff', // pure white background
        card: '#ffffff', // pure white card
        text: '#111111', // solid black text
        textMuted: '#6b7280', // neutral gray muted text
        primary: '#0066cc', // true royal blue primary accent
        border: '#e5e7eb', // soft gray border
        statusBar: 'dark',
      };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};
