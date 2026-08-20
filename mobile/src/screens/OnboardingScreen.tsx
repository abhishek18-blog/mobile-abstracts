import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import { Sparkles, Check, Plus } from 'lucide-react-native';
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

export const OnboardingScreen: React.FC = () => {
  const { colors, theme } = useTheme();
  const { saveInterests, skipOnboarding } = useInterests();
  
  // Dynamic suggestions list to allow adding custom topics
  const [availableInterests, setAvailableInterests] = useState<string[]>(AVAILABLE_INTERESTS);
  const [selected, setSelected] = useState<string[]>([]);
  
  // Custom topic modal state
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [customText, setCustomText] = useState('');

  const handleToggle = (interest: string) => {
    if (selected.includes(interest)) {
      setSelected(selected.filter((i) => i !== interest));
    } else {
      if (selected.length >= 4) {
        Alert.alert('Limit Reached', 'You can select up to 4 focus areas. Please deselect a topic first.');
        return;
      }
      setSelected([...selected, interest]);
    }
  };

  const handleContinue = async () => {
    if (selected.length === 0) {
      Alert.alert('Selection Required', 'Please select at least 1 focus area to customize your feed.');
      return;
    }
    const ok = await saveInterests(selected);
    if (!ok) {
      Alert.alert('Error', 'Failed to save preferences.');
    }
  };

  // Contrast text color for primary button in b/w and light mode
  const primaryBtnTextColor = theme === 'dark' ? '#000000' : '#ffffff';
  const isValid = selected.length >= 1 && selected.length <= 4;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header Section */}
        <View style={styles.header}>
          <View style={[styles.iconCircle, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Sparkles size={32} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Choose Your Focus</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Select 1 to 4 focus areas below to construct your recommendation feed. Add your own if yours is missing!
          </Text>
        </View>

        {/* Interests Grid */}
        <View style={styles.grid}>
          {availableInterests.map((interest) => {
            const active = selected.includes(interest);
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
                {active && (
                  <View style={[styles.checkCircle, { backgroundColor: colors.primary }]}>
                    <Check size={10} color={primaryBtnTextColor} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}

          {/* Add Custom Chip */}
          <TouchableOpacity
            activeOpacity={0.7}
            style={[
              styles.chip,
              styles.addCustomChip,
              { backgroundColor: colors.card, borderColor: colors.primary, borderStyle: 'dashed' }
            ]}
            onPress={() => setIsCustomModalOpen(true)}
          >
            <Plus size={14} color={colors.primary} style={{ marginRight: 4 }} />
            <Text style={[styles.chipText, { color: colors.primary, fontWeight: '700' }]}>
              Add Custom Topic
            </Text>
          </TouchableOpacity>
        </View>

        {/* Action Buttons */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.btn,
              { backgroundColor: colors.primary },
              !isValid && { opacity: 0.5 }
            ]}
            onPress={handleContinue}
            disabled={!isValid}
          >
            <Text style={[styles.btnText, { color: primaryBtnTextColor }]}>
              {isValid ? 'Save & Continue' : `Select Focus Topics (${selected.length}/4)`}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.skipBtn}
            onPress={skipOnboarding}
            activeOpacity={0.7}
          >
            <Text style={[styles.skipBtnText, { color: colors.textMuted }]}>
              Skip for now
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
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
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
                  if (selected.length >= 4 && !selected.includes(val)) {
                    Alert.alert('Limit Reached', 'You can select up to 4 focus areas. Please deselect a topic first.');
                    return;
                  }
                  if (!availableInterests.includes(val)) {
                    setAvailableInterests([...availableInterests, val]);
                  }
                  if (!selected.includes(val)) {
                    setSelected([...selected, val]);
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
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    justifyContent: 'space-between',
    minHeight: '100%',
  },
  header: {
    alignItems: 'center',
    marginTop: 20,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginBottom: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    marginVertical: 30,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  addCustomChip: {
    borderWidth: 1,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  checkCircle: {
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  footer: {
    marginBottom: 20,
    gap: 12,
  },
  btn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    fontSize: 16,
    fontWeight: '700',
  },
  skipBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipBtnText: {
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  // Modal styling
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
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
  input: {
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
