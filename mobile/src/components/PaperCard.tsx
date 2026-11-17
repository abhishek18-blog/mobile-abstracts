import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Bookmark, BookOpen, Award, ChevronDown, ChevronUp, Calendar } from 'lucide-react-native';
import { Paper } from '../types';
import { useTheme } from '../context/ThemeContext';
import { getAbstractText } from '../services/api';

interface PaperCardProps {
  paper: Paper;
  onPress: () => void;
  onToggleSave?: () => void;
}

const formatCitations = (count?: number): string => {
  if (!count) return '0';
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
  return String(count);
};

export const PaperCard: React.FC<PaperCardProps> = ({ paper, onPress, onToggleSave }) => {
  const { colors, theme } = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);
  const abstractContent = getAbstractText(paper);
  const isLongAbstract = abstractContent.length > 200;
  const cleanTags = (paper.tags || []).filter(
    (tag) => !/openalex|semantic scholar|crossref|arxiv|external/i.test(tag)
  );

  return (
    <TouchableOpacity 
      activeOpacity={0.8} 
      style={[
        styles.card, 
        { 
          backgroundColor: colors.card, 
          borderColor: paper.saved ? colors.primary + '50' : colors.border 
        }
      ]} 
      onPress={onPress}
    >
      {/* Top Meta: Tags & Bookmark */}
      <View style={styles.topMetaRow}>
        <View style={styles.tagsContainer}>
          {cleanTags.length > 0 ? (
            cleanTags.slice(0, 2).map((tag, idx) => (
              <View 
                key={`${tag}-${idx}`} 
                style={[styles.tagPill, { backgroundColor: colors.background, borderColor: colors.border }]}
              >
                <Text style={[styles.tagText, { color: colors.textMuted }]}>{tag}</Text>
              </View>
            ))
          ) : (
            <View style={[styles.tagPill, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Text style={[styles.tagText, { color: colors.textMuted }]}>Research</Text>
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
              paper.saved && { backgroundColor: colors.primary + '18' }
            ]}
          >
            <Bookmark
              size={18}
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

      {/* Complete Abstract Text with Expand/Collapse */}
      <Text 
        style={[styles.abstract, { color: colors.text }]} 
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

      {/* Footer Metrics */}
      <View style={[styles.metaRow, { borderTopColor: colors.border + '60' }]}>
        <View style={styles.badgeGroup}>
          <View style={[styles.badge, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Calendar size={11} color={colors.textMuted} />
            <Text style={[styles.badgeText, { color: colors.text }]}>{paper.year || '2024'}</Text>
          </View>

          <View style={[styles.badge, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Award size={11} color={colors.primary} />
            <Text style={[styles.badgeText, { color: colors.text }]}>
              {formatCitations(paper.citations)} citations
            </Text>
          </View>
        </View>

        {typeof paper.readingProgress === 'number' && paper.readingProgress > 0 && (
          <View style={[styles.progressBadge, { backgroundColor: colors.primary + '15' }]}>
            <BookOpen size={12} color={colors.primary} />
            <Text style={[styles.progressText, { color: colors.primary }]}>
              {paper.readingProgress}%
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
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
    gap: 6,
    flex: 1,
  },
  tagPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  tagText: {
    fontSize: 10.5,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  saveBtn: {
    padding: 6,
    borderRadius: 8,
  },
  title: {
    fontSize: 16.5,
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
  abstract: {
    fontSize: 13.5,
    lineHeight: 20.5,
    opacity: 0.88,
  },
  expandToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 6,
    marginBottom: 2,
    alignSelf: 'flex-start',
  },
  expandToggleText: {
    fontSize: 12,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  badgeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  progressBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  progressText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
});
