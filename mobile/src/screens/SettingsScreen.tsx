import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  Modal,
  Image,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LogOut, Moon, Sun, Layers, Plus, X, Camera, Trash2, Image as ImageIcon } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useInterests } from '../context/InterestsContext';
import { userApi } from '../services/api';

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

export const SettingsScreen: React.FC = () => {
  const { user, setUser, isGuest, logout } = useAuth();
  const { theme, toggleTheme, colors } = useTheme();
  const { interests, saveInterests, clearInterests } = useInterests();
  
  // Custom interests list initialization
  const [availableInterests, setAvailableInterests] = useState<string[]>(() => {
    const all = [...AVAILABLE_INTERESTS];
    interests.forEach((item) => {
      if (!all.includes(item)) {
        all.push(item);
      }
    });
    return all;
  });
  
  const [selectedInterests, setSelectedInterests] = useState<string[]>(interests);

  // Custom Topic input modal state
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [customText, setCustomText] = useState('');

  // Profile photo modal state
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [photoUrlInput, setPhotoUrlInput] = useState('');

  const handleSavePhotoData = async (dataStr: string) => {
    try {
      const res = await userApi.updateProfile({ avatar_url: dataStr });
      if (res.success && res.data) {
        setUser(res.data);
        Alert.alert('✅ Photo Updated', 'Your profile photo has been updated.');
        setIsPhotoModalOpen(false);
        setPhotoUrlInput('');
      } else {
        Alert.alert('Error', res.error || 'Failed to update photo.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update photo.');
    }
  };

  const handleOpenGallery = async () => {
    try {
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e: any) => {
          const file = e.target?.files?.[0];
          if (file) {
            const reader = new FileReader();
            reader.onloadend = async () => {
              const base64Data = reader.result as string;
              await handleSavePhotoData(base64Data);
            };
            reader.readAsDataURL(file);
          }
        };
        input.click();
        return;
      }

      // Dynamic import for expo-image-picker in native environment
      try {
        const ImagePicker = require('expo-image-picker');
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('Permission Needed', 'Permission to access photo gallery is required.');
          return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.6,
          base64: true,
        });

        if (!result.canceled && result.assets && result.assets[0]) {
          const asset = result.assets[0];
          const photoData = asset.base64
            ? `data:image/jpeg;base64,${asset.base64}`
            : asset.uri;
          await handleSavePhotoData(photoData);
        }
      } catch (pickerErr) {
        // Fall back to URL/Base64 input modal if native picker is unavailable
        setIsPhotoModalOpen(true);
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not open photo gallery.');
    }
  };

  const handleSavePhoto = async () => {
    if (!photoUrlInput.trim()) {
      Alert.alert('Error', 'Please enter a valid image URL or base64 string.');
      return;
    }
    await handleSavePhotoData(photoUrlInput.trim());
  };

  const handleDeletePhoto = async () => {
    Alert.alert('Remove Photo', 'Are you sure you want to remove your profile photo?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            const res = await userApi.updateProfile({ avatar_url: '' });
            if (res.success && res.data) {
              setUser(res.data);
              Alert.alert('Photo Removed', 'Your profile photo has been removed.');
            }
          } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to remove photo.');
          }
        },
      },
    ]);
  };

  const handleLogout = async () => {
    await clearInterests();
    await logout();
  };

  const handleToggleInterest = (interest: string) => {
    if (selectedInterests.includes(interest)) {
      setSelectedInterests(selectedInterests.filter((i) => i !== interest));
    } else {
      if (selectedInterests.length >= 4) {
        Alert.alert('Limit Reached', 'You can select up to 4 focus areas. Please deselect a topic first.');
        return;
      }
      setSelectedInterests([...selectedInterests, interest]);
    }
  };

  const handleSaveInterests = async () => {
    if (selectedInterests.length === 0) {
      Alert.alert('Selection Error', 'Please select at least 1 interest to continue.');
      return;
    }
    if (selectedInterests.length > 4) {
      Alert.alert('Too Many', 'Please select up to 4 interests.');
      return;
    }
    const success = await saveInterests(selectedInterests);
    if (success) {
      Alert.alert('✅ Interests Saved', 'Your research interests have been updated and synced to your account.');
    } else {
      Alert.alert('Error', 'Failed to save interests. Please select 1 to 4 topics.');
    }
  };

  const primaryBtnTextColor = theme === 'dark' ? '#000000' : '#ffffff';
  const isInterestsValid = selectedInterests.length >= 1 && selectedInterests.length <= 4;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Account & Settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Profile Card */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.profileHeader}>
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
              {user?.avatar_url ? (
                <Image source={{ uri: user.avatar_url }} style={styles.avatarImage} />
              ) : (
                <Text style={[styles.avatarText, { color: primaryBtnTextColor }]}>
                  {user?.avatar_initials || (isGuest ? 'G' : 'U')}
                </Text>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.userName, { color: colors.text }]}>
                {user?.name || (isGuest ? 'Guest Researcher' : 'User')}
              </Text>
              <Text style={[styles.userEmail, { color: colors.textMuted }]}>
                {user?.email || (isGuest ? 'Read Only Mode' : '')}
              </Text>
              
              {!isGuest && (
                <View style={{ flexDirection: 'row', marginTop: 8, flexWrap: 'wrap' }}>
                  <TouchableOpacity
                    style={[styles.photoActionBtn, { backgroundColor: colors.primary + '20', marginRight: 8, marginBottom: 4 }]}
                    onPress={handleOpenGallery}
                  >
                    <ImageIcon size={12} color={colors.primary} />
                    <Text style={[styles.photoActionText, { color: colors.primary }]}>Open Gallery</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.photoActionBtn, { backgroundColor: colors.border + '60', marginRight: 8, marginBottom: 4 }]}
                    onPress={() => setIsPhotoModalOpen(true)}
                  >
                    <Camera size={12} color={colors.text} />
                    <Text style={[styles.photoActionText, { color: colors.text }]}>URL Input</Text>
                  </TouchableOpacity>

                  {user?.avatar_url ? (
                    <TouchableOpacity
                      style={[styles.photoActionBtn, { backgroundColor: '#ef444420', marginBottom: 4 }]}
                      onPress={handleDeletePhoto}
                    >
                      <Trash2 size={12} color="#ef4444" />
                      <Text style={[styles.photoActionText, { color: '#ef4444' }]}>Delete</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Theme Settings Card */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.cardHeader}>
            {theme === 'dark' ? <Moon size={18} color="#f59e0b" /> : <Sun size={18} color="#f59e0b" />}
            <Text style={[styles.cardTitle, { color: colors.text }]}>App Appearance</Text>
          </View>
          <Text style={[styles.fieldSub, { color: colors.textMuted }]}>
            Switch between professional Light and deep Black background themes:
          </Text>
          <View style={styles.themeToggleRow}>
            <TouchableOpacity
              style={[
                styles.themeBtn,
                theme === 'light' && { backgroundColor: colors.primary },
                { borderColor: colors.border }
              ]}
              onPress={() => theme !== 'light' && toggleTheme()}
            >
              <Sun size={16} color={theme === 'light' ? primaryBtnTextColor : colors.textMuted} />
              <Text style={[styles.themeBtnText, { color: theme === 'light' ? primaryBtnTextColor : colors.text }]}>Light Mode</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.themeBtn,
                theme === 'dark' && { backgroundColor: colors.primary },
                { borderColor: colors.border }
              ]}
              onPress={() => theme !== 'dark' && toggleTheme()}
            >
              <Moon size={16} color={theme === 'dark' ? primaryBtnTextColor : colors.textMuted} />
              <Text style={[styles.themeBtnText, { color: theme === 'dark' ? primaryBtnTextColor : colors.text }]}>Black Mode</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Custom Interests Selector Card */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.cardHeader}>
            <Layers size={18} color={colors.primary} />
            <Text style={[styles.cardTitle, { color: colors.text }]}>Research Interests (Choose 1 to 4)</Text>
          </View>
          <Text style={[styles.fieldSub, { color: colors.textMuted }]}>
            These interests will customize your "For You" recommendations feed:
          </Text>
          <View style={styles.interestsGrid}>
            {availableInterests.map((interest) => {
              const active = selectedInterests.includes(interest);
              return (
                <TouchableOpacity
                  key={interest}
                  style={[
                    styles.interestChip,
                    active && { backgroundColor: colors.primary + '25', borderColor: colors.primary },
                    { borderColor: colors.border }
                  ]}
                  onPress={() => handleToggleInterest(interest)}
                >
                  <Text style={[
                    styles.interestChipText, 
                    { color: colors.textMuted },
                    active && { color: colors.primary, fontWeight: '700' }
                  ]}>
                    {interest}
                  </Text>
                </TouchableOpacity>
              );
            })}

            {/* Custom Interest Option */}
            <TouchableOpacity
              style={[
                styles.interestChip,
                { borderColor: colors.primary, borderStyle: 'dashed', backgroundColor: colors.card }
              ]}
              onPress={() => setIsCustomModalOpen(true)}
            >
              <Text style={[styles.interestChipText, { color: colors.primary, fontWeight: '700' }]}>
                ➕ Add Custom
              </Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity 
            style={[styles.saveBtn, { backgroundColor: colors.primary }, !isInterestsValid && { opacity: 0.5 }]} 
            onPress={handleSaveInterests}
            disabled={!isInterestsValid}
          >
            <Text style={[styles.saveBtnText, { color: primaryBtnTextColor }]}>
              Save Interests ({selectedInterests.length}/4)
            </Text>
          </TouchableOpacity>
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <LogOut size={18} color="#ef4444" />
          <Text style={styles.logoutText}>
            {isGuest ? 'Exit Guest Mode' : 'Log Out'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Custom Interest Input Modal */}
      <Modal visible={isCustomModalOpen} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Add Custom Interest</Text>
            <TextInput
              style={[styles.inputField, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              placeholder="e.g. Quantum Cryptography, NLP Model..."
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
                  if (selectedInterests.length >= 4 && !selectedInterests.includes(val)) {
                    Alert.alert('Limit Reached', 'You can select up to 4 focus areas. Please deselect a topic first.');
                    return;
                  }
                  if (!availableInterests.includes(val)) {
                    setAvailableInterests([...availableInterests, val]);
                  }
                  if (!selectedInterests.includes(val)) {
                    setSelectedInterests([...selectedInterests, val]);
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

      {/* Photo Update Modal */}
      <Modal visible={isPhotoModalOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.customModalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={[styles.customModalTitle, { color: colors.text }]}>Upload Profile Photo</Text>
              <TouchableOpacity onPress={() => setIsPhotoModalOpen(false)}>
                <X size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Gallery Option */}
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.primary,
                paddingVertical: 12,
                borderRadius: 10,
                marginBottom: 16,
              }}
              onPress={handleOpenGallery}
            >
              <ImageIcon size={18} color={primaryBtnTextColor} style={{ marginRight: 8 }} />
              <Text style={{ color: primaryBtnTextColor, fontWeight: '700', fontSize: 14 }}>
                Choose from Photo Gallery
              </Text>
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
              <Text style={{ marginHorizontal: 10, color: colors.textMuted, fontSize: 11, fontWeight: '700' }}>OR PASTE IMAGE URL</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
            </View>

            <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 8 }}>
              Paste image URL or Base64 data string:
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              placeholder="https://example.com/photo.jpg or data:image/png..."
              placeholderTextColor={colors.textMuted}
              value={photoUrlInput}
              onChangeText={setPhotoUrlInput}
              autoCapitalize="none"
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12 }}>
              <TouchableOpacity
                style={[styles.customModalCancelBtn, { borderColor: colors.border, marginRight: 8 }]}
                onPress={() => {
                  setIsPhotoModalOpen(false);
                  setPhotoUrlInput('');
                }}
              >
                <Text style={{ color: colors.textMuted, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.customModalAddBtn, { backgroundColor: colors.primary }]}
                onPress={handleSavePhoto}
              >
                <Text style={{ color: primaryBtnTextColor, fontWeight: '700' }}>Save URL</Text>
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
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
  },
  content: {
    padding: 16,
  },
  card: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  photoActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  photoActionText: {
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 4,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '800',
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
  },
  userEmail: {
    fontSize: 13,
    marginTop: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 8,
  },
  fieldSub: {
    fontSize: 12,
    marginBottom: 10,
    lineHeight: 16,
  },
  input: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    borderWidth: 1,
    marginBottom: 10,
  },
  saveBtn: {
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  themeToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  themeBtn: {
    flex: 0.48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  themeBtnText: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 8,
  },
  interestsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  interestChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
    marginBottom: 8,
  },
  interestChipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#451a1a',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#7f1d1d',
    marginTop: 10,
    marginBottom: 30,
  },
  logoutText: {
    color: '#fca5a5',
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 8,
  },
  // Modal styles
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
  customModalCard: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    elevation: 10,
  },
  customModalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  customModalCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  customModalAddBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
});
