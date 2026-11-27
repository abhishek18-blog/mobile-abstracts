import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';

interface InterestsContextType {
  interests: string[];
  hasSelected: boolean;
  loading: boolean;
  saveInterests: (newInterests: string[]) => Promise<boolean>;
  clearInterests: () => Promise<void>;
  skipOnboarding: () => Promise<void>;
}

const InterestsContext = createContext<InterestsContextType | undefined>(undefined);

// Helper to sync interests to the backend user profile
async function syncInterestsToServer(interests: string[], hasSelected: boolean) {
  try {
    const token = await AsyncStorage.getItem('token');
    if (!token) return null; // Guest mode — skip server sync

    const { userApi } = await import('../services/api');
    const res = await userApi.updateProfile({
      interests,
      hasSelectedInterests: hasSelected,
    });
    if (!res.success) {
      console.warn('Failed to sync interests to server:', res.error);
    }
    return res;
  } catch (err) {
    console.warn('Failed to sync interests to server:', err);
    return null;
  }
}

// Helper to load interests from the backend user profile with timeout guard
async function loadInterestsFromServer(): Promise<{ interests: string[]; hasSelected: boolean } | null> {
  try {
    const token = await AsyncStorage.getItem('token');
    if (!token) return null;

    const { userApi } = await import('../services/api');
    const res = await userApi.getProfile();
    if (res.success && res.data) {
      const interests = res.data.interests || [];
      const hasSelected = Boolean(res.data.hasSelectedInterests || interests.length > 0);
      return {
        interests,
        hasSelected,
      };
    }
  } catch (err) {
    console.warn('Failed to load interests from server (falling back):', err);
  }
  return null;
}

export const InterestsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [interests, setInterests] = useState<string[]>([]);
  const [hasSelected, setHasSelected] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const { user, setUser } = useAuth();

  // Sync state whenever the authenticated user changes (e.g. after login)
  useEffect(() => {
    if (user) {
      const userInterests = user.interests || [];
      const userHasSelected = Boolean(user.hasSelectedInterests || userInterests.length > 0);
      if (userHasSelected) {
        setInterests(userInterests);
        setHasSelected(true);
        AsyncStorage.setItem('user_interests', JSON.stringify(userInterests));
        AsyncStorage.setItem('user_interests_selected', 'true');
      }
    }
  }, [user]);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        // Read local storage first for immediate instant startup
        const stored = await AsyncStorage.getItem('user_interests');
        const flag = await AsyncStorage.getItem('user_interests_selected');

        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length >= 1 && parsed.length <= 4) {
              if (isMounted) setInterests(parsed);
            }
          } catch {}
        }
        if (flag === 'true') {
          if (isMounted) setHasSelected(true);
        }

        // Unblock UI immediately
        if (isMounted) setLoading(false);

        // Background server revalidation if user is logged in
        loadInterestsFromServer().then(async (serverData) => {
          if (serverData && (serverData.hasSelected || (serverData.interests && serverData.interests.length > 0))) {
            if (isMounted) {
              setInterests(serverData.interests || []);
              setHasSelected(true);
            }
            await AsyncStorage.setItem('user_interests', JSON.stringify(serverData.interests || []));
            await AsyncStorage.setItem('user_interests_selected', 'true');
          }
        }).catch((err) => {
          console.warn('[Interests] Background server sync warning:', err);
        });
      } catch (err) {
        console.warn('Failed to load interests from storage:', err);
        if (isMounted) setLoading(false);
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, [user]);

  const saveInterests = async (newInterests: string[]) => {
    // Allow 1 to 4 interests (not exactly 4)
    if (newInterests.length < 1 || newInterests.length > 4) return false;
    setInterests(newInterests);
    setHasSelected(true);
    await AsyncStorage.setItem('user_interests', JSON.stringify(newInterests));
    await AsyncStorage.setItem('user_interests_selected', 'true');
    // Sync to MongoDB
    const res = await syncInterestsToServer(newInterests, true);
    if (res?.success && res.data && setUser) {
      setUser(res.data);
      await AsyncStorage.setItem('user_profile', JSON.stringify(res.data));
    }
    return true;
  };

  const skipOnboarding = async () => {
    setInterests([]);
    setHasSelected(true);
    await AsyncStorage.setItem('user_interests', JSON.stringify([]));
    await AsyncStorage.setItem('user_interests_selected', 'true');
    // Sync skip state to server
    const res = await syncInterestsToServer([], true);
    if (res?.success && res.data && setUser) {
      setUser(res.data);
      await AsyncStorage.setItem('user_profile', JSON.stringify(res.data));
    }
  };

  const clearInterests = async () => {
    setInterests([]);
    setHasSelected(false);
    await AsyncStorage.removeItem('user_interests');
    await AsyncStorage.removeItem('user_interests_selected');
    // NOTE: We do NOT wipe user profile interests in MongoDB on session logout
    // so returning logged-in users keep their saved preferences!
  };

  return (
    <InterestsContext.Provider value={{ interests, hasSelected, loading, saveInterests, clearInterests, skipOnboarding }}>
      {children}
    </InterestsContext.Provider>
  );
};

export const useInterests = () => {
  const context = useContext(InterestsContext);
  if (!context) throw new Error('useInterests must be used within InterestsProvider');
  return context;
};
