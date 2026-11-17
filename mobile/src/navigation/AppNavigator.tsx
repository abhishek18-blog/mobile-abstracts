import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
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

type TabName = 'discover' | 'library' | 'foryou' | 'community' | 'settings';

export const AppNavigator: React.FC = () => {
  const { token, isGuest, isLoading, enterGuestMode } = useAuth();
  const { hasSelected, loading: interestsLoading } = useInterests();
  const [showSplash, setShowSplash] = useState(true);
  const [activeTab, setActiveTab] = useState<TabName>('discover');
  const [selectedPaperId, setSelectedPaperId] = useState<string | null>(null);
  const [showLanding, setShowLanding] = useState(true);
  const [showAuth, setShowAuth] = useState(false);
  const insets = useSafeAreaInsets();
  const { theme, colors } = useTheme();

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

  const renderActiveScreen = () => {
    switch (activeTab) {
      case 'discover':
        return <DiscoverScreen onSelectPaper={(id: string) => setSelectedPaperId(id)} />;
      case 'library':
        return <LibraryScreen onSelectPaper={(id: string) => setSelectedPaperId(id)} />;
      case 'foryou':
        return <ForYouScreen onSelectPaper={(id: string) => setSelectedPaperId(id)} />;
      case 'community':
        return <CommunityScreen onSelectPaper={(id: string) => setSelectedPaperId(id)} />;
      case 'settings':
        return <SettingsScreen />;
      default:
        return <DiscoverScreen onSelectPaper={(id: string) => setSelectedPaperId(id)} />;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
      {/* Screen Body */}
      <View style={styles.screenContainer}>{renderActiveScreen()}</View>

      {/* Bottom Navigation Bar */}
      <View style={[
        styles.bottomNav,
        {
          paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
          backgroundColor: colors.card,
          borderTopColor: colors.border
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
          return (
            <TouchableOpacity
              key={tab}
              style={styles.navTab}
              onPress={() => setActiveTab(tab as TabName)}
              activeOpacity={0.7}
            >
              <View style={[
                styles.iconContainer,
                isActive && { backgroundColor: colors.primary + '20' }
              ]}>
                <Icon
                  size={20}
                  color={isActive ? colors.primary : colors.textMuted}
                  strokeWidth={isActive ? 2.4 : 1.8}
                />
              </View>
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
    backgroundColor: '#0f172a',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 16,
    fontWeight: '600',
  },
  screenContainer: {
    flex: 1,
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderTopWidth: 1,
    borderColor: '#334155',
    paddingTop: 10,
    paddingHorizontal: 6,
    justifyContent: 'space-around',
  },
  navTab: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
    minWidth: 60,
  },
  iconContainer: {
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  navLabel: {
    color: '#64748b',
    fontSize: 10.5,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  navLabelActive: {
    color: '#38bdf8',
    fontWeight: '700',
  },
});
