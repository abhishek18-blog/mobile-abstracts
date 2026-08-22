import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  Modal,
  Linking,
} from 'react-native';
import { LogIn, UserPlus, ArrowLeft, X, Check, Mail, ShieldCheck, UserCheck } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { DEFAULT_API_URL, setCustomApiUrl } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { AbstractsLogo } from '../components/AbstractsLogo';

// Candidate URLs to attempt in sequence if primary URL network fails
const getCandidateApiUrls = (): string[] => {
  const list: string[] = [DEFAULT_API_URL];
  if (__DEV__) {
    const androidEmulatorUrl = 'http://10.0.2.2:3001/api';
    const localhostUrl = 'http://localhost:3001/api';
    if (!list.includes(androidEmulatorUrl)) list.push(androidEmulatorUrl);
    if (!list.includes(localhostUrl)) list.push(localhostUrl);
  }
  const renderUrl = 'https://abstracts-researchhub.onrender.com/api';
  if (!list.includes(renderUrl)) list.push(renderUrl);
  return list;
};

const fetchAuthWithFallback = async (endpoint: string, options: RequestInit): Promise<Response> => {
  const candidateUrls = getCandidateApiUrls();
  let lastError: any = null;

  for (const baseUrl of candidateUrls) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);

    try {
      const response = await fetch(`${baseUrl}${endpoint}`, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      // If network connection succeeded, lock in this working API URL globally!
      setCustomApiUrl(baseUrl);
      return response;
    } catch (err: any) {
      clearTimeout(timeoutId);
      lastError = err;
      console.warn(`[Auth Fallback] Attempt to ${baseUrl}${endpoint} failed:`, err.message || err);
    }
  }

  throw lastError || new Error('Unable to connect to any API backend server.');
};

interface AuthScreenProps {
  onBack?: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onBack }) => {
  const { login, enterGuestMode } = useAuth();
  const { colors, theme } = useTheme();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  // Google Account Chooser State
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleEmailInput, setGoogleEmailInput] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);

  // Listen for deep links
  useEffect(() => {
    const handleUrlEvent = (event: { url: string }) => {
      handleDeepLink(event.url);
    };

    const subscription = Linking.addEventListener('url', handleUrlEvent);

    Linking.getInitialURL().then((initialUrl) => {
      if (initialUrl) {
        handleDeepLink(initialUrl);
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const handleDeepLink = async (url: string) => {
    try {
      if (url.includes('email=')) {
        const params = new URLSearchParams(url.split('?')[1]);
        const returnedEmail = params.get('email');
        if (returnedEmail) {
          executeGoogleLogin(returnedEmail);
        }
      }
    } catch (e) {
      console.warn('Deep link handling error:', e);
    }
  };

  // Forgot Password
  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert('Email Required', 'Please enter your email address to reset your password.');
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetchAuthWithFallback('/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const json = await response.json();
      if (response.ok && json.success) {
        Alert.alert('Success', json.message || 'If this email is registered, a reset link has been sent.');
      } else {
        throw new Error(json.error || 'Failed to process forgot password request.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Network error.');
    } finally {
      setLoading(false);
    }
  };

  // Password / Standard Email Sign In / Register
  const handleSubmit = async () => {
    if (!email || !password) {
      Alert.alert('Missing fields', 'Please enter both your email and password.');
      return;
    }

    setLoading(true);
    try {
      const endpoint = isRegister ? '/auth/register' : '/auth/login';
      const cleanEmail = email.trim();
      const body = isRegister ? { name, email: cleanEmail, password } : { email: cleanEmail, password };

      const response = await fetchAuthWithFallback(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.error || 'Invalid credentials or account does not exist.');
      }

      if (json.token && json.user) {
        await login(json.token, json.user);
      } else {
        throw new Error('Invalid response structure from server.');
      }
    } catch (err: any) {
      Alert.alert('Authentication Error', err.message || 'Server error');
    } finally {
      setLoading(false);
    }
  };

  // Google Sign-In: Verifies MongoDB record for email and signs user in directly
  const executeGoogleLogin = async (targetEmail: string) => {
    if (!targetEmail || !targetEmail.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid Google email address.');
      return;
    }

    setGoogleLoading(true);
    const displayName = targetEmail.split('@')[0].replace('.', ' ');
    const formattedName = displayName.charAt(0).toUpperCase() + displayName.slice(1);

    try {
      // Send Google Mobile Auth request with automated backend URL fallback
      const response = await fetchAuthWithFallback('/auth/google-mobile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: targetEmail.trim(),
          name: formattedName,
          avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(formattedName)}&background=2563eb&color=fff`,
        }),
      });

      const json = await response.json();

      if (response.ok && json.success && json.token && json.user) {
        setShowGoogleModal(false);
        await login(json.token, json.user);
        return;
      }

      if (!response.ok) {
        throw new Error(json.error || 'Server rejected the login request');
      }
    } catch (err: any) {
      console.warn('Google Auth Error:', err);
      Alert.alert(
        'Google Login Failed',
        err.message || 'Unable to connect to the backend server to verify your Google Account.'
      );
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Back button if coming from landing page */}
          {onBack && (
            <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
              <ArrowLeft size={20} color={colors.textMuted} />
              <Text style={[styles.backText, { color: colors.textMuted }]}>Back to Home</Text>
            </TouchableOpacity>
          )}

          {/* Brand Header */}
          <View style={styles.logoContainer}>
            <AbstractsLogo
              width={220}
              height={56}
              textColor={colors.text}
              primaryColor="#2563eb"
            />
            <Text style={[styles.tagline, { color: colors.textMuted }]}>
              {isRegister ? 'Create your research profile' : 'Welcome back, researcher'}
            </Text>
          </View>

          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              {isRegister ? 'Create Account' : 'Sign In'}
            </Text>
            <Text style={[styles.cardSubtitle, { color: colors.textMuted }]}>
              {isRegister
                ? 'Fill in your details to get started.'
                : 'Enter your email & password to access your account.'}
            </Text>

            {isRegister && (
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textMuted }]}>FULL NAME</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  placeholder="John Doe"
                  placeholderTextColor={colors.textMuted}
                  value={name}
                  onChangeText={setName}
                />
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textMuted }]}>EMAIL</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                placeholder="you@example.com"
                placeholderTextColor={colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textMuted }]}>PASSWORD</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                placeholder="••••••••"
                placeholderTextColor={colors.textMuted}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </View>

            {!isRegister && (
              <TouchableOpacity onPress={handleForgotPassword} style={{ alignSelf: 'flex-end', marginBottom: 16 }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#2563eb' }}>Forgot Password?</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <>
                  {isRegister ? (
                    <UserPlus size={18} color="#ffffff" style={styles.submitIcon} />
                  ) : (
                    <LogIn size={18} color="#ffffff" style={styles.submitIcon} />
                  )}
                  <Text style={styles.submitBtnText}>
                    {isRegister ? 'SIGN UP WITH PASSWORD' : 'SIGN IN WITH PASSWORD'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerContainer}>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
              <Text style={[styles.dividerText, { color: colors.textMuted }]}>OR GOOGLE AUTH</Text>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            </View>

            {/* Continue with Google */}
            <TouchableOpacity
              style={styles.googleBtn}
              onPress={() => setShowGoogleModal(true)}
              activeOpacity={0.85}
            >
              <Image
                source={{ uri: 'https://www.google.com/favicon.ico' }}
                style={styles.googleIcon}
              />
              <Text style={styles.googleBtnText}>Continue with Google</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.switchBtn} onPress={() => setIsRegister(!isRegister)}>
              <Text style={[styles.switchText, { color: colors.textMuted }]}>
                {isRegister ? 'Already have an account? ' : "Don't have an account? "}
                <Text style={{ color: '#2563eb', fontWeight: '700' }}>
                  {isRegister ? 'Sign In' : 'Sign Up'}
                </Text>
              </Text>
            </TouchableOpacity>
          </View>

          {/* Guest Access Option */}
          <TouchableOpacity style={styles.guestBtn} onPress={enterGuestMode} activeOpacity={0.7}>
            <Text style={[styles.guestText, { color: colors.textMuted }]}>Continue as Guest (Read Only)</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Google Account Chooser Modal */}
      <Modal
        visible={showGoogleModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowGoogleModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            onPress={() => setShowGoogleModal(false)}
            activeOpacity={1}
          />
          <View style={[styles.modalContent, { backgroundColor: theme === 'dark' ? '#18181b' : '#ffffff' }]}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTitleRow}>
                <Image
                  source={{ uri: 'https://www.google.com/favicon.ico' }}
                  style={{ width: 22, height: 22, marginRight: 10 }}
                />
                <Text style={[styles.modalTitle, { color: theme === 'dark' ? '#f4f4f5' : '#18181b' }]}>
                  Google Account Sign In
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowGoogleModal(false)}
                style={styles.closeBtn}
              >
                <X size={20} color={theme === 'dark' ? '#a1a1aa' : '#71717a'} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalSubtitle, { color: theme === 'dark' ? '#a1a1aa' : '#71717a' }]}>
              Enter your Google Account email to load your research profile:
            </Text>

            {/* Google Email Input */}
            <View style={styles.customEmailBox}>
              <Text style={[styles.customEmailLabel, { color: theme === 'dark' ? '#a1a1aa' : '#71717a' }]}>
                GOOGLE ACCOUNT EMAIL
              </Text>
              <View style={[styles.customInputWrapper, { backgroundColor: theme === 'dark' ? '#27272a' : '#f4f4f5' }]}>
                <Mail size={18} color="#9ca3af" style={{ marginRight: 10 }} />
                <TextInput
                  style={[styles.customInput, { color: theme === 'dark' ? '#ffffff' : '#000000' }]}
                  placeholder="your.email@gmail.com"
                  placeholderTextColor="#9ca3af"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={googleEmailInput}
                  onChangeText={setGoogleEmailInput}
                />
              </View>
            </View>

            {/* Confirm Google Sign-In Button */}
            <TouchableOpacity
              style={[
                styles.confirmGoogleBtn,
                { opacity: googleLoading || !googleEmailInput ? 0.6 : 1 },
              ]}
              disabled={googleLoading || !googleEmailInput}
              onPress={() => executeGoogleLogin(googleEmailInput)}
              activeOpacity={0.85}
            >
              {googleLoading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <>
                  <UserCheck size={18} color="#ffffff" style={{ marginRight: 8 }} />
                  <Text style={styles.confirmGoogleBtnText}>
                    Sign In as {googleEmailInput ? googleEmailInput : 'Google Account'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={{ alignSelf: 'center', marginTop: 14 }}
              onPress={() => setShowGoogleModal(false)}
            >
              <Text style={{ fontSize: 13, color: '#71717a', fontWeight: '600' }}>Cancel</Text>
            </TouchableOpacity>
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
  content: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 20,
    alignSelf: 'flex-start',
  },
  backText: {
    fontSize: 14,
    fontWeight: '600',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 28,
  },
  brandTextLarge: {
    fontSize: 38,
    fontWeight: '900',
    letterSpacing: -1,
    marginBottom: 4,
  },
  brandAbsLarge: {
    fontWeight: '900',
  },
  brandTractsLarge: {
    color: '#2563eb',
    fontWeight: '900',
  },
  tagline: {
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
    fontWeight: '500',
  },
  card: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 10,
    fontWeight: '800',
    marginBottom: 6,
    letterSpacing: 1.5,
  },
  input: {
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    borderWidth: 1,
  },
  submitBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  submitBtnText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 1,
  },
  submitIcon: {
    marginRight: 8,
  },

  // Divider
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginHorizontal: 10,
  },

  // Google Button
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingVertical: 15,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    gap: 10,
  },
  googleIcon: {
    width: 18,
    height: 18,
  },
  googleBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#1f2937',
    letterSpacing: 0.2,
  },

  switchBtn: {
    alignItems: 'center',
    marginTop: 20,
  },
  switchText: {
    fontSize: 13,
    fontWeight: '500',
  },
  guestBtn: {
    alignItems: 'center',
    marginTop: 24,
  },
  guestText: {
    fontSize: 14,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },

  // Google Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 36,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  modalHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  closeBtn: {
    padding: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    marginBottom: 16,
  },
  accountsList: {
    gap: 10,
    marginBottom: 16,
  },
  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 2,
  },
  accountAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  accountAvatarText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '800',
  },
  accountName: {
    fontSize: 15,
    fontWeight: '700',
  },
  accountEmail: {
    fontSize: 12,
    marginTop: 2,
  },
  accountNote: {
    fontSize: 10,
    color: '#2563eb',
    fontWeight: '700',
    marginTop: 2,
  },
  checkBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  customEmailBox: {
    marginBottom: 16,
  },
  customEmailLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  customInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  customInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  confirmGoogleBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  confirmGoogleBtnText: {
    color: '#ffffff',
    fontSize: 13.5,
    fontWeight: '800',
  },
});
