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

        if (storedToken) {
          setToken(storedToken);
          try {
            const profileRes = await userApi.getProfile();
            if (profileRes.success) {
              setUser(profileRes.data);
            }
          } catch {
            await AsyncStorage.removeItem('token');
            setToken(null);
          }
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
    await AsyncStorage.removeItem('isGuest');
    setToken(newToken);
    setUser(newUser);
    setIsGuest(false);
  };

  const logout = async () => {
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('isGuest');
    setToken(null);
    setUser(null);
    setIsGuest(false);
  };

  const enterGuestMode = async () => {
    await AsyncStorage.setItem('isGuest', 'true');
    await AsyncStorage.removeItem('token');
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
