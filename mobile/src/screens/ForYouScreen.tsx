import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Compass, Sparkles, Plus, X } from 'lucide-react-native';
import { Paper } from '../types';
import { recommendationApi, papersApi, cachePapers } from '../services/api';
import { PaperCard } from '../components/PaperCard';
import { useTheme } from '../context/ThemeContext';
import { useInterests } from '../context/InterestsContext';

const AVAILABLE_INTERESTS = [
  'Machine Learning',
  'Computer Vision',
  'NLP',
  'Quantum Computing',
  'Deep Learning',
  'AI Ethics',
  'Blockchain',
  'Robotics',
  'Data Science',
  'Cybersecurity'
];

interface ForYouScreenProps {
  onSelectPaper: (paperId: string) => void;
}

export const ForYouScreen: React.FC<ForYouScreenProps> = ({ onSelectPaper }) => {
  const { theme, colors } = useTheme();
  const { interests, saveInterests } = useInterests();

  // Selected interest state
  const [selectedInterest, setSelectedInterest] = useState<string>('');
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [apiSource, setApiSource] = useState<string>('');

  // Setup interest states (for skipped onboarding)
  const [availableInterests, setAvailableInterests] = useState<string[]>(AVAILABLE_INTERESTS);
  const [setupInterests, setSetupInterests] = useState<string[]>([]);

  // Custom topic modal state
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [customText, setCustomText] = useState('');

  // Sync selected interest if interests array changes
  useEffect(() => {
    if (interests.length > 0) {
      if (!selectedInterest || !interests.includes(selectedInterest)) {
        setSelectedInterest(interests[0]);
      }
    }
  }, [interests]);

  useEffect(() => {
    if (!selectedInterest) return;

    const fetchForYou = async () => {
      setLoading(true);
      setPapers([]);
      setApiSource('');

      try {
        // Use 2-tier recommendation API (Semantic Scholar → OpenAlex)
        const results = await recommendationApi.getRecommendations(selectedInterest, 15);
        if (results.length > 0) {
          cachePapers(results);
          setPapers(results);
          // Determine source from the first paper's tag
          const src = results[0]?.tags?.[0] || 'External';
          setApiSource(src);
        }
      } catch (err) {
        console.warn('Failed to fetch recommendations:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchForYou();
  }, [selectedInterest]);

  const handleToggleSave = async (paperId: string) => {
    try {
      const res = await papersApi.toggleSave(paperId);
      if (res.success && res.data) {
        setPapers((prev) =>
          prev.map((p) => (p.id === paperId ? { ...p, saved: res.data?.saved } : p))
        );
      }
    } catch (err) {
      console.warn('Failed to save paper:', err);
    }
  };

  const primaryBtnTextColor = theme === 'dark' ? '#000000' : '#ffffff';

  // If preferences were skipped, offer inline setup
  if (interests.length === 0) {
    const handleToggle = (interest: string) => {
      if (setupInterests.includes(interest)) {
        setSetupInterests(setupInterests.filter((i) => i !== interest));
      } else {
        if (setupInterests.length >= 4) {
          Alert.alert('Limit Reached', 'You can select up to 4 focus areas. Please deselect a topic first.');
          return;
        }
        setSetupInterests([...setupInterests, interest]);
      }
    };

    const handleSave = async () => {
      if (setupInterests.length === 0) {
        Alert.alert('Selection Error', 'Please select at least 1 focus topic to build your feed.');
        return;
      }
      await saveInterests(setupInterests);
    };

    const isValid = setupInterests.length >= 1 && setupInterests.length <= 4;

    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView contentContainerStyle={styles.scrollSetup}>
          <View style={styles.setupContainer}>
            <Sparkles size={40} color={colors.primary} style={styles.setupIcon} />
            <Text style={[styles.setupTitle, { color: colors.text }]}>Personalize Your Feed</Text>
            <Text style={[styles.setupSub, { color: colors.textMuted }]}>
              You skipped focus area setup. Select 1 to 4 topics below to construct your recommendation feed.
            </Text>

            <View style={styles.grid}>
              {availableInterests.map((interest) => {
                const active = setupInterests.includes(interest);
                return (
                  <TouchableOpacity
                    key={interest}
                    activeOpacity={0.7}
                    style={[
                      styles.chip,
                      { backgroundColor: colors.card, borderColor: colors.border },
                      active && { borderColor: colors.primary, backgroundColor: colors.primary + '15' }
                    ]}
                    onPress={() => handleToggle(interest)}
                  >
                    <Text style={[
                      styles.chipText,
                      { color: colors.textMuted },
                      active && { color: colors.primary, fontWeight: '700' }
                    ]}>
                      {interest}
                    </Text>
                  </TouchableOpacity>
                );
              })}

              {/* Add Custom Chip */}
              <TouchableOpacity
                activeOpacity={0.7}
                style={[
                  styles.chip,
                  { borderColor: colors.primary, borderStyle: 'dashed', backgroundColor: colors.card }
                ]}
                onPress={() => setIsCustomModalOpen(true)}
              >
                <Text style={[styles.chipText, { color: colors.primary, fontWeight: '700' }]}>
                  ➕ Add Custom
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: colors.primary }, !isValid && { opacity: 0.5 }]}
              onPress={handleSave}
              disabled={!isValid}
            >
              <Text style={[styles.saveBtnText, { color: primaryBtnTextColor }]}>
                {isValid ? 'Build My Feed' : `Choose Focus Topics (${setupInterests.length}/4)`}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Custom Interest Input Modal */}
        <Modal visible={isCustomModalOpen} animationType="fade" transparent>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Add Custom Topic</Text>
              <TextInput
                style={[styles.inputField, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                placeholder="e.g. Bioinformatics, Astrophysics..."
                placeholderTextColor={colors.textMuted}
                value={customText}
                onChangeText={setCustomText}
                maxLength={30}
                autoFocus
              />
              <View style={styles.modalBtns}>
                <TouchableOpacity
                  style={[styles.modalBtn, { borderColor: colors.border, borderWidth: 1 }]}
                  onPress={() => {
                    setIsCustomModalOpen(false);
                    setCustomText('');
                  }}
                >
                  <Text style={{ color: colors.text, fontWeight: '600' }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: colors.primary }]}
                  onPress={() => {
                    const val = customText.trim();
                    if (!val) return;
                    if (setupInterests.length >= 4 && !setupInterests.includes(val)) {
                      Alert.alert('Limit Reached', 'You can select up to 4 focus areas. Please deselect a topic first.');
                      return;
                    }
                    if (!availableInterests.includes(val)) {
                      setAvailableInterests([...availableInterests, val]);
                    }
                    if (!setupInterests.includes(val)) {
                      setSetupInterests([...setupInterests, val]);
                    }
                    setIsCustomModalOpen(false);
                    setCustomText('');
                  }}
                >
                  <Text style={{ color: primaryBtnTextColor, fontWeight: '700' }}>Add</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  // Header rendered as a non-scrollable block above the paper list
  const ListHeader = (
    <View style={styles.header}>
      <View style={styles.titleRow}>
        <Text style={[styles.title, { color: colors.text }]}>Recommended For You</Text>
        <Compass size={22} color={colors.primary} />
      </View>

      {/* Horizontal topic pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.topicList}
      >
        {interests.map((interest) => (
          <View key={interest} style={styles.topicChipWrapper}>
            <TouchableOpacity
              style={[
                styles.topicChip,
                { backgroundColor: colors.card, borderColor: colors.border },
                selectedInterest === interest && { backgroundColor: colors.primary, borderColor: colors.primary }
              ]}
              onPress={() => setSelectedInterest(interest)}
            >
              <Text
                style={[
                  styles.topicText,
                  { color: colors.textMuted },
                  selectedInterest === interest && { color: primaryBtnTextColor, fontWeight: '700' }
                ]}
              >
                {interest}
              </Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      {/* Source indicator */}
      {apiSource ? (
        <Text style={[styles.sourceTag, { color: colors.textMuted }]}>
          📡 Source: {apiSource}
        </Text>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {loading ? (
        <>
          {ListHeader}
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textMuted }]}>
              Fetching papers from research APIs...
            </Text>
          </View>
        </>
      ) : (
        <FlatList<Paper>
          data={papers}
          keyExtractor={(item: Paper) => item.id}
          ListHeaderComponent={ListHeader}
          renderItem={({ item }: { item: Paper }) => (
            <PaperCard
              paper={item}
              onPress={() => {
                cachePapers([item]);
                onSelectPaper(item.id);
              }}
              onToggleSave={() => handleToggleSave(item.id)}
            />
          )}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Sparkles size={40} color={colors.textMuted} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                No recommendations for "{selectedInterest}"
              </Text>
              <Text style={[styles.emptySub, { color: colors.textMuted }]}>
                External APIs may be temporarily unavailable. Pull down to refresh or try another topic.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
  },
  topicList: {
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  topicChipWrapper: {
    marginRight: 8,
  },
  topicChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  topicText: {
    fontSize: 13,
    fontWeight: '600',
  },
  sourceTag: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 8,
    textAlign: 'right',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: '500',
  },
  listContent: {
    padding: 16,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySub: {
    fontSize: 14,
    textAlign: 'center',
    width: 260,
  },
  scrollSetup: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  setupContainer: {
    padding: 24,
    alignItems: 'center',
  },
  setupIcon: {
    marginBottom: 16,
  },
  setupTitle: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  setupSub: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 30,
    paddingHorizontal: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 30,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13.5,
    fontWeight: '500',
  },
  saveBtn: {
    width: '100%',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
  // Modal styling
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 16,
    textAlign: 'center',
  },
  inputField: {
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    borderWidth: 1,
    marginBottom: 20,
  },
  modalBtns: {
    flexDirection: 'row',
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
