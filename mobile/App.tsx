// MUST be the very first import — polyfills crypto.getRandomValues for @noble/ciphers
import 'react-native-get-random-values';

import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as PaperProvider } from 'react-native-paper';
import { AuthProvider } from './src/context/AuthContext';
import { ThemeProvider } from './src/context/ThemeContext';
import { InterestsProvider } from './src/context/InterestsContext';
import { SearchProvider } from './src/context/SearchContext';
import { AppNavigator } from './src/navigation/AppNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <InterestsProvider>
            <SearchProvider>
              <PaperProvider>
                <AppNavigator />
              </PaperProvider>
            </SearchProvider>
          </InterestsProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
