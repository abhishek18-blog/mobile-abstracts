import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
  Dimensions,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, Sparkles, LayoutList, BookCopy, Award, Calendar, Bookmark, FolderPlus, X } from 'lucide-react-native';
import { Paper, ExternalPaper, Project } from '../types';
import { papersApi, searchApi, projectsApi, cachePapers } from '../services/api';
import { PaperCard } from '../components/PaperCard';
import { useTheme } from '../context/ThemeContext';
import { useSearch } from '../context/SearchContext';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface DiscoverScreenProps {
  onSelectPaper: (paperId: string) => void;
}

export const DiscoverScreen: React.FC<DiscoverScreenProps> = ({ onSelectPaper }) => {
  const { colors, theme } = useTheme();
  const {
    searchQuery,
    setSearchQuery,
    papers,
    setPapers,
    selectedSort,
    setSelectedSort,
    viewMode,
    setViewMode,
    loading,
    searchInBg,
  } = useSearch();

  const [refreshing, setRefreshing] = useState(false);

  // Add to project modal state
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [selectedPaperForProject, setSelectedPaperForProject] = useState<Paper | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);

  const primaryBtnTextColor = theme === 'dark' ? '#000000' : '#ffffff';

  useEffect(() => {
    const timer = setTimeout(() => {
      searchInBg(searchQuery, selectedSort);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery, selectedSort]);

  const handleToggleSave = async (paperId: string) => {
    try {
      const res = await papersApi.toggleSave(paperId);
      if (res.success) {
        setPapers((prev) =>
          prev.map((p) => (p.id === paperId ? { ...p, saved: res.data.saved } : p))
        );
      }
    } catch (err) {
      console.warn('Failed to save paper:', err);
    }
  };

  const handleOpenProjectSelector = async (paper: Paper) => {
    setSelectedPaperForProject(paper);
    setShowProjectModal(true);
    setLoadingProjects(true);
    try {
      const res = await projectsApi.getAll();
      if (res.success) {
        setProjects(res.data);
      }
    } catch (err) {
      console.warn('Failed to load projects:', err);
    } finally {
      setLoadingProjects(false);
    }
  };

  const handleAddToProject = async (projectId: string, projectName: string) => {
    if (!selectedPaperForProject) return;

    try {
      // Use importAndAddPaper which first imports external papers then adds to project
      const res = await projectsApi.importAndAddPaper(projectId, selectedPaperForProject);
      if (res.success) {
        Alert.alert('✅ Added to Project', `"${selectedPaperForProject.title}" has been added to "${projectName}".`);
      } else {
        Alert.alert('Error', res.error || 'Failed to add paper to project');
      }
    } catch (err: any) {
      // Check for 409 conflict (paper already in project)
      if (err.message?.includes('already')) {
        Alert.alert('Already Added', 'This paper is already in the project.');
      } else {
        Alert.alert('Error', err.message || 'Failed to add paper to project');
      }
    } finally {
      setShowProjectModal(false);
      setSelectedPaperForProject(null);
    }
  };

  const renderSwipeCard = ({ item }: { item: Paper }) => {
    return (
      <View style={[styles.swipeCardContainer, { width: screenWidth }]}>
        <View style={[styles.swipeCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Card Header info */}
          <View style={styles.cardHeaderRow}>
            <View style={[styles.badge, { backgroundColor: colors.background }]}>
              <Calendar size={12} color={colors.primary} />
              <Text style={[styles.badgeText, { color: colors.text }]}>{item.year || '2024'}</Text>
            </View>

            <View style={[styles.badge, { backgroundColor: colors.background }]}>
              <Award size={12} color={colors.primary} />
              <Text style={[styles.badgeText, { color: colors.text }]}>{item.citations || 0} Citations</Text>
            </View>

            <TouchableOpacity onPress={() => handleToggleSave(item.id)} style={styles.saveIcon}>
              <Bookmark size={20} color={item.saved ? colors.primary : colors.textMuted} fill={item.saved ? colors.primary : 'transparent'} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={3}>
            {item.title}
          </Text>

          <Text style={[styles.cardAuthors, { color: colors.primary }]} numberOfLines={1}>
            {item.authors ? item.authors.join(', ') : 'Unknown'}
          </Text>

          {/* Abstract Scroll Area */}
          <View style={[styles.abstractContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <ScrollView showsVerticalScrollIndicator={true} nestedScrollEnabled={true}>
              <Text style={[styles.abstractText, { color: colors.text }]}>{item.abstract}</Text>
            </ScrollView>
          </View>

          {/* Call to Action Button */}
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.primary }]}
            onPress={() => handleOpenProjectSelector(item)}
          >
            <FolderPlus size={18} color="#ffffff" />
            <Text style={styles.actionBtnText}>Tap to Add to Project</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.headerContainer}>
        <View style={styles.headerTitleRow}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Discover Research</Text>
        </View>

        {/* Search Bar */}
        <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Search size={18} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search titles, authors, topics..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* View Mode Toggle & Filters */}
        <View style={styles.controlsRow}>
          <View style={styles.filterRow}>
            <TouchableOpacity
              style={[
                styles.filterChip,
                { backgroundColor: colors.card, borderColor: colors.border },
                selectedSort === 'most_cited' && { backgroundColor: colors.primary + '20', borderColor: colors.primary }
              ]}
              onPress={() => setSelectedSort('most_cited')}
            >
              <Text style={[
                styles.filterChipText,
                { color: colors.textMuted },
                selectedSort === 'most_cited' && { color: colors.primary, fontWeight: '700' }
              ]}>
                🔥 Most Cited
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterChip,
                { backgroundColor: colors.card, borderColor: colors.border },
                selectedSort === 'most_recent' && { backgroundColor: colors.primary + '20', borderColor: colors.primary }
              ]}
              onPress={() => setSelectedSort('most_recent')}
            >
              <Text style={[
                styles.filterChipText,
                { color: colors.textMuted },
                selectedSort === 'most_recent' && { color: colors.primary, fontWeight: '700' }
              ]}>
                ⚡ Most Recent
              </Text>
            </TouchableOpacity>
          </View>

          {/* View Mode Icons */}
          <View style={[styles.toggleWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.toggleBtn, viewMode === 'list' && { backgroundColor: colors.background }]}
              onPress={() => setViewMode('list')}
            >
              <LayoutList size={16} color={viewMode === 'list' ? colors.primary : colors.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, viewMode === 'swipe' && { backgroundColor: colors.background }]}
              onPress={() => setViewMode('swipe')}
            >
              <BookCopy size={16} color={viewMode === 'swipe' ? colors.primary : colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Main Content Area */}
      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>Fetching research papers...</Text>
        </View>
      ) : viewMode === 'list' ? (
        <FlatList<Paper>
          data={papers}
          keyExtractor={(item: Paper) => item.id}
          renderItem={({ item }: { item: Paper }) => (
            <PaperCard
              paper={item}
              onPress={() => onSelectPaper(item.id)}
              onToggleSave={() => handleToggleSave(item.id)}
            />
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                searchInBg(searchQuery, selectedSort).finally(() => setRefreshing(false));
              }}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                {searchQuery.length === 0 ? 'Search for research' : 'No papers found'}
              </Text>
              <Text style={[styles.emptySub, { color: colors.textMuted }]}>
                {searchQuery.length === 0
                  ? 'Type in the search bar above to discover interesting research papers.'
                  : 'Try adjusting your search terms or filters to find papers.'}
              </Text>
            </View>
          }
        />
      ) : (
        <View style={styles.swipeContainer}>
          <Text style={[styles.swipeInstruction, { color: colors.textMuted }]}>
            Swipe left/right to browse abstracts • Tap card to save
          </Text>
          <FlatList<Paper>
            data={papers}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item: Paper) => item.id}
            renderItem={renderSwipeCard}
            contentContainerStyle={styles.swipeListContent}
            ListEmptyComponent={
              <View style={[styles.emptyState, { width: screenWidth - 32, marginHorizontal: 16 }]}>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                  {searchQuery.length === 0 ? 'Search for research' : 'No papers found'}
                </Text>
                <Text style={[styles.emptySub, { color: colors.textMuted }]}>
                  {searchQuery.length === 0
                    ? 'Type in the search bar above to discover interesting research papers.'
                    : 'Try adjusting your search terms or filters to find papers.'}
                </Text>
              </View>
            }
          />
        </View>
      )}

      {/* Project Selector Modal */}
      <Modal visible={showProjectModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Add to Project</Text>
              <TouchableOpacity onPress={() => { setShowProjectModal(false); setSelectedPaperForProject(null); }} style={styles.modalCloseBtn}>
                <X size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            {selectedPaperForProject && (
              <Text style={[styles.modalPaperTitle, { color: colors.textMuted }]} numberOfLines={2}>
                📄 {selectedPaperForProject.title}
              </Text>
            )}

            {loadingProjects ? (
              <View style={styles.modalCenter}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : projects.length === 0 ? (
              <View style={styles.modalCenter}>
                <Text style={[styles.modalEmptyText, { color: colors.textMuted }]}>
                  No projects yet. Create one in the Library tab first.
                </Text>
              </View>
            ) : (
              <FlatList<Project>
                data={projects}
                keyExtractor={(item) => item.id}
                style={{ maxHeight: 300 }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.projectItem, { backgroundColor: colors.background, borderColor: colors.border }]}
                    onPress={() => handleAddToProject(item.id, item.name)}
                  >
                    <View style={[styles.projectDot, { backgroundColor: item.color || '#3b82f6' }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.projectItemName, { color: colors.text }]}>{item.name}</Text>
                      <Text style={[styles.projectItemDesc, { color: colors.textMuted }]}>
                        {item.paperCount || 0} papers
                      </Text>
                    </View>
                    <FolderPlus size={18} color={colors.primary} />
                  </TouchableOpacity>
                )}
              />
            )}
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
  headerContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
  },
  aiTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  aiTagText: {
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 4,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    paddingVertical: 0,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  filterRow: {
    flexDirection: 'row',
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 8,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  toggleWrapper: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 2,
    borderWidth: 1,
  },
  toggleBtn: {
    padding: 6,
    borderRadius: 6,
  },
  listContent: {
    padding: 16,
    paddingTop: 4,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptySub: {
    fontSize: 14,
    textAlign: 'center',
  },
  swipeContainer: {
    flex: 1,
    paddingBottom: 10,
  },
  swipeInstruction: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginVertical: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  swipeListContent: {
    paddingVertical: 4,
  },
  swipeCardContainer: {
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  swipeCard: {
    width: screenWidth - 32,
    height: Math.min(Math.max(screenHeight * 0.56, 420), 520),
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 4,
  },
  saveIcon: {
    marginLeft: 'auto',
    padding: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 24,
    marginBottom: 4,
  },
  cardAuthors: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
  },
  abstractContainer: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    padding: 12, // Decrease padding inside abstract
    marginBottom: 14,
    minHeight: 80,
  },
  abstractText: {
    fontSize: 14,
    lineHeight: 20,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    marginBottom: 4,
  },
  actionBtnText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 6,
  },
  // Project Selector Modal
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
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalPaperTitle: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 16,
    lineHeight: 18,
  },
  modalCenter: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  modalEmptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  projectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  projectDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  projectItemName: {
    fontSize: 15,
    fontWeight: '700',
  },
  projectItemDesc: {
    fontSize: 12,
    marginTop: 2,
  },
});
