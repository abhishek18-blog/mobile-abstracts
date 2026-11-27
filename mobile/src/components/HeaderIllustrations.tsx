import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, {
  Path,
  G,
  Circle,
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
  Rect,
} from 'react-native-svg';

/**
 * 3D Isometric Stack of Blue Books with Sparkles
 * Exactly matching the top-right illustration in 1.png (Discover) & 2.png (Library)
 */
export const BooksIllustration: React.FC<{ size?: number }> = ({ size = 110 }) => {
  const width = size;
  const height = size * 0.9;

  return (
    <View style={{ width, height, overflow: 'visible' }}>
      <Svg width={width} height={height} viewBox="0 0 160 144" fill="none">
        <Defs>
          {/* Top book blue gradient */}
          <LinearGradient id="bookTopGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#60A5FA" />
            <Stop offset="100%" stopColor="#2563EB" />
          </LinearGradient>
          {/* Middle book blue gradient */}
          <LinearGradient id="bookMidGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#3B82F6" />
            <Stop offset="100%" stopColor="#1D4ED8" />
          </LinearGradient>
          {/* Bottom book blue gradient */}
          <LinearGradient id="bookBotGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#2563EB" />
            <Stop offset="100%" stopColor="#1E3A8A" />
          </LinearGradient>
          {/* Pages gradient */}
          <LinearGradient id="pagesGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#FFFFFF" />
            <Stop offset="100%" stopColor="#CBD5E1" />
          </LinearGradient>
          {/* Spine gradient */}
          <LinearGradient id="spineTopGrad" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0%" stopColor="#1E40AF" />
            <Stop offset="100%" stopColor="#2563EB" />
          </LinearGradient>
          <LinearGradient id="spineMidGrad" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0%" stopColor="#1E3A8A" />
            <Stop offset="100%" stopColor="#1D4ED8" />
          </LinearGradient>
          <LinearGradient id="spineBotGrad" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0%" stopColor="#172554" />
            <Stop offset="100%" stopColor="#1E3A8A" />
          </LinearGradient>
          {/* Glow */}
          <RadialGradient id="ambientGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#93C5FD" stopOpacity="0.45" />
            <Stop offset="100%" stopColor="#DBEAFE" stopOpacity="0" />
          </RadialGradient>
        </Defs>

        {/* Ambient subtle glow behind books */}
        <Circle cx="95" cy="70" r="58" fill="url(#ambientGlow)" />

        {/* Base shadow beneath stack */}
        <Path
          d="M 25 108 Q 85 138 145 104 Q 85 88 25 108 Z"
          fill="#1E3A8A"
          opacity="0.25"
        />

        {/* ─── BOTTOM BOOK (Solid Isometric, Base of Stack) ─── */}
        <G transform="translate(15, 48)">
          {/* Top cover surface */}
          <Path
            d="M 20 19 L 70 38 L 125 15 L 75 -4 Z"
            fill="url(#bookBotGrad)"
          />
          {/* Spine (Left side) */}
          <Path
            d="M 20 19 L 70 38 L 70 54 L 20 35 Z"
            fill="url(#spineBotGrad)"
          />
          {/* Pages (Right side) */}
          <Path
            d="M 70 38 L 125 15 L 125 31 L 70 54 Z"
            fill="url(#pagesGrad)"
          />
          {/* Page lines */}
          <Path
            d="M 72 44 L 123 21 M 72 48 L 123 25"
            stroke="#94A3B8"
            strokeWidth="0.8"
            opacity="0.6"
          />
          {/* Bottom cover edge */}
          <Path
            d="M 20 35 L 70 54 L 125 31 L 125 34 L 70 57 L 20 38 Z"
            fill="#0F172A"
          />
        </G>

        {/* ─── MIDDLE BOOK (Solid Isometric, Overlapping Bottom Seamlessly) ─── */}
        <G transform="translate(20, 28)">
          {/* Cast shadow onto bottom book */}
          <Path
            d="M 20 35 L 70 54 L 125 31 L 115 42 L 65 62 L 20 35 Z"
            fill="#0F172A"
            opacity="0.22"
          />
          {/* Top cover surface */}
          <Path
            d="M 20 19 L 70 38 L 125 15 L 75 -4 Z"
            fill="url(#bookMidGrad)"
          />
          {/* Spine (Left side) */}
          <Path
            d="M 20 19 L 70 38 L 70 54 L 20 35 Z"
            fill="url(#spineMidGrad)"
          />
          {/* Pages (Right side) */}
          <Path
            d="M 70 38 L 125 15 L 125 31 L 70 54 Z"
            fill="url(#pagesGrad)"
          />
          {/* Page lines */}
          <Path
            d="M 72 44 L 123 21 M 72 48 L 123 25"
            stroke="#94A3B8"
            strokeWidth="0.8"
            opacity="0.6"
          />
          {/* Bottom cover rim */}
          <Path
            d="M 20 35 L 70 54 L 125 31 L 125 34 L 70 57 L 20 38 Z"
            fill="#1E293B"
          />
        </G>

        {/* ─── TOP BOOK (Solid Isometric, Overlapping Middle Seamlessly) ─── */}
        <G transform="translate(25, 8)">
          {/* Cast shadow onto middle book */}
          <Path
            d="M 20 35 L 70 54 L 125 31 L 115 42 L 65 62 L 20 35 Z"
            fill="#0F172A"
            opacity="0.22"
          />
          {/* Top cover surface */}
          <Path
            d="M 20 19 L 70 38 L 125 15 L 75 -4 Z"
            fill="url(#bookTopGrad)"
          />
          {/* Bookmark Ribbon */}
          <Path
            d="M 48 29 L 58 33 L 63 52 L 53 46 L 43 51 Z"
            fill="#93C5FD"
          />
          {/* Spine (Left side) */}
          <Path
            d="M 20 19 L 70 38 L 70 54 L 20 35 Z"
            fill="url(#spineTopGrad)"
          />
          {/* Spine decorative stripes */}
          <Path
            d="M 25 24 L 25 40 M 65 39 L 65 55"
            stroke="#60A5FA"
            strokeWidth="1.2"
            opacity="0.5"
          />
          {/* Pages (Right side) */}
          <Path
            d="M 70 38 L 125 15 L 125 31 L 70 54 Z"
            fill="url(#pagesGrad)"
          />
          {/* Page lines */}
          <Path
            d="M 72 44 L 123 21 M 72 48 L 123 25"
            stroke="#94A3B8"
            strokeWidth="0.8"
            opacity="0.6"
          />
          {/* Bottom cover rim */}
          <Path
            d="M 20 35 L 70 54 L 125 31 L 125 34 L 70 57 L 20 38 Z"
            fill="#1D4ED8"
          />
        </G>

        {/* Sparkle Star 1 (Top right) */}
        <G transform="translate(142, 16)">
          <Path
            d="M 0 -8 Q 1 -1 8 0 Q 1 1 0 8 Q -1 1 -8 0 Q -1 -1 0 -8 Z"
            fill="#3B82F6"
          />
        </G>

        {/* Sparkle Star 2 (Middle right, smaller) */}
        <G transform="translate(152, 44) scale(0.6)">
          <Path
            d="M 0 -8 Q 1 -1 8 0 Q 1 1 0 8 Q -1 1 -8 0 Q -1 -1 0 -8 Z"
            fill="#60A5FA"
          />
        </G>

        {/* Sparkle Star 3 (Left subtle) */}
        <G transform="translate(16, 25) scale(0.55)">
          <Path
            d="M 0 -8 Q 1 -1 8 0 Q 1 1 0 8 Q -1 1 -8 0 Q -1 -1 0 -8 Z"
            fill="#93C5FD"
          />
        </G>
      </Svg>
    </View>
  );
};

/**
 * 3D Blue Community Avatars Illustration
 * Exactly matching the top-right illustration in 4.png (Communities)
 */
export const CommunitiesIllustration: React.FC<{ size?: number }> = ({ size = 115 }) => {
  const width = size * 1.15;
  const height = size * 0.9;

  return (
    <View style={{ width, height, overflow: 'visible' }}>
      <Svg width={width} height={height} viewBox="0 0 160 120" fill="none">
        <Defs>
          <RadialGradient id="avatarGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#93C5FD" stopOpacity="0.45" />
            <Stop offset="100%" stopColor="#DBEAFE" stopOpacity="0" />
          </RadialGradient>
          <LinearGradient id="headFrontGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#60A5FA" />
            <Stop offset="100%" stopColor="#1D4ED8" />
          </LinearGradient>
          <LinearGradient id="bodyFrontGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#3B82F6" />
            <Stop offset="100%" stopColor="#1E40AF" />
          </LinearGradient>
          <LinearGradient id="headBackGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#93C5FD" />
            <Stop offset="100%" stopColor="#3B82F6" />
          </LinearGradient>
          <LinearGradient id="bodyBackGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#60A5FA" />
            <Stop offset="100%" stopColor="#2563EB" />
          </LinearGradient>
        </Defs>

        {/* Ambient Glow */}
        <Circle cx="85" cy="55" r="50" fill="url(#avatarGlow)" />

        {/* Left Back Avatar */}
        <G transform="translate(15, 18)">
          <Circle cx="30" cy="22" r="14" fill="url(#headBackGrad)" />
          <Path
            d="M 12 55 C 12 36, 48 36, 48 55 Z"
            fill="url(#bodyBackGrad)"
          />
        </G>

        {/* Right Back Avatar */}
        <G transform="translate(85, 12)">
          <Circle cx="30" cy="22" r="15" fill="url(#headBackGrad)" />
          <Path
            d="M 10 58 C 10 38, 50 38, 50 58 Z"
            fill="url(#bodyBackGrad)"
          />
        </G>

        {/* Center Main Front Avatar (Larger, more prominent) */}
        <G transform="translate(50, 2)">
          <Circle cx="35" cy="26" r="19" fill="url(#headFrontGrad)" />
          {/* Subtle highlight */}
          <Circle cx="31" cy="20" r="6" fill="#BFDBFE" opacity="0.4" />
          <Path
            d="M 8 78 C 8 48, 62 48, 62 78 Z"
            fill="url(#bodyFrontGrad)"
          />
        </G>
      </Svg>
    </View>
  );
};

/**
 * Curved Wave Watermark Decoration for Card Bottom-Right
 * Exactly matching the subtle blue organic wave seen on the cards in 1.png, 2.png, 3.png
 */
export const CardWaveDecoration: React.FC = () => {
  return (
    <View style={styles.cardWaveContainer} pointerEvents="none">
      <Svg width={140} height={100} viewBox="0 0 140 100" fill="none">
        <Defs>
          <LinearGradient id="cardWaveGrad" x1="1" y1="1" x2="0" y2="0">
            <Stop offset="0%" stopColor="#93C5FD" stopOpacity="0.45" />
            <Stop offset="40%" stopColor="#BFDBFE" stopOpacity="0.30" />
            <Stop offset="100%" stopColor="#DBEAFE" stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Path
          d="M 140 0 C 100 20, 60 45, 40 70 C 25 88, 10 95, 0 100 L 140 100 Z"
          fill="url(#cardWaveGrad)"
        />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  cardWaveContainer: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 140,
    height: 100,
  },
});
