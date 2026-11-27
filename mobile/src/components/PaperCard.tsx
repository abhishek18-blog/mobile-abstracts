import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import {
  Bookmark,
  BookOpen,
  Award,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Calendar,
  Sparkles,
  GitBranch,
  Terminal,
  Code,
  Layers,
  Trash2,
} from 'lucide-react-native';
import { Paper } from '../types';
import { useTheme } from '../context/ThemeContext';
import { getAbstractText } from '../services/api';
import { CardWaveDecoration } from './HeaderIllustrations';

interface PaperCardProps {
  paper: Paper;
  onPress: () => void;
  onToggleSave?: () => void;
  onRemove?: () => void;
}

const formatCitations = (count?: number): string => {
  if (!count) return '0';
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
  return String(count);
};

const getTagConfig = (tag: string, isDark: boolean) => {
  const t = tag.toLowerCase();
  if (t.includes('transform') || t.includes('attention') || t.includes('bert') || t.includes('gpt')) {
    return {
      bg: isDark ? 'rgba(147, 51, 234, 0.25)' : '#F3E8FF',
      color: isDark ? '#C084FC' : '#7E22CE',
      Icon: Layers,
    };
  }
  if (t.includes('deep learn') || t.includes('neural') || t.includes('vision') || t.includes('cnn')) {
    return {
      bg: isDark ? 'rgba(13, 148, 136, 0.25)' : '#ECFDF5',
      color: isDark ? '#2DD4BF' : '#0D9488',
      Icon: GitBranch,
    };
  }
  if (t.includes('llm') || t.includes('language') || t.includes('nlp')) {
    return {
      bg: isDark ? 'rgba(16, 185, 129, 0.25)' : '#ECFDF5',
      color: isDark ? '#34D399' : '#059669',
      Icon: Terminal,
    };
  }
  if (t.includes('open source') || t.includes('code') || t.includes('software') || t.includes('repo')) {
    return {
      bg: isDark ? 'rgba(249, 115, 22, 0.25)' : '#FFF1EC',
      color: isDark ? '#FB923C' : '#EA580C',
      Icon: Code,
    };
  }
  return {
    bg: isDark ? 'rgba(59, 130, 246, 0.25)' : '#EFF6FF',
    color: isDark ? '#60A5FA' : '#2563EB',
    Icon: BookOpen,
  };
};

export const PaperCard: React.FC<PaperCardProps> = ({ paper, onPress, onToggleSave, onRemove }) => {
  const { colors, theme } = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);
  const abstractContent = getAbstractText(paper);
  const isLongAbstract = abstractContent.length > 180;
  const isDark = theme === 'dark';
  
  const cleanTags = (paper.tags || []).filter(
    (tag) => !/openalex|semantic scholar|crossref|arxiv|external/i.test(tag)
  );

  const primaryAccentColor = isDark ? '#60A5FA' : '#1D4ED8';
  const badgeBg = isDark ? '#24324D' : '#EFF6FF';
  const badgeText = isDark ? '#F8FAFC' : '#0F172A';

  return (
    <TouchableOpacity 
      activeOpacity={0.88} 
      style={[
        styles.card, 
        { 
          backgroundColor: colors.card, 
          borderColor: isDark ? colors.border : '#EDF2F9',
        }
      ]} 
      onPress={onPress}
    >
      {/* Decorative subtle blue curved wave in bottom right for light theme */}
      {!isDark && <CardWaveDecoration />}

      {/* Top Meta: Tags & Bookmark */}
      <View style={styles.topMetaRow}>
        <View style={styles.tagsContainer}>
          {cleanTags.length > 0 ? (
            cleanTags.slice(0, 2).map((tag, idx) => {
              const config = getTagConfig(tag, isDark);
              const TagIcon = config.Icon;
              return (
                <View 
                  key={`${tag}-${idx}`} 
                  style={[styles.tagPill, { backgroundColor: config.bg }]}
                >
                  <TagIcon size={12} color={config.color} strokeWidth={2.2} />
                  <Text style={[styles.tagText, { color: config.color }]}>{tag}</Text>
                </View>
              );
            })
          ) : (
            <View style={[styles.tagPill, { backgroundColor: badgeBg }]}>
              <Text style={[styles.tagText, { color: primaryAccentColor }]}>Research</Text>
            </View>
          )}
        </View>

        {onToggleSave && (
          <TouchableOpacity 
            onPress={(e) => {
              e.stopPropagation();
              onToggleSave();
            }}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={[
              styles.saveBtn,
              paper.saved && (isDark ? styles.saveBtnActiveDark : styles.saveBtnActiveLight)
            ]}
          >
            <Bookmark
              size={paper.saved ? 17 : 20}
              color={paper.saved ? (isDark ? '#60A5FA' : '#1363F5') : colors.textMuted}
              fill={paper.saved ? (isDark ? '#60A5FA' : '#1363F5') : 'transparent'}
              strokeWidth={paper.saved ? 2.4 : 1.8}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Paper Title */}
      <Text style={[styles.title, { color: colors.text }]} numberOfLines={isExpanded ? undefined : 3}>
        {paper.title}
      </Text>

      {/* Authors */}
      <Text style={[styles.authors, { color: primaryAccentColor }]} numberOfLines={1}>
        {paper.authors && paper.authors.length > 0 ? paper.authors.join(', ') : 'Unknown Authors'}
      </Text>

      {/* Complete Abstract Text with Expand/Collapse */}
      <Text 
        style={[styles.abstract, { color: colors.textMuted }]} 
        numberOfLines={isExpanded ? undefined : 3}
      >
        {abstractContent}
      </Text>

      {/* Read Full Abstract > Link */}
      <TouchableOpacity 
        style={styles.expandToggle}
        onPress={(e) => {
          e.stopPropagation();
          setIsExpanded(!isExpanded);
        }}
        activeOpacity={0.7}
      >
        <Text style={[styles.expandToggleText, { color: primaryAccentColor }]}>
          {isExpanded ? 'Show Less' : 'Read Full Abstract'}
        </Text>
        {isExpanded ? (
          <ChevronUp size={15} color={primaryAccentColor} strokeWidth={2.2} />
        ) : (
          <ChevronRight size={15} color={primaryAccentColor} strokeWidth={2.2} />
        )}
      </TouchableOpacity>

      {/* Footer Metrics & Actions */}
      <View style={styles.metaRow}>
        <View style={styles.badgeGroup}>
          <View style={[styles.badge, { backgroundColor: badgeBg }]}>
            <Calendar size={13} color={primaryAccentColor} strokeWidth={2} />
            <Text style={[styles.badgeText, { color: badgeText }]}>{paper.year || '2024'}</Text>
          </View>

          <View style={[styles.badge, { backgroundColor: badgeBg }]}>
            <Award size={13} color={primaryAccentColor} strokeWidth={2} />
            <Text style={[styles.badgeText, { color: badgeText }]}>
              {formatCitations(paper.citations)} citations
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {typeof paper.readingProgress === 'number' && paper.readingProgress > 0 && (
            <View style={[styles.progressBadge, { backgroundColor: badgeBg }]}>
              <BookOpen size={12} color={primaryAccentColor} />
              <Text style={[styles.progressText, { color: primaryAccentColor }]}>
                {paper.readingProgress}%
              </Text>
            </View>
          )}

          {/* Bin Button directly at the bottom on the card (taking no extra space) */}
          {onRemove && (
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={[
                styles.binBtn,
                { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.2)' : '#FEE2E2' }
              ]}
              accessibilityLabel="Remove from project"
            >
              <Trash2 size={15} color="#EF4444" strokeWidth={2.2} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 14,
    borderWidth: 1,
    shadowColor: '#1A3B70',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
    position: 'relative',
    overflow: 'hidden',
  },
  topMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tagsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  tagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: 14,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  saveBtn: {
    padding: 6,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnActiveLight: {
    backgroundColor: '#EFF6FF',
    padding: 7,
    borderRadius: 12,
  },
  saveBtnActiveDark: {
    backgroundColor: 'rgba(59, 130, 246, 0.25)',
    padding: 7,
    borderRadius: 12,
  },
  title: {
    fontSize: 17.5,
    fontWeight: '700',
    lineHeight: 24,
    marginBottom: 5,
    letterSpacing: -0.3,
  },
  authors: {
    fontSize: 13.5,
    marginBottom: 7,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  abstract: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 6,
  },
  expandToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  expandToggleText: {
    fontSize: 13.5,
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
  },
  badgeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4.5,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  progressBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  progressText: {
    fontSize: 11,
    fontWeight: '700',
  },
  binBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
