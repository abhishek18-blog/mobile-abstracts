import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Bookmark, ExternalLink, Award, Calendar, Tag, FolderPlus } from 'lucide-react-native';
import { Paper, Project } from '../types';
import { papersApi, projectsApi } from '../services/api';
import { useTheme } from '../context/ThemeContext';

interface PaperDetailModalProps {
  paperId: string | null;
  onClose: () => void;
}

export const PaperDetailModalScreen: React.FC<PaperDetailModalProps> = ({ paperId, onClose }) => {
  const { colors } = useTheme();
  const [paper, setPaper] = useState<Paper | null>(null);
  const [loading, setLoading] = useState(true);
  const [readingProgress, setReadingProgress] = useState(0);
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    if (!paperId) return;

    const fetchPaperDetailAndProjects = async () => {
      setLoading(true);
      try {
        const [paperRes, projectsRes] = await Promise.all([
          papersApi.getById(paperId),
          projectsApi.getAll(),
        ]);

        if (paperRes.success && paperRes.data) {
          setPaper(paperRes.data);
          setReadingProgress(paperRes.data.readingProgress || 0);
        }
        if (projectsRes.success) {
          setProjects(projectsRes.data);
        }
      } catch (err) {
        console.warn('Failed to load paper details:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPaperDetailAndProjects();
  }, [paperId]);

  if (!paperId) return null;

  const handleOpenPdf = () => {
    if (paper?.pdf_url || paper?.source_url) {
      const url = paper.pdf_url || paper.source_url;
      if (url) Linking.openURL(url);
    } else {
      Alert.alert('No Link', 'PDF or source link is not available for this paper.');
    }
  };

  const handleUpdateProgress = async (newProgress: number) => {
    setReadingProgress(newProgress);
    if (paper) {
      try {
        await papersApi.updateProgress(paper.id, newProgress);
      } catch (err) {
        console.warn('Failed to update progress:', err);
      }
    }
  };

  const handleAddToProject = async (projectId: string, projectName: string) => {
    if (!paper) return;
    try {
      // Use importAndAddPaper to properly handle external papers
      const res = await projectsApi.importAndAddPaper(projectId, paper);
      if (res.success) {
        Alert.alert('✅ Added to Project', `"${paper.title}" is now added to "${projectName}".`);
      } else {
        Alert.alert('Error', res.error || 'Failed to add paper to project');
      }
    } catch (err: any) {
      if (err.message?.includes('already')) {
        Alert.alert('Already Added', 'This paper is already in the project.');
      } else {
        Alert.alert('Error', err.message || 'Failed to add paper to project');
      }
    }
  };

  return (
    <SafeAreaView style={[styles.modalOverlay, { backgroundColor: colors.background }]}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Modal Header */}
        <View style={[styles.header, { borderColor: colors.border }]}>
          <Text style={[styles.headerLabel, { color: colors.textMuted }]}>Research Abstract</Text>
          <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.card }]}>
            <X size={20} color={colors.text} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : paper ? (
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={[styles.title, { color: colors.text }]}>{paper.title}</Text>

            <Text style={[styles.authors, { color: colors.primary }]}>
              {paper.authors ? paper.authors.join(', ') : 'Unknown Authors'}
            </Text>

            <View style={styles.statsRow}>
              <View style={[styles.statBadge, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Calendar size={14} color={colors.primary} />
                <Text style={[styles.statBadgeText, { color: colors.text }]}>{paper.year || '2024'}</Text>
              </View>

              <View style={[styles.statBadge, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Award size={14} color={colors.primary} />
                <Text style={[styles.statBadgeText, { color: colors.text }]}>{paper.citations || 0} Citations</Text>
              </View>

              {paper.tags && paper.tags.length > 0 && (
                <View style={[styles.statBadge, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Tag size={14} color={colors.primary} />
                  <Text style={[styles.statBadgeText, { color: colors.text }]}>{paper.tags[0]}</Text>
                </View>
              )}
            </View>

            {/* Reading Progress Quick Selector */}
            <View style={[styles.progressCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.progressLabel, { color: colors.text }]}>
                Reading Progress: <Text style={{ color: colors.primary }}>{readingProgress}%</Text>
              </Text>
              <View style={styles.progressRow}>
                {[0, 25, 50, 75, 100].map((pct) => (
                  <TouchableOpacity
                    key={pct}
                    style={[
                      styles.progressChip,
                      { backgroundColor: colors.background },
                      readingProgress === pct && { backgroundColor: colors.primary },
                    ]}
                    onPress={() => handleUpdateProgress(pct)}
                  >
                    <Text
                      style={[
                        styles.progressChipText,
                        { color: colors.textMuted },
                        readingProgress === pct && { color: '#ffffff' },
                      ]}
                    >
                      {pct}%
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Add to Project Section */}
            <View style={styles.projectSection}>
              <Text style={[styles.sectionHeader, { color: colors.text }]}>Add to Research Project</Text>
              {projects.length === 0 ? (
                <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 4 }}>
                  No active projects. Create a project in the Library tab first.
                </Text>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.projectScroll}>
                  {projects.map((proj) => (
                    <TouchableOpacity
                      key={proj.id}
                      style={[styles.projectChipItem, { backgroundColor: colors.card, borderColor: colors.border }]}
                      onPress={() => handleAddToProject(proj.id, proj.name)}
                    >
                      <View style={[styles.projectDot, { backgroundColor: proj.color || '#3b82f6' }]} />
                      <Text style={[styles.projectChipText, { color: colors.text }]}>{proj.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>

            {/* Abstract Section */}
            <View style={styles.section}>
              <Text style={[styles.sectionHeader, { color: colors.text }]}>Abstract Summary</Text>
              <Text style={[styles.abstractText, { color: colors.textMuted }]}>{paper.abstract}</Text>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionRow}>
              <TouchableOpacity style={[styles.pdfButton, { backgroundColor: colors.primary }]} onPress={handleOpenPdf}>
                <ExternalLink size={18} color="#ffffff" />
                <Text style={styles.pdfButtonText}>Read PDF / View Source</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        ) : (
          <View style={styles.center}>
            <Text style={{ color: colors.text }}>Paper not found.</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerLabel: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 28,
  },
  authors: {
    fontSize: 14,
    marginTop: 8,
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    marginVertical: 16,
    flexWrap: 'wrap',
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 8,
    marginBottom: 8,
  },
  statBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  progressCard: {
    padding: 14,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  progressChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  projectSection: {
    marginBottom: 20,
  },
  projectScroll: {
    marginTop: 8,
    flexDirection: 'row',
  },
  projectChipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  projectDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  projectChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '700',
  },
  abstractText: {
    fontSize: 15,
    lineHeight: 24,
    marginTop: 8,
  },
  actionRow: {
    marginTop: 12,
    marginBottom: 40,
  },
  pdfButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
  },
  pdfButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
