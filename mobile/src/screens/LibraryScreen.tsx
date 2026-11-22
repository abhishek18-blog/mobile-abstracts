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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Folder, Bookmark, Plus, BookMarked, X, ArrowLeft, Trash2, WifiOff, ChevronRight } from 'lucide-react-native';
import { Paper, Project } from '../types';
import { papersApi, projectsApi, cachePapers, MOCK_PAPERS } from '../services/api';
import { PaperCard } from '../components/PaperCard';
import { BooksIllustration } from '../components/HeaderIllustrations';
import { useTheme } from '../context/ThemeContext';

// ─── Offline Cache Keys ──────────────────────────────────────────────────────
const SAVED_PAPERS_CACHE_KEY = '@library_saved_papers';
const PROJECTS_CACHE_KEY = '@library_projects';

async function savePapersToStorage(papers: Paper[]) {
  try { await AsyncStorage.setItem(SAVED_PAPERS_CACHE_KEY, JSON.stringify(papers)); } catch {}
}
async function saveProjectsToStorage(projects: Project[]) {
  try { await AsyncStorage.setItem(PROJECTS_CACHE_KEY, JSON.stringify(projects)); } catch {}
}
async function loadPapersFromStorage(): Promise<Paper[]> {
  try {
    const raw = await AsyncStorage.getItem(SAVED_PAPERS_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
    return MOCK_PAPERS.filter((p) => p.saved);
  } catch {
    return MOCK_PAPERS.filter((p) => p.saved);
  }
}
async function loadProjectsFromStorage(): Promise<Project[]> {
  try {
    const raw = await AsyncStorage.getItem(PROJECTS_CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

let inMemorySavedPapers: Paper[] = MOCK_PAPERS.filter((p) => p.saved);
let inMemoryProjects: Project[] = [];

loadPapersFromStorage().then(p => { if (p && p.length > 0) inMemorySavedPapers = p; }).catch(() => {});
loadProjectsFromStorage().then(p => { if (p && p.length > 0) inMemoryProjects = p; }).catch(() => {});

interface LibraryScreenProps {
  onSelectPaper: (paperId: string) => void;
  isActive?: boolean;
}

const PROJECT_COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#8b5cf6', // violet
  '#f59e0b', // amber
  '#ef4444', // red
  '#ec4899', // pink
];

export const LibraryScreen: React.FC<LibraryScreenProps> = ({ onSelectPaper, isActive }) => {
  const { colors, theme } = useTheme();
  const [activeSegment, setActiveSegment] = useState<'saved' | 'projects'>('saved');
  const [savedPapers, setSavedPapers] = useState<Paper[]>(inMemorySavedPapers);
  const [projects, setProjects] = useState<Project[]>(inMemoryProjects);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  // Selected project details view state
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projectPapers, setProjectPapers] = useState<Paper[]>([]);

  // New Project Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectDesc, setProjectDesc] = useState('');
  const [selectedColor, setSelectedColor] = useState(PROJECT_COLORS[0]);

  const loadLibraryData = async () => {
    setIsOffline(false);
    try {
      if (activeSegment === 'saved') {
        // ── Show cached instantly ──
        const cachedPapers = await loadPapersFromStorage();
        if (cachedPapers.length > 0) {
          inMemorySavedPapers = cachedPapers;
          setSavedPapers(cachedPapers);
          cachePapers(cachedPapers);
        }
        // ── Fetch fresh from network or storage in background ──
        const res = await papersApi.getAll({ saved_by: 'true' });
        if (res.success && res.data) {
          const serverPapers = res.data;
          const mergedMap = new Map<string, Paper>();
          serverPapers.forEach((p) => {
            if (p && p.id) mergedMap.set(p.id, { ...p, saved: true });
          });
          cachedPapers.forEach((p) => {
            if (p && p.id && !mergedMap.has(p.id)) {
              mergedMap.set(p.id, { ...p, saved: true });
            }
          });
          const merged = Array.from(mergedMap.values());
          inMemorySavedPapers = merged;
          setSavedPapers(merged);
          cachePapers(merged);
          savePapersToStorage(merged); // persist for offline
        } else if (cachedPapers.length > 0) {
          setSavedPapers(cachedPapers);
        }
      } else {
        // ── Show cached instantly ──
        const cachedProjects = await loadProjectsFromStorage();
        if (cachedProjects.length > 0) {
          inMemoryProjects = cachedProjects;
          setProjects(cachedProjects);
        }
        // ── Fetch fresh from network in background ──
        const res = await projectsApi.getAll();
        if (res.success && res.data) {
          inMemoryProjects = res.data;
          setProjects(res.data);
          saveProjectsToStorage(res.data); // persist for offline
        }
      }
    } catch (err) {
      console.warn('Failed to fetch library (offline fallback active):', err);
      setIsOffline(true);
      // Fallback: load from storage if network fails and nothing displayed yet
      if (activeSegment === 'saved') {
        const cached = await loadPapersFromStorage();
        if (cached.length > 0) {
          inMemorySavedPapers = cached;
          setSavedPapers(cached);
          cachePapers(cached);
        }
      } else if (activeSegment === 'projects') {
        const cached = await loadProjectsFromStorage();
        if (cached.length > 0) {
          inMemoryProjects = cached;
          setProjects(cached);
        }
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setSelectedProject(null); // Reset detail view when switching segments
    loadLibraryData();
  }, [activeSegment]);

  // Refresh data whenever user navigates back to Library tab
  useEffect(() => {
    if (isActive) {
      loadLibraryData();
    }
  }, [isActive]);

  const handleSelectProject = async (project: Project) => {
    // Optimistically open project details view immediately for smooth navigation
    setSelectedProject(project);
    setProjectPapers((project.papers || []) as Paper[]);
    try {
      const res = await projectsApi.getById(project.id);
      if (res.success && res.data) {
        setSelectedProject(res.data);
        setProjectPapers((res.data.papers || []) as Paper[]);
      }
    } catch (err) {
      console.warn('Failed to load project details:', err);
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
        const updated = savedPapers.filter((p) => p.id !== paperId);
        setSavedPapers(updated);
        savePapersToStorage(updated); // keep cache in sync
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

  const handleDeleteProject = (project: Project) => {
    Alert.alert(
      'Delete Project',
      `Are you sure you want to delete "${project.name}"? All associations in this project will be removed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await projectsApi.delete(project.id);
              if (res.success) {
                setProjects(prev => prev.filter(p => p.id !== project.id));
                if (selectedProject?.id === project.id) {
                  setSelectedProject(null);
                }
              } else {
                Alert.alert('Error', res.error || 'Failed to delete project.');
              }
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Failed to delete project.');
            }
          },
        },
      ]
    );
  };

  const primaryBtnTextColor = theme === 'dark' ? '#000000' : '#ffffff';

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: colors.text }]}>My Library</Text>
          {!selectedProject && (
            <TouchableOpacity 
              style={[styles.createBtn, { backgroundColor: colors.primary }]}
              onPress={() => setIsModalOpen(true)}
              activeOpacity={0.8}
            >
              <Plus size={15} color="#FFFFFF" strokeWidth={2.4} />
              <Text style={styles.createBtnText}>New Project</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Offline Banner */}
        {isOffline && (
          <View style={[styles.offlineBanner, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <WifiOff size={14} color={colors.textMuted} />
            <Text style={[styles.offlineBannerText, { color: colors.textMuted }]}>
              You're offline — showing cached library data
            </Text>
          </View>
        )}
        
        {/* Segment Control matching 2.png */}
        {!selectedProject && (
          <View style={styles.segmentContainer}>
            <TouchableOpacity
              style={[
                styles.segmentBtn,
                activeSegment === 'saved'
                  ? styles.segmentBtnActive
                  : [styles.segmentBtnInactive, { backgroundColor: colors.card, borderColor: colors.border }]
              ]}
              onPress={() => setActiveSegment('saved')}
              activeOpacity={0.8}
            >
              <Bookmark
                size={16}
                color={activeSegment === 'saved' ? '#FFFFFF' : colors.text}
                fill={activeSegment === 'saved' ? '#FFFFFF' : 'transparent'}
              />
              <Text style={[
                styles.segmentText,
                activeSegment === 'saved' ? styles.segmentTextActive : [styles.segmentTextInactive, { color: colors.text }]
              ]}>
                Saved Papers
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.segmentBtn,
                activeSegment === 'projects'
                  ? styles.segmentBtnActive
                  : [styles.segmentBtnInactive, { backgroundColor: colors.card, borderColor: colors.border }]
              ]}
              onPress={() => setActiveSegment('projects')}
              activeOpacity={0.8}
            >
              <Folder
                size={16}
                color={activeSegment === 'projects' ? '#FFFFFF' : colors.text}
              />
              <Text style={[
                styles.segmentText,
                activeSegment === 'projects' ? styles.segmentTextActive : [styles.segmentTextInactive, { color: colors.text }]
              ]}>
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
          keyExtractor={(item: Paper, index: number) => (item?.id ? `${item.id}-${index}` : `saved-${index}`)}
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
          keyExtractor={(item: Paper, index: number) => (item?.id ? `${item.id}-${index}` : `proj-paper-${index}`)}
          ListHeaderComponent={
            <View style={styles.projectHeaderDetails}>
              <TouchableOpacity
                style={[
                  styles.backBtn,
                  {
                    backgroundColor: theme === 'dark' ? '#161F30' : '#EFF6FF',
                    borderColor: theme === 'dark' ? colors.border : '#DBEAFE',
                  }
                ]}
                onPress={handleCloseProjectDetails}
                activeOpacity={0.7}
              >
                <ArrowLeft size={16} color={colors.primary} strokeWidth={2.4} />
                <Text style={[styles.backBtnText, { color: colors.primary }]}>Back to Projects</Text>
              </TouchableOpacity>
              
              <View style={[styles.projectDetailBanner, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.colorIndicatorLarge, { backgroundColor: selectedProject.color || '#3b82f6' }]} />
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                  <Text style={[styles.projectDetailName, { color: colors.text, flex: 1, marginRight: 8 }]}>
                    {selectedProject.name}
                  </Text>
                  <TouchableOpacity
                    onPress={() => handleDeleteProject(selectedProject)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    style={[styles.projectTrashBtn, { backgroundColor: theme === 'dark' ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2' }]}
                    activeOpacity={0.7}
                  >
                    <Trash2 size={15} color="#EF4444" strokeWidth={2} />
                  </TouchableOpacity>
                </View>
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
            <PaperCard 
              paper={item} 
              onPress={() => {
                cachePapers([item]);
                onSelectPaper(item.id);
              }} 
              onToggleSave={() => handleToggleSave(item.id)}
              onRemove={() => handleRemovePaperFromProject(item.id)}
            />
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
          keyExtractor={(item: Project, index: number) => (item?.id ? `${item.id}-${index}` : `proj-${index}`)}
          renderItem={({ item }: { item: Project }) => (
            <TouchableOpacity 
              activeOpacity={0.8}
              style={[styles.projectCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => handleSelectProject(item)}
            >
              <View style={[styles.colorIndicator, { backgroundColor: item.color || '#3b82f6' }]} />
              <View style={styles.projectMain}>
                <View style={styles.projectNameRow}>
                  <Text style={[styles.projectName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        handleDeleteProject(item);
                      }}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      style={[styles.projectTrashBtn, { backgroundColor: theme === 'dark' ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2' }]}
                      activeOpacity={0.7}
                    >
                      <Trash2 size={14} color="#EF4444" strokeWidth={2} />
                    </TouchableOpacity>
                    <ChevronRight size={16} color={colors.textMuted} />
                  </View>
                </View>
                {item.description ? (
                  <Text style={[styles.projectDesc, { color: colors.textMuted }]} numberOfLines={2}>
                    {item.description}
                  </Text>
                ) : null}
                <View style={styles.projectMeta}>
                  <Text style={[styles.projectMetaText, { color: colors.primary }]}>{item.paperCount || 0} papers</Text>
                  <Text style={[styles.projectMetaText, { color: colors.primary }]}>{item.progress || 0}% complete</Text>
                </View>
                {/* Visual Progress Bar */}
                <View style={[styles.progressBarBg, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <View 
                    style={[
                      styles.progressBarFill, 
                      { 
                        backgroundColor: item.color || '#3b82f6', 
                        width: `${Math.min(100, Math.max((item.progress || 0) > 0 ? 5 : 0, item.progress || 0))}%` 
                      }
                    ]} 
                  />
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
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
    gap: 6,
  },
  offlineBannerText: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    minHeight: 44,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.4,
    lineHeight: 28,
  },
  subtitle: {
    fontSize: 12.5,
    fontWeight: '500',
    marginTop: 1,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 8,
    alignSelf: 'center',
  },
  createBtnText: {
    color: '#ffffff',
    fontSize: 12.5,
    fontWeight: '700',
    marginLeft: 4,
  },
  segmentContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
    marginBottom: 8,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  segmentBtnActive: {
    backgroundColor: '#1363F5',
    borderColor: '#1363F5',
    shadowColor: '#1363F5',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 2,
  },
  segmentBtnInactive: {
    shadowColor: '#1A3B70',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '600',
  },
  segmentTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  segmentTextInactive: {
    color: '#64748B',
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 0,
    paddingTop: 8,
    paddingBottom: 24,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  projectCard: {
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    borderWidth: 1,
    alignItems: 'center',
    shadowColor: '#1A3B70',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
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
  projectNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  projectTrashBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  projectName: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  projectDesc: {
    fontSize: 13,
    marginTop: 4,
  },
  projectMeta: {
    flexDirection: 'row',
    marginTop: 8,
    marginBottom: 8,
  },
  projectMetaText: {
    fontSize: 12,
    fontWeight: '600',
    marginRight: 16,
  },
  progressBarBg: {
    height: 5,
    borderRadius: 3,
    borderWidth: 0.5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
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
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    alignSelf: 'flex-start',
    marginBottom: 14,
  },
  backBtnText: {
    fontSize: 13.5,
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
