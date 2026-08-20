import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Bookmark, BookOpen, Award } from 'lucide-react-native';
import { Paper } from '../types';
import { useTheme } from '../context/ThemeContext';

interface PaperCardProps {
  paper: Paper;
  onPress: () => void;
  onToggleSave?: () => void;
}

export const PaperCard: React.FC<PaperCardProps> = ({ paper, onPress, onToggleSave }) => {
  const { colors } = useTheme();

  return (
    <TouchableOpacity 
      activeOpacity={0.7} 
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]} 
      onPress={onPress}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
          {paper.title}
        </Text>

        {onToggleSave && (
          <TouchableOpacity 
            onPress={onToggleSave}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={styles.saveBtn}
          >
            <Bookmark
              size={20}
              color={paper.saved ? colors.primary : colors.textMuted}
              fill={paper.saved ? colors.primary : 'transparent'}
            />
          </TouchableOpacity>
        )}
      </View>

      <Text style={[styles.authors, { color: colors.primary }]} numberOfLines={1}>
        {paper.authors ? paper.authors.join(', ') : 'Unknown Authors'}
      </Text>

      <Text style={[styles.abstract, { color: colors.textMuted }]} numberOfLines={3}>
        {paper.abstract}
      </Text>

      <View style={styles.metaRow}>
        <View style={[styles.badge, { backgroundColor: colors.background }]}>
          <Text style={[styles.badgeText, { color: colors.text }]}>{paper.year || '2024'}</Text>
        </View>

        <View style={styles.stat}>
          <Award size={14} color={colors.textMuted} />
          <Text style={[styles.statText, { color: colors.textMuted }]}>{paper.citations || 0} citations</Text>
        </View>

        {typeof paper.readingProgress === 'number' && paper.readingProgress > 0 && (
          <View style={styles.stat}>
            <BookOpen size={14} color={colors.primary} />
            <Text style={[styles.statText, { color: colors.primary }]}>
              {paper.readingProgress}% read
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
  },
  saveBtn: {
    padding: 4,
  },
  authors: {
    fontSize: 13,
    marginTop: 4,
    fontWeight: '600',
  },
  abstract: {
    fontSize: 13.5,
    lineHeight: 19,
    marginTop: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 16,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
