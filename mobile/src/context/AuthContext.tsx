import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile } from '../types';
import { userApi } from '../services/api';

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isGuest: boolean;
  isLoading: boolean;
  login: (token: string, user: UserProfile) => Promise<void>;
  logout: () => Promise<void>;
  enterGuestMode: () => Promise<void>;
  setUser: React.Dispatch<React.SetStateAction<UserProfile | null>>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isGuest, setIsGuest] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadStorageData = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('token');
        const storedGuest = await AsyncStorage.getItem('isGuest');
        const storedProfile = await AsyncStorage.getItem('user_profile');

        if (storedToken) {
          setToken(storedToken);
          if (storedProfile) {
            try {
              setUser(JSON.parse(storedProfile));
            } catch {}
          }
          // Set isLoading false immediately so app renders without waiting for network call
          setIsLoading(false);

          // Fetch fresh user profile in background
          userApi.getProfile().then(async (profileRes) => {
            if (profileRes.success && profileRes.data) {
              setUser(profileRes.data);
              await AsyncStorage.setItem('user_profile', JSON.stringify(profileRes.data));
            }
          }).catch(async (err: any) => {
            if (err?.message?.includes('401')) {
              await AsyncStorage.removeItem('token');
              await AsyncStorage.removeItem('user_profile');
              setToken(null);
              setUser(null);
            }
          });
          return;
        } else if (storedGuest === 'true') {
          setIsGuest(true);
        }
      } catch (err) {
        console.error('Failed to load auth state:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadStorageData();
  }, []);

  const login = async (newToken: string, newUser: UserProfile) => {
    await AsyncStorage.setItem('token', newToken);
    await AsyncStorage.setItem('user_profile', JSON.stringify(newUser));
    await AsyncStorage.removeItem('isGuest');
    setToken(newToken);
    setUser(newUser);
    setIsGuest(false);
  };

  const logout = async () => {
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('user_profile');
    await AsyncStorage.removeItem('isGuest');
    setToken(null);
    setUser(null);
    setIsGuest(false);
  };

  const enterGuestMode = async () => {
    await AsyncStorage.setItem('isGuest', 'true');
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('user_profile');
    setIsGuest(true);
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isGuest,
        isLoading,
        login,
        logout,
        enterGuestMode,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
