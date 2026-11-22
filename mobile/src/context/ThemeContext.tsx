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
    primaryLight: string;
    border: string;
    statusBar: string;
  };
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Default to 'light' to match the beautiful reference UI
  const [theme, setTheme] = useState<ThemeMode>('light');

  useEffect(() => {
    const loadTheme = async () => {
      const stored = await AsyncStorage.getItem('themeMode');
      if (stored === 'dark') {
        setTheme('dark');
      } else if (stored === 'light') {
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
        background: '#0B0F19', // Deep clean dark canvas
        card: '#161F30', // Elevated dark card with distinct tone
        text: '#F8FAFC', // Crisp white high-contrast text
        textMuted: '#94A3B8', // Clear readable muted text
        primary: '#3B82F6', // Vibrant readable blue accent
        primaryLight: '#1E3A8A', // Soft dark blue container
        border: '#24324D', // Distinct readable border
        statusBar: 'light',
      }
    : {
        background: '#EAF2FB', // Soft airy light blue tint matching reference UI
        card: '#FFFFFF', // Pure crisp white cards
        text: '#0F172A', // Deep dark slate
        textMuted: '#64748B', // Elegant slate muted
        primary: '#1363F5', // Vibrant royal blue from screenshots
        primaryLight: '#EFF6FF', // Soft ice-blue pill tint
        border: '#E2E8F0', // Crisp subtle border
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
