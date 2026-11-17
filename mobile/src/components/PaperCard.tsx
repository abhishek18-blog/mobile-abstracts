import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Bookmark, BookOpen, Award, ChevronDown, ChevronUp, Calendar, FolderPlus } from 'lucide-react-native';
import { Paper } from '../types';
import { useTheme } from '../context/ThemeContext';
import { getAbstractText } from '../services/api';

interface PaperCardProps {
  paper: Paper;
  onPress: () => void;
  onToggleSave?: () => void;
  onAddToProject?: () => void;
}

const formatCitations = (count?: number): string => {
  if (!count) return '0';
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
  return String(count);
};

const isSourceTag = (tag: string) => /openalex|semantic scholar|abstracts hub/i.test(tag);

export const PaperCard: React.FC<PaperCardProps> = ({
  paper,
  onPress,
  onToggleSave,
  onAddToProject,
}) => {
  const { colors, theme } = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);
  const abstractContent = getAbstractText(paper);
  const isLongAbstract = abstractContent.length > 220;

  const primaryBtnTextColor = theme === 'dark' ? '#000000' : '#ffffff';

  // Filter out any API vendor labels (like OpenAlex, Semantic Scholar) so only genuine topics are shown
  const cleanTags = (paper.tags || []).filter((t) => t && !isSourceTag(t));

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: paper.saved ? colors.primary + '60' : colors.border,
        },
      ]}
      onPress={onPress}
    >
      {/* Top Meta: Year, Citations, Optional Topic Tag, Bookmark */}
      <View style={styles.topMetaRow}>
        <View style={styles.badgeGroup}>
          <View style={[styles.badge, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Calendar size={12} color={colors.primary} />
            <Text style={[styles.badgeText, { color: colors.text }]}>{paper.year || '2024'}</Text>
          </View>

          <View style={[styles.badge, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Award size={12} color={colors.primary} />
            <Text style={[styles.badgeText, { color: colors.text }]}>
              {formatCitations(paper.citations)} citations
            </Text>
          </View>

          {cleanTags.length > 0 && (
            <View style={[styles.badge, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Text style={[styles.badgeText, { color: colors.textMuted }]} numberOfLines={1}>
                {cleanTags[0]}
              </Text>
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
              paper.saved && { backgroundColor: colors.primary + '18' },
            ]}
          >
            <Bookmark
              size={19}
              color={paper.saved ? colors.primary : colors.textMuted}
              fill={paper.saved ? colors.primary : 'transparent'}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Paper Title */}
      <Text style={[styles.title, { color: colors.text }]} numberOfLines={isExpanded ? undefined : 3}>
        {paper.title}
      </Text>

      {/* Authors */}
      <Text style={[styles.authors, { color: colors.primary }]} numberOfLines={1}>
        {paper.authors && paper.authors.length > 0 ? paper.authors.join(', ') : 'Unknown Authors'}
      </Text>

      {/* Original Publication Abstract Box */}
      <View style={[styles.abstractBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
        <Text style={[styles.abstractHeaderLabel, { color: colors.textMuted }]}>
          Original Publication Abstract
        </Text>
        <Text
          selectable
          style={[styles.abstractText, { color: colors.text }]}
          numberOfLines={isExpanded ? undefined : 4}
        >
          {abstractContent}
        </Text>

        {isLongAbstract && (
          <TouchableOpacity
            style={styles.expandToggle}
            onPress={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            activeOpacity={0.7}
          >
            <Text style={[styles.expandToggleText, { color: colors.primary }]}>
              {isExpanded ? 'Show Less' : 'Read Full Abstract'}
            </Text>
            {isExpanded ? (
              <ChevronUp size={14} color={colors.primary} />
            ) : (
              <ChevronDown size={14} color={colors.primary} />
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Card Bottom: Progress Badge & Add to Project Button */}
      <View style={styles.bottomRow}>
        {typeof paper.readingProgress === 'number' && paper.readingProgress > 0 && (
          <View style={[styles.progressBadge, { backgroundColor: colors.primary + '15' }]}>
            <BookOpen size={12} color={colors.primary} />
            <Text style={[styles.progressText, { color: colors.primary }]}>
              {paper.readingProgress}% read
            </Text>
          </View>
        )}

        {onAddToProject && (
          <TouchableOpacity
            style={[styles.addToProjectBtn, { backgroundColor: colors.primary }]}
            onPress={(e) => {
              e.stopPropagation();
              onAddToProject();
            }}
            activeOpacity={0.85}
          >
            <FolderPlus size={16} color={primaryBtnTextColor} />
            <Text style={[styles.addToProjectText, { color: primaryBtnTextColor }]}>
              Tap to Add to Project
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  topMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  badgeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    flexWrap: 'wrap',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  saveBtn: {
    padding: 6,
    borderRadius: 8,
    marginLeft: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 23,
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  authors: {
    fontSize: 13,
    marginBottom: 10,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  abstractBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
  },
  abstractHeaderLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  abstractText: {
    fontSize: 13.5,
    lineHeight: 20.5,
    opacity: 0.9,
  },
  expandToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  expandToggleText: {
    fontSize: 12,
    fontWeight: '700',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  progressBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
  },
  progressText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  addToProjectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  addToProjectText: {
    fontSize: 13.5,
    fontWeight: '700',
  },
});
