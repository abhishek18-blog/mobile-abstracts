import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Dimensions,
  Animated,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowRight,
  ChevronRight,
  Search,
  Brain,
  Users,
} from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

interface LandingScreenProps {
  onGetStarted: () => void;
  onGuestAccess: () => void;
}

export const LandingScreen: React.FC<LandingScreenProps> = ({
  onGetStarted,
  onGuestAccess,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(25)).current;
  const cardFade = useRef(new Animated.Value(0)).current;
  const cardSlide = useRef(new Animated.Value(40)).current;
  const featureFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(cardFade, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(cardSlide, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(featureFade, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#070a14" translucent={false} />

      {/* Deep Space Background Glows (Matching Web App) */}
      <View style={styles.bgBase} />
      <View style={styles.glowIndigo} />
      <View style={styles.glowBlue} />
      <View style={styles.glowPurple} />

      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header / Navbar - Matching Web Floating Navbar */}
          <View style={styles.navBar}>
            <View style={styles.navPill}>
              {/* Brand Logo - Abs in dark navy, tracts in electric blue */}
              <Text style={styles.brandText}>
                <Text style={styles.brandAbs}>Abs</Text>
                <Text style={styles.brandTracts}>tracts</Text>
              </Text>
              
              <View style={styles.navActions}>
                <TouchableOpacity 
                  onPress={onGuestAccess} 
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.navGuestLink}>Explore as Guest</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.signInBtn}
                  onPress={onGetStarted}
                  activeOpacity={0.85}
                >
                  <Text style={styles.signInText}>Sign In</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Hero Section */}
          <Animated.View
            style={[
              styles.heroSection,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <Text style={styles.heroTitle}>
              Accelerate your{'\n'}
              <Text style={styles.heroTitleHighlight}>discovery process.</Text>
            </Text>

            <Text style={styles.heroSubtitle}>
              The all-in-one workspace for researchers. Leverage advanced AI to
              synthesize papers, uncover insights, and collaborate with brilliant
              minds worldwide.
            </Text>

            {/* CTA Buttons */}
            <View style={styles.ctaContainer}>
              <TouchableOpacity
                style={styles.primaryCta}
                onPress={onGetStarted}
                activeOpacity={0.9}
              >
                <Text style={styles.primaryCtaText}>Start researching</Text>
                <ArrowRight size={17} color="#0f172a" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryCta}
                onPress={onGuestAccess}
                activeOpacity={0.8}
              >
                <Text style={styles.secondaryCtaText}>Try without account</Text>
                <ChevronRight size={17} color="rgba(255,255,255,0.6)" />
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* Paper Interactive Preview Card (Web Mockup Parity) */}
          <Animated.View
            style={[
              styles.previewCardContainer,
              {
                opacity: cardFade,
                transform: [{ translateY: cardSlide }],
              },
            ]}
          >
            <View style={styles.previewCardInner}>
              {/* Window Header Dots */}
              <View style={styles.previewWindowHeader}>
                <View style={styles.previewDots}>
                  <View style={[styles.dot, { backgroundColor: '#f87171' }]} />
                  <View style={[styles.dot, { backgroundColor: '#fbbf24' }]} />
                  <View style={[styles.dot, { backgroundColor: '#4ade80' }]} />
                </View>
                <View style={styles.previewHeaderTitleBox}>
                  <Search size={13} color="#3b82f6" style={{ marginRight: 6 }} />
                  <Text style={styles.previewHeaderTitle}>Paper Details</Text>
                </View>
              </View>

              {/* Paper Content Body */}
              <View style={styles.previewBody}>
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryBadgeText}>Computer Science · AI</Text>
                </View>
                
                <Text style={styles.paperTitle}>Attention Is All You Need</Text>
                <Text style={styles.paperAuthors}>
                  Ashish Vaswani, Noam Shazeer, Niki Parmar, Jakob Uszkoreit...
                </Text>

                <Text style={styles.abstractHeading}>ABSTRACT</Text>
                <Text style={styles.abstractBodyText} numberOfLines={4}>
                  The dominant sequence transduction models are based on complex recurrent
                  or convolutional neural networks that include an encoder and a decoder.
                  We propose a new simple network architecture, the Transformer, based solely
                  on attention mechanisms...
                </Text>

                {/* AI Assistant Icon Badge */}
                <View style={styles.aiBadgeFloat}>
                  <Brain size={20} color="#ffffff" />
                </View>
              </View>
            </View>
          </Animated.View>

          {/* Features Section */}
          <Animated.View style={[styles.featuresSection, { opacity: featureFade }]}>
            <View style={styles.featuresHeader}>
              <Text style={styles.featuresTitle}>Built for modern researchers</Text>
              <Text style={styles.featuresSubtitle}>
                Everything you need to discover, understand, and organize scientific
                knowledge in one unified platform.
              </Text>
            </View>

            <View style={styles.featureCardsStack}>
              {/* Feature 1: Semantic Discovery */}
              <FeatureCard
                icon={<Search size={22} color="#22d3ee" />}
                title="Semantic Discovery"
                description="Go beyond keyword search. Find highly relevant papers based on contextual meaning and conceptual overlap."
                iconBg="rgba(6, 182, 212, 0.15)"
                borderColor="rgba(6, 182, 212, 0.35)"
                glowColor="rgba(34, 211, 238, 0.08)"
              />

              {/* Feature 2: AI Assistant */}
              <FeatureCard
                icon={<Brain size={22} color="#e879f9" />}
                title="AI Assistant"
                description="Chat with any paper. Extract methodologies, summarize findings, and clarify complex math instantly."
                iconBg="rgba(168, 85, 247, 0.15)"
                borderColor="rgba(168, 85, 247, 0.35)"
                glowColor="rgba(232, 121, 249, 0.08)"
              />

              {/* Feature 3: Collaborative Hub */}
              <FeatureCard
                icon={<Users size={22} color="#34d399" />}
                title="Collaborative Hub"
                description="Share libraries, annotate papers together, and discuss findings with your peers in real-time."
                iconBg="rgba(16, 185, 129, 0.15)"
                borderColor="rgba(16, 185, 129, 0.35)"
                glowColor="rgba(52, 211, 153, 0.08)"
              />
            </View>
          </Animated.View>

          {/* Footer Branding */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Abstracts Research Platform © 2026</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

// Feature Card Component
const FeatureCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
  iconBg: string;
  borderColor: string;
  glowColor: string;
}> = ({ icon, title, description, iconBg, borderColor, glowColor }) => (
  <View style={[styles.featureCard, { borderColor, backgroundColor: glowColor }]}>
    <View style={[styles.featureIconWrapper, { backgroundColor: iconBg }]}>
      {icon}
    </View>
    <Text style={styles.featureCardTitle}>{title}</Text>
    <Text style={styles.featureCardDescription}>{description}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070a14',
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 18,
  },

  // Deep Space Ambient Glow Background Effects
  bgBase: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#070a14',
  },
  glowIndigo: {
    position: 'absolute',
    top: -height * 0.1,
    left: -width * 0.25,
    width: width * 0.95,
    height: width * 0.95,
    borderRadius: width * 0.48,
    backgroundColor: 'rgba(79, 70, 229, 0.22)',
  },
  glowBlue: {
    position: 'absolute',
    top: height * 0.15,
    right: -width * 0.3,
    width: width * 0.85,
    height: width * 0.85,
    borderRadius: width * 0.42,
    backgroundColor: 'rgba(37, 99, 235, 0.18)',
  },
  glowPurple: {
    position: 'absolute',
    bottom: height * 0.05,
    left: -width * 0.2,
    width: width * 0.75,
    height: width * 0.75,
    borderRadius: width * 0.38,
    backgroundColor: 'rgba(147, 51, 234, 0.12)',
  },

  // Navbar Styling (Web Parity)
  navBar: {
    marginTop: 8,
    marginBottom: 24,
  },
  navPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
  },
  brandText: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  brandAbs: {
    color: '#0f172a',
  },
  brandTracts: {
    color: '#2563eb',
  },
  navActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  navGuestLink: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  signInBtn: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 999,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  signInText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },

  // Hero Section
  heroSection: {
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 24,
  },
  heroTitle: {
    fontSize: 36,
    fontWeight: '900',
    color: '#ffffff',
    textAlign: 'center',
    lineHeight: 44,
    letterSpacing: -1,
  },
  heroTitleHighlight: {
    color: '#38bdf8',
    fontWeight: '900',
  },
  heroSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.72)',
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 14,
    marginBottom: 26,
    paddingHorizontal: 8,
    fontWeight: '400',
  },

  // CTAs
  ctaContainer: {
    flexDirection: 'column',
    width: '100%',
    gap: 10,
    alignItems: 'center',
  },
  primaryCta: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 15,
    borderRadius: 999,
    gap: 8,
    shadowColor: '#ffffff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  primaryCtaText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  secondaryCta: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    paddingVertical: 14,
    borderRadius: 999,
    gap: 6,
  },
  secondaryCtaText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },

  // Preview Mockup Card (Web Matching)
  previewCardContainer: {
    marginTop: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    padding: 6,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.4,
    shadowRadius: 32,
    elevation: 16,
  },
  previewCardInner: {
    borderRadius: 16,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
  },
  previewWindowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  previewDots: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
  },
  previewHeaderTitleBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewHeaderTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1e293b',
  },
  previewBody: {
    padding: 18,
    position: 'relative',
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#dbeafe',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 10,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1d4ed8',
  },
  paperTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  paperAuthors: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
    marginBottom: 14,
  },
  abstractHeading: {
    fontSize: 10,
    fontWeight: '900',
    color: '#334155',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  abstractBodyText: {
    fontSize: 12.5,
    color: '#475569',
    lineHeight: 19,
    paddingRight: 24,
  },
  aiBadgeFloat: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4f46e5',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },

  // Features Section
  featuresSection: {
    marginTop: 40,
  },
  featuresHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  featuresTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
    letterSpacing: -0.4,
    marginBottom: 6,
  },
  featuresSubtitle: {
    fontSize: 13.5,
    color: 'rgba(255, 255, 255, 0.55)',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 10,
    fontWeight: '400',
  },
  featureCardsStack: {
    gap: 12,
  },
  featureCard: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
  },
  featureIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  featureCardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  featureCardDescription: {
    fontSize: 12.5,
    color: 'rgba(255, 255, 255, 0.65)',
    lineHeight: 19,
    fontWeight: '400',
  },

  // Footer
  footer: {
    marginTop: 32,
    marginBottom: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.35)',
    fontWeight: '500',
  },
});
