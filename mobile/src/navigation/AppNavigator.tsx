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
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useInterests } from '../context/InterestsContext';

type TabName = 'discover' | 'library' | 'foryou' | 'community' | 'settings';

export const AppNavigator: React.FC = () => {
  const { token, isGuest, isLoading, enterGuestMode } = useAuth();
  const { hasSelected, loading: interestsLoading } = useInterests();
  const [activeTab, setActiveTab] = useState<TabName>('discover');
  const [selectedPaperId, setSelectedPaperId] = useState<string | null>(null);
  const [showLanding, setShowLanding] = useState(true);
  const [showAuth, setShowAuth] = useState(false);
  const insets = useSafeAreaInsets();
  const { theme, colors } = useTheme();

  if (isLoading || interestsLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading Abstracts Mobile...</Text>
      </View>
    );
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
        return <DiscoverScreen onSelectPaper={(id) => setSelectedPaperId(id)} />;
      case 'library':
        return <LibraryScreen onSelectPaper={(id) => setSelectedPaperId(id)} />;
      case 'foryou':
        return <ForYouScreen onSelectPaper={(id) => setSelectedPaperId(id)} />;
      case 'community':
        return <CommunityScreen onSelectPaper={(id) => setSelectedPaperId(id)} />;
      case 'settings':
        return <SettingsScreen />;
      default:
        return <DiscoverScreen onSelectPaper={(id) => setSelectedPaperId(id)} />;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} backgroundColor={colors.background} />
      {/* Screen Body */}
      <View style={styles.screenContainer}>{renderActiveScreen()}</View>

      {/* Bottom Navigation Bar */}
      <View style={[
        styles.bottomNav, 
        { 
          paddingBottom: Math.max(insets.bottom, 12), 
          backgroundColor: colors.card,
          borderTopColor: colors.border
        }
      ]}>
        <TouchableOpacity
          style={styles.navTab}
          onPress={() => setActiveTab('discover')}
        >
          <Search
            size={22}
            color={activeTab === 'discover' ? colors.primary : colors.textMuted}
          />
          <Text
            style={[
              styles.navLabel,
              { color: colors.textMuted },
              activeTab === 'discover' && { color: colors.primary, fontWeight: '700' },
            ]}
          >
            Discover
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navTab}
          onPress={() => setActiveTab('library')}
        >
          <Bookmark
            size={22}
            color={activeTab === 'library' ? colors.primary : colors.textMuted}
          />
          <Text
            style={[
              styles.navLabel,
              { color: colors.textMuted },
              activeTab === 'library' && { color: colors.primary, fontWeight: '700' },
            ]}
          >
            Library
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navTab}
          onPress={() => setActiveTab('foryou')}
        >
          <Compass
            size={22}
            color={activeTab === 'foryou' ? colors.primary : colors.textMuted}
          />
          <Text
            style={[
              styles.navLabel,
              { color: colors.textMuted },
              activeTab === 'foryou' && { color: colors.primary, fontWeight: '700' },
            ]}
          >
            For You
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navTab}
          onPress={() => setActiveTab('community')}
        >
          <Users
            size={22}
            color={activeTab === 'community' ? colors.primary : colors.textMuted}
          />
          <Text
            style={[
              styles.navLabel,
              { color: colors.textMuted },
              activeTab === 'community' && { color: colors.primary, fontWeight: '700' },
            ]}
          >
            Groups
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navTab}
          onPress={() => setActiveTab('settings')}
        >
          <Settings
            size={22}
            color={activeTab === 'settings' ? colors.primary : colors.textMuted}
          />
          <Text
            style={[
              styles.navLabel,
              { color: colors.textMuted },
              activeTab === 'settings' && { color: colors.primary, fontWeight: '700' },
            ]}
          >
            Settings
          </Text>
        </TouchableOpacity>
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
    paddingVertical: 4,
    minWidth: 56,
  },
  navLabel: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 3,
    fontWeight: '500',
  },
  navLabelActive: {
    color: '#38bdf8',
    fontWeight: '700',
  },
});
