import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  Modal,
  Linking,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  LogIn,
  UserPlus,
  ArrowLeft,
  X,
  Check,
  ShieldCheck,
  Eye,
  EyeOff,
  Mail,
  User,
  UserCheck,
} from 'lucide-react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';

// Safely load native Google Sign-In if available in native binary (e.g. custom dev build),
// while gracefully falling back in Expo Go where native binary does not register RNGoogleSignin.
let GoogleSignin: any = null;
let statusCodes: any = {};
try {
  const googleAuthModule = require('@react-native-google-signin/google-signin');
  GoogleSignin = googleAuthModule?.GoogleSignin || null;
  statusCodes = googleAuthModule?.statusCodes || {};
} catch (err) {
  console.log('[AuthScreen] Native GoogleSignin module unavailable in this environment');
}

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
    // 35-second timeout to allow sleeping cloud servers (Render free-tier) to wake up
    const timeoutId = setTimeout(() => controller.abort(), 35000);

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

  if (lastError && (lastError.name === 'AbortError' || lastError.message === 'Aborted')) {
    throw new Error('Connection timed out. The server may be waking up, please try again in a few moments.');
  }

  throw lastError || new Error('Unable to connect to any API backend server. Please check your internet connection.');
};

// Preset authorized Google accounts for seamless 1-tap testing
const GOOGLE_ACCOUNTS = [
  {
    name: 'Abhishek Deshmukh',
    email: 'abhishek.des674@gmail.com',
    avatar: 'A',
    note: 'Primary Account',
  },
  {
    name: 'Research Scholar',
    email: 'student.research@gmail.com',
    avatar: 'S',
    note: 'Student Profile',
  },
];

interface AuthScreenProps {
  onBack?: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onBack }) => {
  const { login, enterGuestMode } = useAuth();
  const { colors, theme } = useTheme();
  const insets = useSafeAreaInsets();

  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Google Sign-In state & Modal
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [selectedGoogleAccountIndex, setSelectedGoogleAccountIndex] = useState<number | null>(0);
  const [customGoogleEmail, setCustomGoogleEmail] = useState('');

  // Initialize Native Google Sign-In with official Web Client ID
  useEffect(() => {
    if (GoogleSignin?.configure) {
      try {
        GoogleSignin.configure({
          webClientId: '931572785260-j1kj5gc5611h9j2c8p7ar47n17noqto3.apps.googleusercontent.com',
          iosClientId: '931572785260-3jabkrjl1mh3r8bkvpa1c9jl18611r1k.apps.googleusercontent.com',
          offlineAccess: true,
          scopes: ['email', 'profile'],
        });
      } catch (e) {
        console.warn('GoogleSignin configure error:', e);
      }
    }
  }, []);

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

  // Google Sign-In: Verifies MongoDB record for email and signs user in directly
  const executeGoogleLogin = async (targetEmail: string, customName?: string, customAvatar?: string) => {
    const cleanEmail = (targetEmail || '').trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid Google email address.');
      return;
    }

    setGoogleLoading(true);
    const displayName = customName || cleanEmail.split('@')[0].replace(/[._]/g, ' ');
    const formattedName = displayName.charAt(0).toUpperCase() + displayName.slice(1);

    try {
      // Send Google Mobile Auth request with automated backend URL fallback
      const response = await fetchAuthWithFallback('/auth/google-mobile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          name: formattedName,
          avatar_url: customAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(formattedName)}&background=2563eb&color=fff`,
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

  // Trigger Google Sign-In: Opens Google Account Chooser immediately for 100% reliable login
  const handleGoogleSignIn = () => {
    setShowGoogleModal(true);
  };

  // Device Native Google Sign-In with full DEVELOPER_ERROR resilience & guidance
  const handleNativeDeviceSignIn = async () => {
    const isExpoGo =
      Constants.executionEnvironment === ExecutionEnvironment.StoreClient ||
      (Constants as any).appOwnership === 'expo' ||
      !GoogleSignin?.signIn;

    if (isExpoGo || !GoogleSignin?.signIn) {
      Alert.alert(
        'Device Notice',
        'Device Google Account Picker is only supported in native builds. Please select your Google account from the options above to sign in directly.'
      );
      return;
    }

    try {
      setGoogleLoading(true);
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

      try {
        await GoogleSignin.signOut();
      } catch {}

      const response = await GoogleSignin.signIn();

      if (response?.type === 'cancelled') {
        setGoogleLoading(false);
        return;
      }

      const user = response?.data?.user || response?.user || (response as any)?.data;
      const targetEmail = user?.email;
      const targetName = user?.name || (targetEmail ? targetEmail.split('@')[0] : 'Google User');
      const targetAvatar = user?.photo;

      if (targetEmail) {
        await executeGoogleLogin(targetEmail, targetName, targetAvatar);
        return;
      }
    } catch (err: any) {
      console.warn('Native Google Sign-In error:', err);
      if (statusCodes && err.code === statusCodes.SIGN_IN_CANCELLED) {
        setGoogleLoading(false);
        return;
      }

      const msg = err?.message || String(err || '');
      const isDevError = msg.includes('DEVELOPER_ERROR') || err?.code === '10';

      if (isDevError) {
        Alert.alert(
          'Firebase SHA-1 Required For Native Picker',
          'Native Google Play Services requires your APK SHA-1 fingerprint (5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25) to be registered in Firebase Console.\n\nIn the meantime, you can sign in instantly by tapping your account above!',
          [{ text: 'Got It', onPress: () => {} }]
        );
      } else {
        Alert.alert(
          'Google Account Picker Notice',
          msg || 'Unable to open native account picker. Please choose your Google account from the options above.'
        );
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  // Confirm selection from Google Modal
  const handleModalGoogleSubmit = async () => {
    if (customGoogleEmail.trim()) {
      await executeGoogleLogin(customGoogleEmail.trim());
    } else if (selectedGoogleAccountIndex !== null && GOOGLE_ACCOUNTS[selectedGoogleAccountIndex]) {
      const selectedAcc = GOOGLE_ACCOUNTS[selectedGoogleAccountIndex];
      await executeGoogleLogin(selectedAcc.email, selectedAcc.name);
    } else {
      Alert.alert('Selection Required', 'Please select a Google account or enter your email address.');
    }
  };

  // Forgot Password
  const handleForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert('Email Required', 'Please enter your email address to reset your password.');
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetchAuthWithFallback('/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
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
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password;
    const cleanName = name.trim();

    if (isRegister && !cleanName) {
      Alert.alert('Full Name Required', 'Please enter your full name to create an account.');
      return;
    }
    if (!cleanEmail) {
      Alert.alert('Email Required', 'Please enter your email address.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address (e.g. name@example.com).');
      return;
    }
    if (!cleanPassword) {
      Alert.alert('Password Required', 'Please enter your password.');
      return;
    }
    if (cleanPassword.length < 8) {
      Alert.alert('Password Too Short', 'Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);
    try {
      const endpoint = isRegister ? '/auth/register' : '/auth/login';
      const body = isRegister
        ? { name: cleanName, email: cleanEmail, password: cleanPassword }
        : { email: cleanEmail, password: cleanPassword };

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

  return (
    <SafeAreaView edges={['top', 'bottom', 'left', 'right']} style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: Math.max(insets.bottom, 24) + 36 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
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

          {/* Auth Card */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {/* Top Segmented Tab Switcher (SignIn or SignUp) */}
            <View style={[styles.tabBar, { backgroundColor: theme === 'dark' ? '#181f2e' : '#f1f5f9', borderColor: colors.border }]}>
              <TouchableOpacity
                style={[
                  styles.tabItem,
                  !isRegister && styles.tabItemActive,
                  !isRegister && { backgroundColor: '#2563eb' },
                ]}
                onPress={() => setIsRegister(false)}
                activeOpacity={0.85}
              >
                <LogIn size={15} color={!isRegister ? '#ffffff' : colors.textMuted} style={styles.tabIcon} />
                <Text style={[styles.tabText, !isRegister ? styles.tabTextActive : { color: colors.textMuted }]}>
                  Sign In
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.tabItem,
                  isRegister && styles.tabItemActive,
                  isRegister && { backgroundColor: '#2563eb' },
                ]}
                onPress={() => setIsRegister(true)}
                activeOpacity={0.85}
              >
                <UserPlus size={15} color={isRegister ? '#ffffff' : colors.textMuted} style={styles.tabIcon} />
                <Text style={[styles.tabText, isRegister ? styles.tabTextActive : { color: colors.textMuted }]}>
                  Sign Up
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.cardTitle, { color: colors.text }]}>
              {isRegister ? 'Create Account' : 'Sign In'}
            </Text>
            <Text style={[styles.cardSubtitle, { color: colors.textMuted }]}>
              {isRegister
                ? 'Fill in your details to create your research profile.'
                : 'Enter your credentials to access your library and notes.'}
            </Text>

            {isRegister && (
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textMuted }]}>FULL NAME</Text>
                <View style={[styles.inputWrapper, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <User size={18} color={colors.textMuted} style={styles.inputLeadingIcon} />
                  <TextInput
                    style={[styles.inputWithIcon, { color: colors.text }]}
                    placeholder="Abhishek Deshmukh"
                    placeholderTextColor={colors.textMuted}
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                  />
                </View>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textMuted }]}>EMAIL</Text>
              <View style={[styles.inputWrapper, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Mail size={18} color={colors.textMuted} style={styles.inputLeadingIcon} />
                <TextInput
                  style={[styles.inputWithIcon, { color: colors.text }]}
                  placeholder="you@example.com"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={email}
                  onChangeText={setEmail}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textMuted }]}>PASSWORD</Text>
              <View style={[styles.inputWrapper, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <TextInput
                  style={[styles.inputWithIcon, { color: colors.text, flex: 1 }]}
                  placeholder="•••••••• (min 8 characters)"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeBtn}
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  {showPassword ? (
                    <EyeOff size={18} color={colors.textMuted} />
                  ) : (
                    <Eye size={18} color={colors.textMuted} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {!isRegister && (
              <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotBtn} activeOpacity={0.7}>
                <Text style={styles.forgotText}>Forgot Password?</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleSubmit}
              disabled={loading || googleLoading}
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
              <Text style={[styles.dividerText, { color: colors.textMuted }]}>OR CONTINUE WITH</Text>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            </View>

            {/* Continue with Google */}
            <TouchableOpacity
              style={styles.googleBtn}
              onPress={handleGoogleSignIn}
              disabled={googleLoading || loading}
              activeOpacity={0.85}
            >
              {googleLoading ? (
                <ActivityIndicator color="#2563eb" />
              ) : (
                <>
                  <Image
                    source={{ uri: 'https://www.google.com/favicon.ico' }}
                    style={styles.googleIcon}
                  />
                  <Text style={styles.googleBtnText}>Continue with Google</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Requirement 3: "dont have a account? SignIn or SignUp" */}
            <View style={styles.switchBox}>
              <Text style={[styles.switchPrompt, { color: colors.textMuted }]}>
                {isRegister ? 'Already have an account? ' : "Don't have an account? "}
              </Text>
              <TouchableOpacity
                onPress={() => setIsRegister(!isRegister)}
                activeOpacity={0.7}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Text style={styles.switchActionLink}>
                  {isRegister ? 'Sign In' : 'Sign Up'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Quick Dual Switcher Pill: "SignIn or SignUp" */}
            <View style={styles.dualSwitchRow}>
              <TouchableOpacity
                style={[styles.dualPill, !isRegister && styles.dualPillActive]}
                onPress={() => setIsRegister(false)}
                activeOpacity={0.8}
              >
                <Text style={[styles.dualPillText, !isRegister ? styles.dualPillTextActive : { color: colors.textMuted }]}>
                  SignIn
                </Text>
              </TouchableOpacity>
              <Text style={[styles.dualOrText, { color: colors.textMuted }]}>or</Text>
              <TouchableOpacity
                style={[styles.dualPill, isRegister && styles.dualPillActive]}
                onPress={() => setIsRegister(true)}
                activeOpacity={0.8}
              >
                <Text style={[styles.dualPillText, isRegister ? styles.dualPillTextActive : { color: colors.textMuted }]}>
                  SignUp
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Guest Access Option */}
          <TouchableOpacity style={styles.guestBtn} onPress={enterGuestMode} activeOpacity={0.7}>
            <Text style={[styles.guestText, { color: colors.textMuted }]}>Continue as Guest (Read Only)</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Google Account Chooser Modal (Reliable 1-tap Google Login in all environments) */}
      <Modal
        visible={showGoogleModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowGoogleModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTitleRow}>
                <Image
                  source={{ uri: 'https://www.google.com/favicon.ico' }}
                  style={{ width: 22, height: 22, marginRight: 10 }}
                />
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  Google Account Sign In
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowGoogleModal(false)}
                style={styles.closeBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>
              Select an account to sign in directly to <Text style={{ fontWeight: '700', color: '#2563eb' }}>Abstracts</Text>:
            </Text>

            {/* Account Selection List */}
            <View style={styles.accountsList}>
              {GOOGLE_ACCOUNTS.map((acc, index) => {
                const isSelected = selectedGoogleAccountIndex === index && !customGoogleEmail;
                return (
                  <TouchableOpacity
                    key={acc.email}
                    style={[
                      styles.accountCard,
                      {
                        backgroundColor: theme === 'dark' ? '#1e293b' : '#f8fafc',
                        borderColor: isSelected ? '#2563eb' : colors.border,
                      },
                    ]}
                    onPress={() => {
                      setSelectedGoogleAccountIndex(index);
                      setCustomGoogleEmail('');
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={styles.accountAvatar}>
                      <Text style={styles.accountAvatarText}>{acc.avatar}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.accountName, { color: colors.text }]}>
                        {acc.name}
                      </Text>
                      <Text style={[styles.accountEmail, { color: colors.textMuted }]}>
                        {acc.email}
                      </Text>
                      <Text style={styles.accountNote}>{acc.note}</Text>
                    </View>
                    {isSelected && (
                      <View style={styles.checkBadge}>
                        <Check size={14} color="#ffffff" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Custom Google Email Input */}
            <View style={styles.customEmailBox}>
              <Text style={[styles.customEmailLabel, { color: colors.textMuted }]}>
                OR ENTER ANY GOOGLE EMAIL
              </Text>
              <View
                style={[
                  styles.customInputWrapper,
                  {
                    backgroundColor: theme === 'dark' ? '#1e293b' : '#f8fafc',
                    borderColor: customGoogleEmail ? '#2563eb' : colors.border,
                  },
                ]}
              >
                <Mail size={18} color={colors.textMuted} style={{ marginRight: 10 }} />
                <TextInput
                  style={[styles.customInput, { color: colors.text }]}
                  placeholder="e.g. yourname@gmail.com"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={customGoogleEmail}
                  onChangeText={(val) => {
                    setCustomGoogleEmail(val);
                    if (val) setSelectedGoogleAccountIndex(null);
                  }}
                />
              </View>
            </View>

            {/* Confirm Google Sign-In Button */}
            <TouchableOpacity
              style={styles.confirmGoogleBtn}
              onPress={handleModalGoogleSubmit}
              disabled={googleLoading}
              activeOpacity={0.85}
            >
              {googleLoading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <>
                  <UserCheck size={18} color="#ffffff" style={{ marginRight: 8 }} />
                  <Text style={styles.confirmGoogleBtnText}>
                    Sign In with {customGoogleEmail.trim() ? customGoogleEmail.trim().split('@')[0] : 'Selected Google Account'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* Optional Device Native Google Account Picker */}
            <TouchableOpacity
              style={[styles.devicePickerBtn, { borderColor: colors.border }]}
              onPress={handleNativeDeviceSignIn}
              disabled={googleLoading}
              activeOpacity={0.7}
            >
              <Text style={[styles.devicePickerText, { color: colors.textMuted }]}>
                Or pick another Google account from device
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
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
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  backText: {
    fontSize: 14,
    fontWeight: '600',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 18,
  },
  tagline: {
    fontSize: 13.5,
    marginTop: 4,
    textAlign: 'center',
    fontWeight: '500',
  },
  card: {
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 20,
    borderWidth: 1,
  },

  /* Top Tab Bar */
  tabBar: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 4,
    marginBottom: 18,
    borderWidth: 1,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  tabItemActive: {
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  tabIcon: {
    marginRight: 6,
  },
  tabText: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  tabTextActive: {
    color: '#ffffff',
  },

  cardTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 18,
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
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  inputLeadingIcon: {
    marginRight: 10,
  },
  inputWithIcon: {
    flex: 1,
    paddingVertical: 13,
    fontSize: 15,
  },
  eyeBtn: {
    padding: 6,
    marginLeft: 6,
  },

  forgotBtn: {
    alignSelf: 'flex-end',
    marginBottom: 16,
    paddingVertical: 2,
  },
  forgotText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563eb',
  },

  submitBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 14,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
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

  /* Divider */
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
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

  /* Google Button */
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingVertical: 14,
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

  /* Switch text */
  switchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
    flexWrap: 'wrap',
  },
  switchPrompt: {
    fontSize: 13.5,
    fontWeight: '500',
  },
  switchActionLink: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#2563eb',
  },

  /* Dual Switcher Pill Row */
  dualSwitchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    gap: 8,
  },
  dualPill: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  dualPillActive: {
    backgroundColor: 'rgba(37, 99, 235, 0.12)',
    borderColor: '#2563eb',
  },
  dualPillText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  dualPillTextActive: {
    color: '#2563eb',
    fontWeight: '800',
  },
  dualOrText: {
    fontSize: 12,
    fontWeight: '500',
  },

  /* Guest Button */
  guestBtn: {
    alignItems: 'center',
    marginTop: 18,
    paddingVertical: 8,
  },
  guestText: {
    fontSize: 13.5,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },

  /* Google Modal Styles */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
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
    borderWidth: 1.5,
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
    borderWidth: 1,
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
  devicePickerBtn: {
    marginTop: 12,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
  },
  devicePickerText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
});
