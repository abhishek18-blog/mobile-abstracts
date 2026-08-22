import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
  StatusBar,
} from 'react-native';
import { Sparkles, Brain, Compass, BookOpen } from 'lucide-react-native';
import { AbstractsLogo } from '../components/AbstractsLogo';

const { width } = Dimensions.get('window');

interface SplashScreenProps {
  onFinish?: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  // Animation values
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const spinValue = useRef(new Animated.Value(0)).current;
  const pulseValue = useRef(new Animated.Value(1)).current;
  const progressWidth = useRef(new Animated.Value(0)).current;

  // Status text cycling state
  const [statusText, setStatusText] = useState('Initializing Abstracts Research Hub...');

  useEffect(() => {
    // 1. Entrance animation for Logo
    Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

    // 2. Creative Spinner Continuous Rotation
    Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 2200,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // 3. Creative Pulsing Ring
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseValue, {
          toValue: 1.15,
          duration: 1100,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseValue, {
          toValue: 1,
          duration: 1100,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // 4. Progress bar filling animation
    Animated.timing(progressWidth, {
      toValue: 1,
      duration: 600,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();

    // Cycling status messages
    const timer1 = setTimeout(() => {
      setStatusText('Connecting to Semantic Scholar & OpenAlex APIs...');
    }, 200);

    const timer2 = setTimeout(() => {
      setStatusText('Preparing Personalized Discovery Feed...');
    }, 400);

    const timerFinish = setTimeout(() => {
      if (onFinish) {
        onFinish();
      }
    }, 600);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timerFinish);
    };
  }, []);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const reverseSpin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['360deg', '0deg'],
  });

  const progressInterpolate = progressWidth.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#070a14" translucent={false} />

      {/* Deep Space Background Glows */}
      <View style={styles.bgBase} />
      <View style={styles.glowPrimary} />
      <View style={styles.glowSecondary} />

      <View style={styles.content}>
        {/* Animated Brand Logo Container */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: logoOpacity,
              transform: [{ scale: logoScale }],
            },
          ]}
        >
          <Animated.View
            style={[
              styles.logoGlowRing,
              {
                transform: [{ scale: pulseValue }],
              },
            ]}
          />
          <AbstractsLogo
            width={width * 0.65}
            height={(width * 0.65) * (90 / 340)}
            textColor="#FFFFFF"
            primaryColor="#2F6FED"
          />
        </Animated.View>

        {/* Creative Orbiting Spinner Component */}
        <View style={styles.spinnerWrapper}>
          {/* Outer Rotating Dotted Ring */}
          <Animated.View
            style={[
              styles.outerSpinRing,
              {
                transform: [{ rotate: spin }],
              },
            ]}
          >
            <View style={[styles.orbitDot, { top: -4, left: '50%', marginLeft: -4, backgroundColor: '#38bdf8' }]} />
            <View style={[styles.orbitDot, { bottom: -4, left: '50%', marginLeft: -4, backgroundColor: '#818cf8' }]} />
            <View style={[styles.orbitDot, { left: -4, top: '50%', marginTop: -4, backgroundColor: '#c084fc' }]} />
            <View style={[styles.orbitDot, { right: -4, top: '50%', marginTop: -4, backgroundColor: '#22d3ee' }]} />
          </Animated.View>

          {/* Inner Counter-Rotating Ring */}
          <Animated.View
            style={[
              styles.innerSpinRing,
              {
                transform: [{ rotate: reverseSpin }],
              },
            ]}
          />

          {/* Center Glowing Icon */}
          <View style={styles.centerIconBox}>
            <Brain size={22} color="#2F6FED" />
          </View>
        </View>

        {/* Status Text & Progress Bar */}
        <View style={styles.footerInfo}>
          <Text style={styles.statusText}>{statusText}</Text>
          <View style={styles.progressBarTrack}>
            <Animated.View style={[styles.progressBarFill, { width: progressInterpolate }]} />
          </View>
          <View style={styles.taglineRow}>
            <Sparkles size={14} color="#2F6FED" style={{ marginRight: 6 }} />
            <Text style={styles.taglineText}>Research Paper Discovery Platform</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070a14',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bgBase: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#070a14',
  },
  glowPrimary: {
    position: 'absolute',
    top: '25%',
    left: '10%',
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: width * 0.4,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
  },
  glowSecondary: {
    position: 'absolute',
    bottom: '20%',
    right: '10%',
    width: width * 0.7,
    height: width * 0.7,
    borderRadius: width * 0.35,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    width: '100%',
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 50,
    position: 'relative',
    padding: 16,
  },
  logoGlowRing: {
    position: 'absolute',
    width: width * 0.78,
    height: width * 0.26,
    borderRadius: 24,
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
  },
  spinnerWrapper: {
    width: 90,
    height: 90,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 44,
    position: 'relative',
  },
  outerSpinRing: {
    width: 86,
    height: 86,
    borderRadius: 43,
    borderWidth: 2.5,
    borderColor: 'rgba(56, 189, 248, 0.25)',
    borderStyle: 'dashed',
    position: 'absolute',
  },
  innerSpinRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderTopColor: '#2F6FED',
    borderRightColor: '#818cf8',
    borderBottomColor: 'transparent',
    borderLeftColor: 'transparent',
    position: 'absolute',
  },
  orbitDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    position: 'absolute',
  },
  centerIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2a66dfff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 6,
  },
  footerInfo: {
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 20,
  },
  statusText: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 13.5,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: 0.2,
  },
  progressBarTrack: {
    width: width * 0.65,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 20,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#2F6FED',
    borderRadius: 2,
  },
  taglineRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  taglineText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
  },
});
