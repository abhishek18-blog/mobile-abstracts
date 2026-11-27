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
  Linking,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import {
  LogIn,
  UserPlus,
  ArrowLeft,
  Eye,
  EyeOff,
  Mail,
  User,
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

// Google 4-Color 'G' Logo (Inline SVG, 100% reliable offline)
const GoogleIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" style={{ marginRight: 10 }}>
    <Path
      fill="#4285F4"
      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.66-5.18 3.66-9.15z"
    />
    <Path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
    />
    <Path
      fill="#FBBC05"
      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
    />
    <Path
      fill="#EA4335"
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
    />
  </Svg>
);

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

  // Google Sign-In state
  const [googleLoading, setGoogleLoading] = useState(false);

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

  // Direct native Google Sign-In with device account picker
  const handleGoogleSignIn = async () => {
    if (!GoogleSignin?.signIn) {
      Alert.alert(
        'Google Sign-In Unavailable',
        'Google Sign-In is only available in standalone builds.'
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
      } else {
        throw new Error('No email found for this Google account.');
      }
    } catch (err: any) {
      console.warn('Native Google Sign-In error:', err);
      if (statusCodes && err.code === statusCodes.SIGN_IN_CANCELLED) {
        setGoogleLoading(false);
        return;
      }
      Alert.alert(
        'Google Sign-In Error',
        err?.message || 'Unable to complete Google Sign-In. Please try again.'
      );
    } finally {
      setGoogleLoading(false);
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
                  <GoogleIcon size={20} />
                  <Text style={styles.googleBtnText}>Continue with Google</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Guest Access Option */}
          <TouchableOpacity style={styles.guestBtn} onPress={enterGuestMode} activeOpacity={0.7}>
            <Text style={[styles.guestText, { color: colors.textMuted }]}>Continue as Guest (Read Only)</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
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
  googleBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#1f2937',
    letterSpacing: 0.2,
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
});
