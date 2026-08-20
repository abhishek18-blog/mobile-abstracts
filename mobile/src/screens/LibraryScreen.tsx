import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Folder, Bookmark, Plus, BookMarked, X, ArrowLeft, Trash2 } from 'lucide-react-native';
import { Paper, Project } from '../types';
import { papersApi, projectsApi, cachePapers } from '../services/api';
import { PaperCard } from '../components/PaperCard';
import { useTheme } from '../context/ThemeContext';

interface LibraryScreenProps {
  onSelectPaper: (paperId: string) => void;
}

const PROJECT_COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#8b5cf6', // violet
  '#f59e0b', // amber
  '#ef4444', // red
  '#ec4899', // pink
];

export const LibraryScreen: React.FC<LibraryScreenProps> = ({ onSelectPaper }) => {
  const { colors, theme } = useTheme();
  const [activeSegment, setActiveSegment] = useState<'saved' | 'projects'>('saved');
  const [savedPapers, setSavedPapers] = useState<Paper[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Selected project details view state
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projectPapers, setProjectPapers] = useState<Paper[]>([]);

  // New Project Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectDesc, setProjectDesc] = useState('');
  const [selectedColor, setSelectedColor] = useState(PROJECT_COLORS[0]);

  const loadLibraryData = async () => {
    try {
      if (activeSegment === 'saved') {
        const res = await papersApi.getAll({ saved_by: 'true' });
        if (res.success) {
          setSavedPapers(res.data);
        }
      } else {
        const res = await projectsApi.getAll();
        if (res.success) {
          setProjects(res.data);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch library:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    setSelectedProject(null); // Reset detail view when switching segments
    loadLibraryData();
  }, [activeSegment]);

  const handleSelectProject = async (project: Project) => {
    setLoading(true);
    try {
      const res = await projectsApi.getById(project.id);
      if (res.success && res.data) {
        setSelectedProject(res.data);
        setProjectPapers((res.data.papers || []) as Paper[]);
      }
    } catch (err) {
      console.warn('Failed to load project details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseProjectDetails = () => {
    setSelectedProject(null);
    setProjectPapers([]);
    loadLibraryData();
  };

  const handleToggleSave = async (paperId: string) => {
    try {
      const res = await papersApi.toggleSave(paperId);
      if (res.success && res.data) {
        setSavedPapers((prev) => prev.filter((p) => p.id !== paperId));
        setProjectPapers((prev) =>
          prev.map((p) => (p.id === paperId ? { ...p, saved: res.data?.saved } : p))
        );
      }
    } catch (err) {
      console.warn('Failed to save paper:', err);
    }
  };

  const handleRemovePaperFromProject = async (paperId: string) => {
    if (!selectedProject) return;
    Alert.alert(
      'Remove Paper',
      'Are you sure you want to remove this paper from the project?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await projectsApi.removePaper(selectedProject.id, paperId);
              if (res.success) {
                setProjectPapers((prev) => prev.filter((p) => p.id !== paperId));
                Alert.alert('Paper Removed', 'The paper has been removed from this project.');
              } else {
                Alert.alert('Error', res.error || 'Failed to remove paper');
              }
            } catch (err: any) {
              Alert.alert('Error', err.message || 'An error occurred.');
            }
          }
        }
      ]
    );
  };

  const handleCreateProject = async () => {
    if (!projectName.trim()) {
      Alert.alert('Project Name Required', 'Please enter a name for your research project.');
      return;
    }

    try {
      const res = await projectsApi.create({
        name: projectName.trim(),
        description: projectDesc.trim(),
        color: selectedColor,
      });

      if (res.success) {
        setProjectName('');
        setProjectDesc('');
        setSelectedColor(PROJECT_COLORS[0]);
        setIsModalOpen(false);
        loadLibraryData(); // reload project listing
        Alert.alert('Project Created', `"${res.data.name}" was successfully created.`);
      } else {
        Alert.alert('Error', res.error || 'Failed to create project.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'An error occurred during project creation.');
    }
  };

  const primaryBtnTextColor = theme === 'dark' ? '#000000' : '#ffffff';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: colors.text }]}>My Library</Text>
          {activeSegment === 'projects' && !selectedProject && (
            <TouchableOpacity 
              style={[styles.createBtn, { backgroundColor: colors.primary }]}
              onPress={() => setIsModalOpen(true)}
            >
              <Plus size={16} color={primaryBtnTextColor} />
              <Text style={[styles.createBtnText, { color: primaryBtnTextColor }]}>New Project</Text>
            </TouchableOpacity>
          )}
        </View>
        
        {/* Segment Control - only show if not viewing project details */}
        {!selectedProject && (
          <View style={[styles.segmentContainer, { backgroundColor: colors.card }]}>
            <TouchableOpacity
              style={[styles.segmentBtn, activeSegment === 'saved' && { backgroundColor: colors.primary }]}
              onPress={() => setActiveSegment('saved')}
            >
              <Bookmark size={16} color={activeSegment === 'saved' ? primaryBtnTextColor : colors.textMuted} />
              <Text style={[styles.segmentText, { color: colors.textMuted }, activeSegment === 'saved' && { color: primaryBtnTextColor, fontWeight: '700' }]}>
                Saved Papers
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.segmentBtn, activeSegment === 'projects' && { backgroundColor: colors.primary }]}
              onPress={() => setActiveSegment('projects')}
            >
              <Folder size={16} color={activeSegment === 'projects' ? primaryBtnTextColor : colors.textMuted} />
              <Text style={[styles.segmentText, { color: colors.textMuted }, activeSegment === 'projects' && { color: primaryBtnTextColor, fontWeight: '700' }]}>
                Projects
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : activeSegment === 'saved' ? (
        <FlatList<Paper>
          data={savedPapers}
          keyExtractor={(item: Paper) => item.id}
          renderItem={({ item }: { item: Paper }) => (
            <PaperCard 
              paper={item} 
              onPress={() => {
                cachePapers([item]);
                onSelectPaper(item.id);
              }} 
              onToggleSave={() => handleToggleSave(item.id)}
            />
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadLibraryData();
              }}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <BookMarked size={44} color={colors.textMuted} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No saved papers yet</Text>
              <Text style={[styles.emptySub, { color: colors.textMuted }]}>
                Bookmark papers in the Discover tab to save them here for quick offline reading.
              </Text>
            </View>
          }
        />
      ) : selectedProject ? (
        <FlatList<Paper>
          data={projectPapers}
          keyExtractor={(item: Paper) => item.id}
          ListHeaderComponent={
            <View style={styles.projectHeaderDetails}>
              <TouchableOpacity style={styles.backBtn} onPress={handleCloseProjectDetails}>
                <ArrowLeft size={16} color={colors.primary} />
                <Text style={[styles.backBtnText, { color: colors.primary }]}>Back to Projects</Text>
              </TouchableOpacity>
              
              <View style={[styles.projectDetailBanner, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.colorIndicatorLarge, { backgroundColor: selectedProject.color || '#3b82f6' }]} />
                <Text style={[styles.projectDetailName, { color: colors.text }]}>{selectedProject.name}</Text>
                {selectedProject.description ? (
                  <Text style={[styles.projectDetailDesc, { color: colors.textMuted }]}>{selectedProject.description}</Text>
                ) : null}
                <View style={styles.projectDetailStats}>
                  <Text style={{ color: colors.textMuted, fontSize: 13, marginRight: 24 }}>
                    Papers: <Text style={{ color: colors.primary, fontWeight: '700' }}>{projectPapers.length}</Text>
                  </Text>
                  <Text style={{ color: colors.textMuted, fontSize: 13 }}>
                    Reading Progress: <Text style={{ color: colors.primary, fontWeight: '700' }}>{selectedProject.progress || 0}%</Text>
                  </Text>
                </View>
              </View>
              
              <Text style={[styles.projectSectionTitle, { color: colors.text }]}>Papers in Project</Text>
            </View>
          }
          renderItem={({ item }: { item: Paper }) => (
            <View style={{ marginBottom: 12 }}>
              <PaperCard 
                paper={item} 
                onPress={() => {
                  cachePapers([item]);
                  onSelectPaper(item.id);
                }} 
                onToggleSave={() => handleToggleSave(item.id)}
              />
              <TouchableOpacity
                style={[styles.removePaperBtnInline, { borderColor: colors.border, backgroundColor: colors.card }]}
                activeOpacity={0.7}
                onPress={() => handleRemovePaperFromProject(item.id)}
              >
                <Trash2 size={12} color="#ef4444" />
                <Text style={styles.removePaperTextInline}>Remove from Project</Text>
              </TouchableOpacity>
            </View>
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => {
                setRefreshing(true);
                try {
                  const res = await projectsApi.getById(selectedProject.id);
                  if (res.success && res.data) {
                    setSelectedProject(res.data);
                    setProjectPapers((res.data.papers || []) as Paper[]);
                  }
                } catch {}
                setRefreshing(false);
              }}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <BookMarked size={44} color={colors.textMuted} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No papers added</Text>
              <Text style={[styles.emptySub, { color: colors.textMuted }]}>
                Browse the Discover tab and add interesting research papers to this project.
              </Text>
            </View>
          }
        />
      ) : (
        <FlatList<Project>
          data={projects}
          keyExtractor={(item: Project) => item.id}
          renderItem={({ item }: { item: Project }) => (
            <TouchableOpacity 
              activeOpacity={0.8}
              style={[styles.projectCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => handleSelectProject(item)}
            >
              <View style={[styles.colorIndicator, { backgroundColor: item.color || '#3b82f6' }]} />
              <View style={styles.projectMain}>
                <Text style={[styles.projectName, { color: colors.text }]}>{item.name}</Text>
                <Text style={[styles.projectDesc, { color: colors.textMuted }]} numberOfLines={2}>
                  {item.description || 'No project description'}
                </Text>
                <View style={styles.projectMeta}>
                  <Text style={[styles.projectMetaText, { color: colors.primary }]}>{item.paperCount || 0} papers</Text>
                  <Text style={[styles.projectMetaText, { color: colors.primary }]}>{item.progress || 0}% complete</Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadLibraryData();
              }}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Folder size={44} color={colors.textMuted} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No research projects</Text>
              <Text style={[styles.emptySub, { color: colors.textMuted }]}>
                Organize your literature reviews by creating research projects.
              </Text>
            </View>
          }
        />
      )}

      {/* New Project Modal */}
      <Modal visible={isModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Create Research Project</Text>
              <TouchableOpacity onPress={() => setIsModalOpen(false)} style={styles.modalCloseBtn}>
                <X size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Project Name</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                placeholder="e.g. LLM Reasoning Review"
                placeholderTextColor={colors.textMuted}
                value={projectName}
                onChangeText={setProjectName}
              />

              <Text style={[styles.inputLabel, { color: colors.text }]}>Description (Optional)</Text>
              <TextInput
                style={[styles.input, styles.descInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                placeholder="Brief summary of research scope..."
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={3}
                value={projectDesc}
                onChangeText={setProjectDesc}
              />

              <Text style={[styles.inputLabel, { color: colors.text }]}>Color Theme</Text>
              <View style={styles.colorPalette}>
                {PROJECT_COLORS.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[
                      styles.colorDot,
                      { backgroundColor: c },
                      selectedColor === c && { borderWidth: 3, borderColor: colors.text }
                    ]}
                    onPress={() => setSelectedColor(c)}
                  />
                ))}
              </View>

              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: colors.primary }]}
                onPress={handleCreateProject}
              >
                <Text style={[styles.submitBtnText, { color: primaryBtnTextColor }]}>Create Project</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  createBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4,
  },
  segmentContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  listContent: {
    padding: 16,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  projectCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    borderWidth: 1,
    alignItems: 'center',
  },
  colorIndicator: {
    width: 6,
    alignSelf: 'stretch',
    borderRadius: 4,
    marginRight: 12,
  },
  projectMain: {
    flex: 1,
  },
  projectName: {
    fontSize: 16,
    fontWeight: '700',
  },
  projectDesc: {
    fontSize: 13,
    marginTop: 4,
  },
  projectMeta: {
    flexDirection: 'row',
    marginTop: 8,
  },
  projectMetaText: {
    fontSize: 12,
    fontWeight: '600',
    marginRight: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 30,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 12,
  },
  emptySub: {
    fontSize: 14,
    textAlign: 'center',
    width: 260,
    marginTop: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalBody: {},
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
  },
  input: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  descInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  colorPalette: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  colorDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  colorDotActive: {
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  submitBtn: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  // Project detail styling
  projectHeaderDetails: {
    marginBottom: 16,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 6,
  },
  projectDetailBanner: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
  },
  colorIndicatorLarge: {
    height: 6,
    borderRadius: 3,
    marginBottom: 12,
  },
  projectDetailName: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 6,
  },
  projectDetailDesc: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  projectDetailStats: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#cccccc33',
    paddingTop: 10,
  },
  projectSectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  removePaperBtnInline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: -4,
    marginBottom: 12,
    alignSelf: 'flex-end',
    marginRight: 8,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  removePaperTextInline: {
    color: '#ef4444',
    fontSize: 11,
    fontWeight: '700',
  },
});
