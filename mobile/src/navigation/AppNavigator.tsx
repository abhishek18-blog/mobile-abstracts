import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Animated } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, Bookmark, Compass, Users, Settings } from 'lucide-react-native';
import { DiscoverScreen } from '../screens/DiscoverScreen';
import { LibraryScreen } from '../screens/LibraryScreen';
import { ForYouScreen } from '../screens/ForYouScreen';
import { CommunityScreen } from '../screens/CommunityScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { PaperDetailModalScreen } from '../screens/PaperDetailModalScreen';
import { AuthScreen } from '../screens/AuthScreen';
import { LandingScreen } from '../screens/LandingScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { SplashScreen } from '../screens/SplashScreen';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useInterests } from '../context/InterestsContext';
import { notificationService } from '../services/notificationService';

// Memoize tab screen components so background tabs NEVER unnecessarily re-render on tab switch
const MemoDiscoverScreen = React.memo(DiscoverScreen);
const MemoLibraryScreen = React.memo(LibraryScreen);
const MemoForYouScreen = React.memo(ForYouScreen);
const MemoCommunityScreen = React.memo(CommunityScreen);
const MemoSettingsScreen = React.memo(SettingsScreen);

type TabName = 'discover' | 'library' | 'foryou' | 'community' | 'settings';

export const AppNavigator: React.FC = () => {
  const { token, isGuest, isLoading, enterGuestMode } = useAuth();
  const { interests, hasSelected, loading: interestsLoading } = useInterests();
  const [showSplash, setShowSplash] = useState(true);
  const [activeTab, setActiveTab] = useState<TabName>('discover');
  const [selectedPaperId, setSelectedPaperId] = useState<string | null>(null);
  const [showLanding, setShowLanding] = useState(true);
  const [showAuth, setShowAuth] = useState(false);
  const insets = useSafeAreaInsets();
  const { theme, colors } = useTheme();

  // All tabs are pre-mounted from the start for instantaneous, zero-delay tab switching
  const [loadedTabs] = useState<Record<TabName, boolean>>({
    discover: true,
    library: true,
    foryou: true,
    community: true,
    settings: true,
  });

  // Tactile spring scale animations for the bottom tab buttons
  const tabScales = useRef<Record<TabName, Animated.Value>>({
    discover: new Animated.Value(1),
    library: new Animated.Value(1),
    foryou: new Animated.Value(1),
    community: new Animated.Value(1),
    settings: new Animated.Value(1),
  }).current;

  const handleSelectPaper = useCallback((id: string) => {
    setSelectedPaperId(id);
  }, []);

  const handleTabChange = useCallback((newTab: TabName) => {
    setActiveTab(prev => (prev === newTab ? prev : newTab));

    // Immediate tactile feedback on the tapped tab button
    Animated.sequence([
      Animated.timing(tabScales[newTab], {
        toValue: 0.88,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.spring(tabScales[newTab], {
        toValue: 1,
        friction: 5,
        tension: 180,
        useNativeDriver: true,
      }),
    ]).start();
  }, [tabScales]);

  // Initialize notifications on app launch and schedule background checks for recommended papers
  useEffect(() => {
    notificationService.initialize();

    if (interests && interests.length > 0) {
      // Check after a brief delay so initial load is smooth
      const initialTimer = setTimeout(() => {
        notificationService.checkAndNotifyNewRecommendedPapers(interests);
      }, 3000);

      const interval = setInterval(() => {
        notificationService.checkAndNotifyNewRecommendedPapers(interests);
      }, 60000);

      return () => {
        clearTimeout(initialTimer);
        clearInterval(interval);
      };
    }
  }, [interests]);

  // Initial Splash Screen with Abstracts SVG Logo and Creative Animated Spinner
  if (showSplash || isLoading || interestsLoading) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  // If user is not authenticated and not in guest mode
  if (!token && !isGuest) {
    // Show landing page first, then auth screen
    if (showLanding && !showAuth) {
      return (
        <LandingScreen
          onGetStarted={() => {
            setShowLanding(false);
            setShowAuth(true);
          }}
          onGuestAccess={() => {
            // Directly enter guest mode from landing page
            enterGuestMode();
          }}
        />
      );
    }

    // Show auth screen
    return (
      <AuthScreen
        onBack={() => {
          setShowAuth(false);
          setShowLanding(true);
        }}
      />
    );
  }

  // If user hasn't set focus interests yet, prompt Onboarding screen
  if (!hasSelected) {
    return <OnboardingScreen />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
      {/* Screen Body with Individual Tab Layers */}
      <View style={[styles.screenContainer, { backgroundColor: colors.background }]}>
        {loadedTabs.discover && (
          <View
            style={[
              styles.tabLayer,
              activeTab === 'discover' ? styles.activeTabLayer : styles.hiddenTabLayer,
              { backgroundColor: colors.background },
            ]}
            pointerEvents={activeTab === 'discover' ? 'auto' : 'none'}
          >
            <MemoDiscoverScreen onSelectPaper={handleSelectPaper} />
          </View>
        )}

        {loadedTabs.library && (
          <View
            style={[
              styles.tabLayer,
              activeTab === 'library' ? styles.activeTabLayer : styles.hiddenTabLayer,
              { backgroundColor: colors.background },
            ]}
            pointerEvents={activeTab === 'library' ? 'auto' : 'none'}
          >
            <MemoLibraryScreen
              isActive={activeTab === 'library'}
              onSelectPaper={handleSelectPaper}
            />
          </View>
        )}

        {loadedTabs.foryou && (
          <View
            style={[
              styles.tabLayer,
              activeTab === 'foryou' ? styles.activeTabLayer : styles.hiddenTabLayer,
              { backgroundColor: colors.background },
            ]}
            pointerEvents={activeTab === 'foryou' ? 'auto' : 'none'}
          >
            <MemoForYouScreen onSelectPaper={handleSelectPaper} />
          </View>
        )}

        {loadedTabs.community && (
          <View
            style={[
              styles.tabLayer,
              activeTab === 'community' ? styles.activeTabLayer : styles.hiddenTabLayer,
              { backgroundColor: colors.background },
            ]}
            pointerEvents={activeTab === 'community' ? 'auto' : 'none'}
          >
            <MemoCommunityScreen onSelectPaper={handleSelectPaper} />
          </View>
        )}

        {loadedTabs.settings && (
          <View
            style={[
              styles.tabLayer,
              activeTab === 'settings' ? styles.activeTabLayer : styles.hiddenTabLayer,
              { backgroundColor: colors.background },
            ]}
            pointerEvents={activeTab === 'settings' ? 'auto' : 'none'}
          >
            <MemoSettingsScreen />
          </View>
        )}
      </View>

      {/* Bottom Navigation Bar */}
      <View style={[
        styles.bottomNav,
        {
          paddingBottom: insets.bottom > 0 ? insets.bottom : 10,
          backgroundColor: colors.card,
          borderTopColor: theme === 'dark' ? colors.border : '#EEF2F6',
        }
      ]}>
        {[
          { tab: 'discover', label: 'Discover', Icon: Search },
          { tab: 'library', label: 'Library', Icon: Bookmark },
          { tab: 'foryou', label: 'For You', Icon: Compass },
          { tab: 'community', label: 'Groups', Icon: Users },
          { tab: 'settings', label: 'Settings', Icon: Settings },
        ].map(({ tab, label, Icon }) => {
          const isActive = activeTab === tab;
          const scale = tabScales[tab as TabName];
          return (
            <TouchableOpacity
              key={tab}
              style={styles.navTab}
              onPress={() => handleTabChange(tab as TabName)}
              activeOpacity={0.7}
              delayPressIn={0}
            >
              <Animated.View style={[
                styles.iconContainer,
                { transform: [{ scale }] },
                isActive && {
                  backgroundColor: theme === 'dark' ? '#1E3A8A' : '#DBEAFE',
                }
              ]}>
                <Icon
                  size={20}
                  color={isActive ? colors.primary : colors.textMuted}
                  strokeWidth={isActive ? 2.4 : 1.9}
                />
              </Animated.View>
              <Text
                style={[
                  styles.navLabel,
                  { color: colors.textMuted },
                  isActive && { color: colors.primary, fontWeight: '700' },
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Detail Modal */}
      <Modal
        visible={!!selectedPaperId}
        animationType="slide"
        hardwareAccelerated={true}
        statusBarTranslucent={true}
        onRequestClose={() => setSelectedPaperId(null)}
      >
        <PaperDetailModalScreen
          paperId={selectedPaperId}
          onClose={() => setSelectedPaperId(null)}
        />
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EAF2FB',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#EAF2FB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#64748B',
    fontSize: 16,
    fontWeight: '600',
  },
  screenContainer: {
    flex: 1,
  },
  tabLayer: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
  },
  activeTabLayer: {
    display: 'flex',
    zIndex: 1,
  },
  hiddenTabLayer: {
    display: 'none',
    zIndex: 0,
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderColor: '#EEF2F6',
    paddingTop: 4,
    paddingHorizontal: 6,
    justifyContent: 'space-around',
    shadowColor: '#1A3B70',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 4,
  },
  navTab: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 1,
    minWidth: 54,
  },
  iconContainer: {
    paddingHorizontal: 16,
    paddingVertical: 3,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 1,
  },
  navLabel: {
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
});
