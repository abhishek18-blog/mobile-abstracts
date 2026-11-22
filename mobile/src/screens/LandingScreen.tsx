import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  ScrollView,
  FlatList,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowRight,
  Search,
  BookOpen,
  FolderKanban,
  Sparkles,
  Globe,
} from 'lucide-react-native';
import Svg, {
  Path,
  Defs,
  LinearGradient,
  Stop,
  G,
  Circle,
} from 'react-native-svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DESIGN TOKENS — Dark-mode landing aesthetic
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const C = {
  bg: '#0B0F17',
  card: '#161E2E',
  cardBorder: '#232E42',
  accent: '#2563EB',
  accentLight: '#3B82F6',
  textPrimary: '#F8FAFC',
  textMuted: '#94A3B8',
  dotInactive: 'rgba(59, 130, 246, 0.25)',
  ghostBorder: 'rgba(148, 163, 184, 0.30)',
} as const;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CAROUSEL DATA — purely informational, no action links
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
interface SlideData {
  id: string;
  badge: string;
  title: string;
  body: string;
  Icon: typeof Search;
}

const SLIDES: SlideData[] = [
  {
    id: 'discover',
    badge: 'Discover',
    title: 'Discover\nResearch',
    body: 'Search millions of research papers by topic, author, or keyword — powered by smart semantic search.',
    Icon: Search,
  },
  {
    id: 'read',
    badge: 'Read',
    title: 'Read &\nBookmark',
    body: 'Dive into full abstracts, track your reading progress, and bookmark papers that matter to you.',
    Icon: BookOpen,
  },
  {
    id: 'collaborate',
    badge: 'Collaborate',
    title: 'Collaborate\nWorldwide',
    body: 'Join research communities, share insights, and discuss findings with fellow academics worldwide.',
    Icon: Globe,
  },
  {
    id: 'projects',
    badge: 'Projects',
    title: 'Organize\nYour Work',
    body: 'Organize papers into focused projects, monitor citations, and build your personal research library.',
    Icon: FolderKanban,
  },
];

const CARD_H_PAD = 24;
const SLIDE_WIDTH = SCREEN_WIDTH - CARD_H_PAD * 2;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// INLINE LOGO ICON (open-book glyph rendered via SVG — no external asset)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const LogoIcon: React.FC<{ size?: number }> = ({ size = 28 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Defs>
      <LinearGradient id="logoGrad" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0%" stopColor="#60A5FA" />
        <Stop offset="100%" stopColor="#2563EB" />
      </LinearGradient>
    </Defs>
    <Path
      d="M2 4.5C2 3.67 2.67 3 3.5 3H8c1.25 0 2.5.5 3.5 1.5A6.1 6.1 0 0115 3h4.5c.83 0 1.5.67 1.5 1.5v13c0 .83-.67 1.5-1.5 1.5H15c-1 0-2 .4-2.75 1.1a.5.5 0 01-.5 0C11 19.4 10 19 9 19H3.5A1.5 1.5 0 012 17.5V4.5z"
      fill="url(#logoGrad)"
      opacity={0.9}
    />
    <Path
      d="M12 5.5V19"
      stroke="#F8FAFC"
      strokeWidth={1.4}
      strokeLinecap="round"
      opacity={0.6}
    />
  </Svg>
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PROPS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
interface LandingScreenProps {
  onGetStarted: () => void;
  onGuestAccess: () => void;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// COMPONENT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const LandingScreen: React.FC<LandingScreenProps> = ({
  onGetStarted,
  onGuestAccess,
}) => {
  const insets = useSafeAreaInsets();

  // ── Entrance Animations ───────────────────────────────────────────────────
  const heroOpacity = useRef(new Animated.Value(0)).current;
  const heroSlide = useRef(new Animated.Value(28)).current;
  const carouselOpacity = useRef(new Animated.Value(0)).current;
  const carouselSlide = useRef(new Animated.Value(36)).current;
  const ctaOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(220, [
      Animated.parallel([
        Animated.timing(heroOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(heroSlide, { toValue: 0, duration: 600, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(carouselOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(carouselSlide, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]),
      Animated.timing(ctaOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  // ── Carousel State ────────────────────────────────────────────────────────
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<FlatList<SlideData>>(null);

  // Auto-advance every 5 s
  useEffect(() => {
    const id = setInterval(() => {
      setActiveIndex((prev) => {
        const next = (prev + 1) % SLIDES.length;
        listRef.current?.scrollToOffset({ offset: SLIDE_WIDTH * next, animated: true });
        return next;
      });
    }, 5000);
    return () => clearInterval(id);
  }, []);

  const onScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const idx = Math.round(e.nativeEvent.contentOffset.x / SLIDE_WIDTH);
      setActiveIndex(Math.max(0, Math.min(idx, SLIDES.length - 1)));
    },
    [],
  );

  // ── Render Slide ──────────────────────────────────────────────────────────
  const renderSlide = useCallback(({ item }: { item: SlideData }) => {
    const { Icon } = item;
    return (
      <View style={[styles.card, { width: SLIDE_WIDTH }]}>
        {/* Icon badge */}
        <View style={styles.cardIconWrap}>
          <Icon size={26} color={C.accentLight} />
        </View>

        {/* Badge label */}
        <View style={styles.cardBadge}>
          <Text style={styles.cardBadgeText}>{item.badge}</Text>
        </View>

        {/* Title + body */}
        <Text style={styles.cardTitle}>{item.title}</Text>
        <Text style={styles.cardBody}>{item.body}</Text>
      </View>
    );
  }, []);

  // ── Main Render ───────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      {/* Ambient background glows */}
      <View style={styles.glowTopLeft} />
      <View style={styles.glowBottomRight} />

      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: Math.max(insets.bottom, 20) + 12 }]}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* ── HEADER ──────────────────────────────────────────────────── */}
          <Animated.View
            style={[
              styles.header,
              { opacity: heroOpacity, transform: [{ translateY: heroSlide }] },
            ]}
          >
            <View style={styles.headerBrand}>
              <LogoIcon size={30} />
              <Text style={styles.headerTitle}>
                Abs<Text style={styles.headerTitleAccent}>tracts</Text>
              </Text>
            </View>
          </Animated.View>

          {/* ── HERO ────────────────────────────────────────────────────── */}
          <Animated.View
            style={[
              styles.hero,
              { opacity: heroOpacity, transform: [{ translateY: heroSlide }] },
            ]}
          >
            <Text style={styles.heroHeadline}>
              Discover. Read.{'\n'}
              <Text style={styles.heroAccent}>Collaborate.</Text>
            </Text>
            <Text style={styles.heroSub}>
              Your all-in-one research platform to find papers, join
              discussions, and get paper recommendations.
            </Text>
          </Animated.View>

          {/* ── CAROUSEL ────────────────────────────────────────────────── */}
          <Animated.View
            style={{
              opacity: carouselOpacity,
              transform: [{ translateY: carouselSlide }],
            }}
          >
            <FlatList
              ref={listRef}
              data={SLIDES}
              renderItem={renderSlide}
              keyExtractor={(s) => s.id}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              snapToAlignment="center"
              contentContainerStyle={{ paddingHorizontal: CARD_H_PAD }}
              onMomentumScrollEnd={onScrollEnd}
              getItemLayout={(_, index) => ({
                length: SLIDE_WIDTH,
                offset: SLIDE_WIDTH * index,
                index,
              })}
            />

            {/* Dot indicators */}
            <View style={styles.dots}>
              {SLIDES.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    i === activeIndex ? styles.dotActive : styles.dotInactive,
                  ]}
                />
              ))}
            </View>
          </Animated.View>

          {/* ── CTA BUTTONS ─────────────────────────────────────────────── */}
          <Animated.View style={[styles.ctaBlock, { opacity: ctaOpacity }]}>
            {/* Primary: Get Started → auth */}
            <TouchableOpacity
              style={styles.btnPrimary}
              onPress={onGetStarted}
              activeOpacity={0.88}
            >
              <Text style={styles.btnPrimaryText}>Get Started</Text>
              <ArrowRight size={18} color="#ffffff" />
            </TouchableOpacity>

            {/* Secondary: Explore Papers → guest */}
            <TouchableOpacity
              style={styles.btnGhost}
              onPress={onGuestAccess}
              activeOpacity={0.75}
            >
              <Search size={17} color={C.textMuted} />
              <Text style={styles.btnGhostText}>Explore Papers</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* ── FOOTER TAGLINE ──────────────────────────────────────────── */}
          <View style={styles.footer}>
            <View style={styles.footerRule} />
            <Text style={styles.footerText}>Built for curious minds</Text>
            <View style={styles.footerRule} />
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STYLES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const styles = StyleSheet.create({
  /* ── Layout ────────────────────────────────────────────────────────────── */
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  safe: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
  },

  /* ── Ambient Glows ─────────────────────────────────────────────────────── */
  glowTopLeft: {
    position: 'absolute',
    top: -SCREEN_WIDTH * 0.25,
    left: -SCREEN_WIDTH * 0.3,
    width: SCREEN_WIDTH * 0.9,
    height: SCREEN_WIDTH * 0.9,
    borderRadius: SCREEN_WIDTH * 0.45,
    backgroundColor: 'rgba(37, 99, 235, 0.14)',
  },
  glowBottomRight: {
    position: 'absolute',
    bottom: -SCREEN_WIDTH * 0.15,
    right: -SCREEN_WIDTH * 0.25,
    width: SCREEN_WIDTH * 0.8,
    height: SCREEN_WIDTH * 0.8,
    borderRadius: SCREEN_WIDTH * 0.4,
    backgroundColor: 'rgba(99, 102, 241, 0.09)',
  },

  /* ── Header ────────────────────────────────────────────────────────────── */
  header: {
    paddingHorizontal: CARD_H_PAD,
    paddingTop: 12,
    marginBottom: 28,
  },
  headerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: C.textPrimary,
    letterSpacing: -0.4,
  },
  headerTitleAccent: {
    color: C.accentLight,
  },

  /* ── Hero ───────────────────────────────────────────────────────────────── */
  hero: {
    paddingHorizontal: CARD_H_PAD,
    marginBottom: 28,
  },
  heroHeadline: {
    fontSize: 36,
    fontWeight: '900',
    color: C.textPrimary,
    lineHeight: 44,
    letterSpacing: -1,
    marginBottom: 12,
  },
  heroAccent: {
    color: C.accentLight,
  },
  heroSub: {
    fontSize: 15,
    fontWeight: '400',
    color: C.textMuted,
    lineHeight: 23,
  },

  /* ── Carousel Cards ────────────────────────────────────────────────────── */
  card: {
    backgroundColor: C.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.cardBorder,
    padding: 22,
  },
  cardIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(37, 99, 235, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  cardBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(59, 130, 246, 0.14)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 10,
  },
  cardBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: C.accentLight,
    letterSpacing: 0.4,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: C.textPrimary,
    lineHeight: 28,
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  cardBody: {
    fontSize: 13.5,
    fontWeight: '400',
    color: C.textMuted,
    lineHeight: 20,
  },

  /* ── Dot Indicators ────────────────────────────────────────────────────── */
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 18,
    gap: 7,
  },
  dot: {
    height: 7,
    borderRadius: 3.5,
  },
  dotActive: {
    width: 22,
    backgroundColor: C.accent,
  },
  dotInactive: {
    width: 7,
    backgroundColor: C.dotInactive,
  },

  /* ── CTA Buttons ───────────────────────────────────────────────────────── */
  ctaBlock: {
    paddingHorizontal: CARD_H_PAD,
    marginTop: 32,
    gap: 12,
  },
  btnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.accent,
    paddingVertical: 17,
    borderRadius: 16,
    gap: 10,
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  },
  btnPrimaryText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.2,
  },
  btnGhost: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.ghostBorder,
    gap: 9,
  },
  btnGhostText: {
    fontSize: 15,
    fontWeight: '700',
    color: C.textMuted,
    letterSpacing: 0.1,
  },

  /* ── Footer ────────────────────────────────────────────────────────────── */
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 36,
    paddingHorizontal: 36,
    gap: 12,
  },
  footerRule: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: C.cardBorder,
  },
  footerText: {
    fontSize: 12,
    fontWeight: '500',
    color: C.textMuted,
    fontStyle: 'italic',
  },
});
