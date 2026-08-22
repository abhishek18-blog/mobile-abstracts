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
    if (!token) return; // Guest mode — skip server sync

    const { DEFAULT_API_URL } = await import('../services/api');
    const res = await fetch(`${DEFAULT_API_URL.replace(/\/api$/, '')}/api/user`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        interests,
        hasSelectedInterests: hasSelected,
      }),
    });
    const json = await res.json();
    if (!json.success) {
      console.warn('Failed to sync interests to server:', json.error);
    }
  } catch (err) {
    console.warn('Failed to sync interests to server:', err);
  }
}

// Helper to load interests from the backend user profile with timeout guard
async function loadInterestsFromServer(): Promise<{ interests: string[]; hasSelected: boolean } | null> {
  try {
    const token = await AsyncStorage.getItem('token');
    if (!token) return null;

    const { DEFAULT_API_URL } = await import('../services/api');
    
    // Add 3-second timeout guard to prevent network hangs from blocking app startup
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const res = await fetch(`${DEFAULT_API_URL.replace(/\/api$/, '')}/api/user`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const json = await res.json();
    if (json.success && json.data) {
      return {
        interests: json.data.interests || [],
        hasSelected: json.data.hasSelectedInterests || false,
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
  const { user } = useAuth();

  // Sync state whenever the authenticated user changes (e.g. after login)
  useEffect(() => {
    if (user) {
      if (user.interests && user.interests.length > 0) {
        setInterests(user.interests);
        setHasSelected(true);
        AsyncStorage.setItem('user_interests', JSON.stringify(user.interests));
        AsyncStorage.setItem('user_interests_selected', 'true');
      } else if ((user as any).hasSelectedInterests) {
        setHasSelected(true);
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
    await syncInterestsToServer(newInterests, true);
    return true;
  };

  const skipOnboarding = async () => {
    setInterests([]);
    setHasSelected(true);
    await AsyncStorage.setItem('user_interests', JSON.stringify([]));
    await AsyncStorage.setItem('user_interests_selected', 'true');
    // Sync skip state to server
    await syncInterestsToServer([], true);
  };

  const clearInterests = async () => {
    setInterests([]);
    setHasSelected(false);
    await AsyncStorage.removeItem('user_interests');
    await AsyncStorage.removeItem('user_interests_selected');
    // Sync cleared state to server
    await syncInterestsToServer([], false);
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
