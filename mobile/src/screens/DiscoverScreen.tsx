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
import {
  Search,
  Sparkles,
  LayoutList,
  BookCopy,
  Award,
  Calendar,
  Bookmark,
  FolderPlus,
  X,
  Filter,
  Check,
  User,
  AlertCircle,
} from 'lucide-react-native';
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
    searchError,
    papers,
    filteredPapers,
    setPapers,
    selectedSort,
    setSelectedSort,
    viewMode,
    setViewMode,
    loading,
    loadingMore,
    hasMore,
    total,
    selectedAuthors,
    setSelectedAuthors,
    selectedYears,
    setSelectedYears,
    availableAuthors,
    availableYears,
    searchInBg,
    loadMore,
    clearFilters,
  } = useSearch();

  const [refreshing, setRefreshing] = useState(false);

  // Add to project modal state
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [selectedPaperForProject, setSelectedPaperForProject] = useState<Paper | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);

  // Filter modal state
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [authorSearchText, setAuthorSearchText] = useState('');

  const primaryBtnTextColor = theme === 'dark' ? '#000000' : '#ffffff';
  const activeFilterCount = selectedAuthors.length + selectedYears.length;

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
      const res = await projectsApi.importAndAddPaper(projectId, selectedPaperForProject);
      if (res.success) {
        Alert.alert('✅ Added to Project', `"${selectedPaperForProject.title}" has been added to "${projectName}".`);
      } else {
        Alert.alert('Error', res.error || 'Failed to add paper to project');
      }
    } catch (err: any) {
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
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1, marginRight: 8 }}>
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

            <TouchableOpacity
              style={[
                styles.filterChip,
                { backgroundColor: colors.card, borderColor: colors.border },
                activeFilterCount > 0 && { backgroundColor: colors.primary + '20', borderColor: colors.primary }
              ]}
              onPress={() => setShowFilterModal(true)}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Filter size={13} color={activeFilterCount > 0 ? colors.primary : colors.textMuted} />
                <Text style={[
                  styles.filterChipText,
                  { color: colors.textMuted, marginLeft: 4 },
                  activeFilterCount > 0 && { color: colors.primary, fontWeight: '700' }
                ]}>
                  Filter {activeFilterCount > 0 ? `(${activeFilterCount})` : ''}
                </Text>
              </View>
            </TouchableOpacity>
          </ScrollView>

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

        {/* Active Filters Row */}
        {activeFilterCount > 0 && (
          <View style={styles.activeFiltersRow}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {selectedYears.map((year) => (
                <TouchableOpacity
                  key={`year-${year}`}
                  style={[styles.activeTag, { backgroundColor: colors.primary + '20', borderColor: colors.primary }]}
                  onPress={() => setSelectedYears((prev) => prev.filter((y) => y !== year))}
                >
                  <Calendar size={11} color={colors.primary} />
                  <Text style={[styles.activeTagText, { color: colors.primary }]}>{year}</Text>
                  <X size={11} color={colors.primary} style={{ marginLeft: 3 }} />
                </TouchableOpacity>
              ))}
              {selectedAuthors.map((author) => (
                <TouchableOpacity
                  key={`author-${author}`}
                  style={[styles.activeTag, { backgroundColor: colors.primary + '20', borderColor: colors.primary }]}
                  onPress={() => setSelectedAuthors((prev) => prev.filter((a) => a !== author))}
                >
                  <User size={11} color={colors.primary} />
                  <Text style={[styles.activeTagText, { color: colors.primary }]} numberOfLines={1}>
                    {author}
                  </Text>
                  <X size={11} color={colors.primary} style={{ marginLeft: 3 }} />
                </TouchableOpacity>
              ))}
              <TouchableOpacity onPress={clearFilters} style={styles.clearFiltersBtn}>
                <Text style={[styles.clearFiltersBtnText, { color: colors.primary }]}>Clear All</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        )}
      </View>

      {/* Main Content Area */}
      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>Fetching research papers...</Text>
        </View>
      ) : viewMode === 'list' ? (
        <FlatList<Paper>
          data={filteredPapers}
          keyExtractor={(item: Paper) => item.id}
          renderItem={({ item }: { item: Paper }) => (
            <PaperCard
              paper={item}
              onPress={() => onSelectPaper(item.id)}
              onToggleSave={() => handleToggleSave(item.id)}
            />
          )}
          contentContainerStyle={styles.listContent}
          onEndReached={() => {
            if (hasMore && !loadingMore && !loading) {
              loadMore();
            }
          }}
          onEndReachedThreshold={0.5}
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
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.footerLoaderText, { color: colors.textMuted }]}>
                  Loading 10 more research papers...
                </Text>
              </View>
            ) : hasMore && filteredPapers.length > 0 ? (
              <View style={styles.footerLoadMoreContainer}>
                <TouchableOpacity
                  style={[styles.loadMoreBtn, { backgroundColor: colors.primary }]}
                  onPress={() => loadMore()}
                  activeOpacity={0.8}
                >
                  <Sparkles size={16} color={primaryBtnTextColor} style={{ marginRight: 8 }} />
                  <Text style={[styles.loadMoreBtnText, { color: primaryBtnTextColor }]}>
                    Load 10 More Papers ({filteredPapers.length} loaded)
                  </Text>
                </TouchableOpacity>
              </View>
            ) : !hasMore && filteredPapers.length > 0 ? (
              <View style={styles.footerEnd}>
                <Text style={[styles.footerEndText, { color: colors.textMuted }]}>
                  ✨ All available research papers loaded ({filteredPapers.length} papers)
                </Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            searchError ? (
              <View style={styles.emptyState}>
                <AlertCircle size={40} color="#ef4444" style={{ marginBottom: 12 }} />
                <Text style={[styles.emptyTitle, { color: colors.text, textAlign: 'center' }]}>
                  Network Search Failure
                </Text>
                <Text style={[styles.emptySub, { color: colors.textMuted, textAlign: 'center', marginBottom: 16 }]}>
                  {searchError}
                </Text>
                <TouchableOpacity
                  style={[styles.resetFilterBtn, { backgroundColor: colors.primary }]}
                  onPress={() => searchInBg(searchQuery, selectedSort)}
                >
                  <Text style={[styles.resetFilterBtnText, { color: primaryBtnTextColor }]}>
                    Retry Search
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                  {searchQuery.length === 0
                    ? 'Search for research'
                    : activeFilterCount > 0
                    ? 'No papers match filters'
                    : 'No papers found'}
                </Text>
                <Text style={[styles.emptySub, { color: colors.textMuted }]}>
                  {searchQuery.length === 0
                    ? 'Type in the search bar above to discover interesting research papers.'
                    : activeFilterCount > 0
                    ? 'Try adjusting or clearing your author/year filters.'
                    : 'Try adjusting your search terms to find papers.'}
                </Text>
                {activeFilterCount > 0 && (
                  <TouchableOpacity
                    style={[styles.resetFilterBtn, { backgroundColor: colors.primary }]}
                    onPress={clearFilters}
                  >
                    <Text style={[styles.resetFilterBtnText, { color: primaryBtnTextColor }]}>
                      Clear Active Filters
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )
          }
        />
      ) : (
        <View style={styles.swipeContainer}>
          <Text style={[styles.swipeInstruction, { color: colors.textMuted }]}>
            Swipe left/right to browse abstracts • Tap card to save
          </Text>
          <FlatList<Paper>
            data={filteredPapers}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item: Paper) => item.id}
            renderItem={renderSwipeCard}
            contentContainerStyle={styles.swipeListContent}
            onEndReached={() => {
              if (hasMore && !loadingMore && !loading) {
                loadMore();
              }
            }}
            onEndReachedThreshold={0.5}
            ListFooterComponent={
              hasMore && filteredPapers.length > 0 ? (
                <View style={[styles.swipeCardContainer, { width: screenWidth }]}>
                  <View style={[styles.swipeCard, styles.swipeLoadMoreCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={{ alignItems: 'center', marginVertical: 'auto' }}>
                      <Sparkles size={42} color={colors.primary} style={{ marginBottom: 16 }} />
                      <Text style={[styles.swipeLoadMoreTitle, { color: colors.text }]}>
                        {loadingMore ? 'Fetching Next Batch...' : 'Want to explore more?'}
                      </Text>
                      <Text style={[styles.swipeLoadMoreSub, { color: colors.textMuted }]}>
                        {loadingMore
                          ? 'Loading 10 additional research papers from OpenAlex & Semantic Scholar...'
                          : `You've viewed ${filteredPapers.length} papers. Tap below to load 10 more papers.`}
                      </Text>
                      <TouchableOpacity
                        style={[styles.swipeLoadMoreActionBtn, { backgroundColor: colors.primary, opacity: loadingMore ? 0.6 : 1 }]}
                        disabled={loadingMore}
                        onPress={() => loadMore()}
                        activeOpacity={0.85}
                      >
                        {loadingMore ? (
                          <ActivityIndicator size="small" color={primaryBtnTextColor} />
                        ) : (
                          <Text style={[styles.swipeLoadMoreActionBtnText, { color: primaryBtnTextColor }]}>
                            Load 10 More Papers
                          </Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ) : !hasMore && filteredPapers.length > 0 ? (
                <View style={[styles.swipeCardContainer, { width: screenWidth }]}>
                  <View style={[styles.swipeCard, styles.swipeLoadMoreCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={{ alignItems: 'center', marginVertical: 'auto' }}>
                      <Check size={42} color={colors.primary} style={{ marginBottom: 16 }} />
                      <Text style={[styles.swipeLoadMoreTitle, { color: colors.text }]}>
                        All Papers Loaded!
                      </Text>
                      <Text style={[styles.swipeLoadMoreSub, { color: colors.textMuted }]}>
                        You have viewed all {filteredPapers.length} available papers for this search.
                      </Text>
                    </View>
                  </View>
                </View>
              ) : null
            }
            ListEmptyComponent={
              <View style={[styles.emptyState, { width: screenWidth - 32, marginHorizontal: 16 }]}>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                  {searchQuery.length === 0
                    ? 'Search for research'
                    : activeFilterCount > 0
                    ? 'No papers match filters'
                    : 'No papers found'}
                </Text>
                <Text style={[styles.emptySub, { color: colors.textMuted }]}>
                  {searchQuery.length === 0
                    ? 'Type in the search bar above to discover interesting research papers.'
                    : activeFilterCount > 0
                    ? 'Try adjusting or clearing your author/year filters.'
                    : 'Try adjusting your search terms to find papers.'}
                </Text>
                {activeFilterCount > 0 && (
                  <TouchableOpacity
                    style={[styles.resetFilterBtn, { backgroundColor: colors.primary }]}
                    onPress={clearFilters}
                  >
                    <Text style={[styles.resetFilterBtnText, { color: primaryBtnTextColor }]}>
                      Clear Active Filters
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            }
          />
        </View>
      )}

      {/* Author & Year Filter Modal */}
      <Modal visible={showFilterModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.filterModalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Filter size={18} color={colors.primary} />
                <Text style={[styles.modalTitle, { color: colors.text, marginLeft: 8 }]}>Filter Research</Text>
              </View>
              <TouchableOpacity onPress={() => setShowFilterModal(false)} style={styles.modalCloseBtn}>
                <X size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: screenHeight * 0.55 }} showsVerticalScrollIndicator={false}>
              {/* Year Filter Section */}
              <View style={styles.filterSection}>
                <Text style={[styles.filterSectionTitle, { color: colors.text }]}>📅 Filter by Year</Text>
                <View style={styles.chipGrid}>
                  {availableYears.length > 0 ? (
                    availableYears.map((year) => {
                      const isSelected = selectedYears.includes(year);
                      return (
                        <TouchableOpacity
                          key={year}
                          style={[
                            styles.modalOptionChip,
                            { backgroundColor: colors.background, borderColor: colors.border },
                            isSelected && { backgroundColor: colors.primary, borderColor: colors.primary }
                          ]}
                          onPress={() => {
                            setSelectedYears((prev) =>
                              isSelected ? prev.filter((y) => y !== year) : [...prev, year]
                            );
                          }}
                        >
                          {isSelected && <Check size={12} color={primaryBtnTextColor} style={{ marginRight: 4 }} />}
                          <Text
                            style={[
                              styles.modalOptionText,
                              { color: colors.text },
                              isSelected && { color: primaryBtnTextColor, fontWeight: '700' }
                            ]}
                          >
                            {year}
                          </Text>
                        </TouchableOpacity>
                      );
                    })
                  ) : (
                    <Text style={[styles.noItemsText, { color: colors.textMuted }]}>No year tags available yet</Text>
                  )}
                </View>
              </View>

              {/* Author Filter Section */}
              <View style={styles.filterSection}>
                <Text style={[styles.filterSectionTitle, { color: colors.text }]}>👤 Filter by Author</Text>
                {availableAuthors.length > 5 && (
                  <TextInput
                    style={[styles.authorSearchInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                    placeholder="Search author name..."
                    placeholderTextColor={colors.textMuted}
                    value={authorSearchText}
                    onChangeText={setAuthorSearchText}
                  />
                )}
                <View style={styles.authorListContainer}>
                  {availableAuthors.filter(a => a.toLowerCase().includes(authorSearchText.toLowerCase())).length > 0 ? (
                    availableAuthors
                      .filter(a => a.toLowerCase().includes(authorSearchText.toLowerCase()))
                      .slice(0, 35)
                      .map((author) => {
                        const isSelected = selectedAuthors.includes(author);
                        return (
                          <TouchableOpacity
                            key={author}
                            style={[
                              styles.authorRow,
                              { backgroundColor: colors.background, borderColor: colors.border },
                              isSelected && { backgroundColor: colors.primary + '15', borderColor: colors.primary }
                            ]}
                            onPress={() => {
                              setSelectedAuthors((prev) =>
                                isSelected ? prev.filter((a) => a !== author) : [...prev, author]
                              );
                            }}
                          >
                            <View style={[styles.checkbox, { borderColor: colors.border }, isSelected && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
                              {isSelected && <Check size={11} color={primaryBtnTextColor} />}
                            </View>
                            <Text
                              style={[
                                styles.authorRowText,
                                { color: colors.text },
                                isSelected && { fontWeight: '700', color: colors.primary }
                              ]}
                              numberOfLines={1}
                            >
                              {author}
                            </Text>
                          </TouchableOpacity>
                        );
                      })
                  ) : (
                    <Text style={[styles.noItemsText, { color: colors.textMuted }]}>No matching authors found</Text>
                  )}
                </View>
              </View>
            </ScrollView>

            {/* Modal Footer Actions */}
            <View style={styles.modalActionRow}>
              {activeFilterCount > 0 && (
                <TouchableOpacity onPress={clearFilters} style={[styles.modalSecondaryBtn, { borderColor: colors.border }]}>
                  <Text style={[styles.modalSecondaryBtnText, { color: colors.text }]}>Reset</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.modalPrimaryBtn, { backgroundColor: colors.primary, flex: 1, marginLeft: activeFilterCount > 0 ? 10 : 0 }]}
                onPress={() => setShowFilterModal(false)}
              >
                <Text style={[styles.modalPrimaryBtnText, { color: primaryBtnTextColor }]}>
                  Apply Filters {activeFilterCount > 0 ? `(${activeFilterCount})` : ''}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
  activeFiltersRow: {
    flexDirection: 'row',
    marginTop: 8,
    paddingTop: 4,
  },
  activeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
    marginRight: 6,
  },
  activeTagText: {
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 4,
  },
  clearFiltersBtn: {
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  clearFiltersBtnText: {
    fontSize: 11,
    fontWeight: '700',
    textDecorationLine: 'underline',
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
  footerLoader: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  footerLoaderText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 8,
  },
  footerLoadMoreContainer: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  loadMoreBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  footerEnd: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerEndText: {
    fontSize: 12,
    fontWeight: '600',
  },
  swipeLoadMoreCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
    textAlign: 'center',
  },
  swipeLoadMoreTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  swipeLoadMoreSub: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  swipeLoadMoreActionBtn: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 200,
  },
  swipeLoadMoreActionBtnText: {
    fontSize: 14,
    fontWeight: '700',
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
  resetFilterBtn: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  resetFilterBtnText: {
    fontSize: 13,
    fontWeight: '700',
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
    padding: 12,
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
  filterModalCard: {
    width: '100%',
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
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
  filterSection: {
    marginBottom: 16,
  },
  filterSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  modalOptionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  modalOptionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  noItemsText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  authorSearchInput: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    marginBottom: 8,
  },
  authorListContainer: {
    gap: 6,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  checkbox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  authorRowText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  modalActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  modalSecondaryBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  modalSecondaryBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  modalPrimaryBtn: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalPrimaryBtnText: {
    fontSize: 13,
    fontWeight: '700',
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
