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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Users, Plus, X, Paperclip, Send, BookOpen, Tag } from 'lucide-react-native';
import { Community, CommunityPost, Paper } from '../types';
import { communityApi, papersApi, cachePapers } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { PaperCard } from '../components/PaperCard';

interface CommunityScreenProps {
  onSelectPaper?: (paperId: string) => void;
}

export const CommunityScreen: React.FC<CommunityScreenProps> = ({ onSelectPaper }) => {
  const { colors, theme } = useTheme();
  const { user } = useAuth();
  
  // State
  const [communities, setCommunities] = useState<Community[]>([]);
  const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Group creation state
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [groupSubject, setGroupSubject] = useState('Computer Science');
  const [groupIcon, setGroupIcon] = useState('🔬');

  // Post creation state
  const [postContent, setPostContent] = useState('');
  const [attachedPaper, setAttachedPaper] = useState<Paper | null>(null);
  const [isPaperSelectorOpen, setIsPaperSelectorOpen] = useState(false);
  const [savedPapers, setSavedPapers] = useState<Paper[]>([]);
  const [loadingPapers, setLoadingPapers] = useState(false);

  const selectCommunityWithDetails = async (communityId: string) => {
    try {
      const res = await communityApi.getById(communityId);
      if (res.success && res.data) {
        setSelectedCommunity(res.data);
      }
    } catch (err) {
      console.warn('Failed to load community details:', err);
    }
  };

  const fetchCommunities = async () => {
    try {
      const res = await communityApi.getAll();
      if (res.success && res.data) {
        setCommunities(res.data);
        
        // Retain or select active community
        if (res.data.length > 0) {
          const activeId = selectedCommunity?.id || res.data[0]?.id;
          if (activeId) {
            await selectCommunityWithDetails(activeId);
          }
        }
      }
    } catch (err) {
      console.warn('Failed to load communities:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCommunities();
  }, []);

  // Poll for new messages every 3 seconds to keep chat real-time
  useEffect(() => {
    if (!selectedCommunity) return;

    const pollInterval = setInterval(async () => {
      try {
        const res = await communityApi.getById(selectedCommunity.id);
        if (res.success && res.data) {
          const newPostsJson = JSON.stringify(res.data.posts || []);
          const currentPostsJson = JSON.stringify(selectedCommunity.posts || []);
          if (newPostsJson !== currentPostsJson) {
            setSelectedCommunity(res.data);
          }
        }
      } catch (err) {
        console.warn('Failed to poll community posts:', err);
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [selectedCommunity?.id]);

  const handleJoin = async (id: string) => {
    try {
      const res = await communityApi.join(id);
      if (res.success) {
        setCommunities((prev) =>
          prev.map((c) => (c.id === id ? { ...c, isMember: !c.isMember, memberCount: c.isMember ? c.memberCount - 1 : c.memberCount + 1 } : c))
        );
        // Sync banner state
        if (selectedCommunity && selectedCommunity.id === id) {
          setSelectedCommunity(prev => prev ? { ...prev, isMember: !prev.isMember, memberCount: prev.isMember ? prev.memberCount - 1 : prev.memberCount + 1 } : null);
        }
      }
    } catch (err) {
      console.warn('Join error:', err);
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert('Group Name Required', 'Please enter a name for the research group.');
      return;
    }

    try {
      const res = await communityApi.create({
        name: groupName.trim(),
        description: groupDesc.trim(),
        subject: groupSubject,
        icon: groupIcon,
      });

      if (res.success) {
        setGroupName('');
        setGroupDesc('');
        setGroupSubject('Computer Science');
        setGroupIcon('🔬');
        setIsGroupModalOpen(false);
        await fetchCommunities();
        
        // Set active to the new one
        if (res.data) {
          setSelectedCommunity(res.data);
        }
        Alert.alert('Success', 'Research group created successfully!');
      } else {
        Alert.alert('Error', res.error || 'Failed to create research group.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'An error occurred.');
    }
  };

  const openPaperSelector = async () => {
    setIsPaperSelectorOpen(true);
    setLoadingPapers(true);
    try {
      const res = await papersApi.getAll({ tag: 'saved' });
      if (res.success) {
        setSavedPapers(res.data);
      }
    } catch (err) {
      console.warn('Failed to load saved papers:', err);
    } finally {
      setLoadingPapers(false);
    }
  };

  const handleAttachPaper = (paper: Paper) => {
    setAttachedPaper(paper);
    setIsPaperSelectorOpen(false);
  };

  const handleSendPost = async () => {
    if (!postContent.trim() && !attachedPaper) {
      Alert.alert('Empty Post', 'Please type a message or attach a paper to post.');
      return;
    }
    if (!selectedCommunity) return;

    const tempPostId = `temp-${Date.now()}`;
    const papersAttached = attachedPaper ? [attachedPaper] : [];

    const tempPost: CommunityPost = {
      id: tempPostId,
      content: postContent.trim(),
      author: { name: 'You (Researcher)', role: 'Contributor', avatar_initials: 'ME' },
      likes: 0,
      created_at: new Date().toISOString(),
      papers: papersAttached
    };

    // Optimistically update the UI so they see the message instantly
    setSelectedCommunity(prev => {
      if (!prev) return null;
      return {
        ...prev,
        posts: [tempPost, ...(prev.posts || [])]
      };
    });

    const typedContent = postContent.trim();
    const paperIds = attachedPaper ? [attachedPaper.id] : [];

    setPostContent('');
    setAttachedPaper(null);

    try {
      const res = await communityApi.createPost(selectedCommunity.id, {
        content: typedContent,
        paper_ids: paperIds,
      });

      if (!res.success) {
        // Revert optimistic update on failure
        setSelectedCommunity(prev => {
          if (!prev) return null;
          return {
            ...prev,
            posts: (prev.posts || []).filter(p => p.id !== tempPostId)
          };
        });
        Alert.alert('Error', res.error || 'Failed to post message.');
      } else {
        // Swap out the temp post with the real one returned from server
        setSelectedCommunity(prev => {
          if (!prev) return null;
          return {
            ...prev,
            posts: (prev.posts || []).map(p => p.id === tempPostId ? res.data : p)
          };
        });
      }
    } catch (err: any) {
      // Revert optimistic update on error
      setSelectedCommunity(prev => {
        if (!prev) return null;
        return {
          ...prev,
          posts: (prev.posts || []).filter(p => p.id !== tempPostId)
        };
      });
      Alert.alert('Error', err.message || 'An error occurred.');
    }
  };

  const handleToggleSavePaper = async (paperId: string) => {
    try {
      const res = await papersApi.toggleSave(paperId);
      if (res.success && res.data && selectedCommunity) {
        const updatedPosts = (selectedCommunity.posts || []).map((post) => {
          if (post.papers && post.papers.length > 0 && post.papers[0].id === paperId) {
            return {
              ...post,
              papers: [{ ...post.papers[0], saved: res.data?.saved }]
            };
          }
          return post;
        });
        setSelectedCommunity({
          ...selectedCommunity,
          posts: updatedPosts
        });
      }
    } catch (err) {
      console.warn('Failed to save paper:', err);
    }
  };

  const handleDeletePost = (postId: string) => {
    if (!selectedCommunity) return;
    
    Alert.alert(
      'Delete Message',
      'Do you want to delete this message?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete for me', 
          onPress: () => {
            // Only hide locally
            setSelectedCommunity(prev => {
              if (!prev) return prev;
              return {
                ...prev,
                posts: prev.posts?.filter(p => p.id !== postId)
              };
            });
          }
        },
        { 
          text: 'Delete for everyone', 
          style: 'destructive', 
          onPress: async () => {
            try {
              // Delete from server
              await communityApi.deletePost(selectedCommunity.id, postId);
              // Update local state
              setSelectedCommunity(prev => {
                if (!prev) return prev;
                return {
                  ...prev,
                  posts: prev.posts?.filter(p => p.id !== postId)
                };
              });
            } catch (err) {
              console.warn('Failed to delete post:', err);
            }
          }
        }
      ]
    );
  };

  // Button text/icon dynamic styling matching black/white theme
  const primaryBtnTextColor = theme === 'dark' ? '#000000' : '#ffffff';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Text style={[styles.title, { color: colors.text }]}>Communities</Text>
          <TouchableOpacity 
            style={[styles.createBtn, { backgroundColor: colors.primary }]}
            onPress={() => setIsGroupModalOpen(true)}
          >
            <Plus size={16} color={primaryBtnTextColor} />
            <Text style={[styles.createBtnText, { color: primaryBtnTextColor }]}>New Group</Text>
          </TouchableOpacity>
        </View>

        <FlatList<Community>
          horizontal
          data={communities}
          keyExtractor={(item: Community) => item.id}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }: { item: Community }) => (
            <TouchableOpacity
              style={[
                styles.commChip,
                { backgroundColor: colors.card, borderColor: colors.border },
                selectedCommunity?.id === item.id && { backgroundColor: colors.primary, borderColor: colors.primary },
              ]}
              onPress={() => selectCommunityWithDetails(item.id)}
            >
              <Text
                style={[
                  styles.commChipText,
                  { color: colors.textMuted },
                  selectedCommunity?.id === item.id && { color: primaryBtnTextColor, fontWeight: '700' },
                ]}
              >
                {item.icon || '💬'} {item.name}
              </Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.chipList}
        />
      </View>

      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : selectedCommunity ? (
        <KeyboardAvoidingView 
          style={{ flex: 1 }} 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          {/* Active Group Chat Banner */}
          <View style={[styles.banner, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
            <View style={styles.bannerInfo}>
              <Text style={[styles.bannerTitle, { color: colors.text }]}>{selectedCommunity.name}</Text>
              <Text style={[styles.bannerDesc, { color: colors.textMuted }]}>{selectedCommunity.description}</Text>
              <Text style={[styles.bannerMeta, { color: colors.primary }]}>
                {selectedCommunity.memberCount || 1} members · {selectedCommunity.subject}
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.joinBtn,
                { backgroundColor: colors.primary },
                selectedCommunity.isMember && { backgroundColor: colors.border },
              ]}
              onPress={() => handleJoin(selectedCommunity.id)}
            >
              <Text style={[styles.joinBtnText, { color: selectedCommunity.isMember ? colors.text : primaryBtnTextColor }]}>
                {selectedCommunity.isMember ? 'Joined' : 'Join'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Posts List */}
          <FlatList<CommunityPost>
            data={selectedCommunity.posts || []}
            keyExtractor={(item: CommunityPost) => item.id}
            renderItem={({ item }: { item: CommunityPost }) => {
              // Determine if the current user sent this message
              const isOwnMessage = 
                item.author?.avatar_initials === 'ME' ||
                item.author?.name === 'You (Researcher)' ||
                (user && item.author?.name === user.name) ||
                (user && item.user_id === user.id);

              return (
                <View style={[
                  styles.messageRow,
                  isOwnMessage ? styles.messageRowRight : styles.messageRowLeft,
                ]}>
                  {/* Avatar on the left for received messages */}
                  {!isOwnMessage && (
                    <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                      <Text style={[styles.avatarText, { color: primaryBtnTextColor }]}>
                        {item.author?.avatar_initials || 'U'}
                      </Text>
                    </View>
                  )}

                  <TouchableOpacity 
                    activeOpacity={isOwnMessage ? 0.7 : 1}
                    onLongPress={() => isOwnMessage && handleDeletePost(item.id)}
                    style={[
                    styles.messageBubble,
                    isOwnMessage
                      ? [styles.messageBubbleSent, { backgroundColor: colors.primary }]
                      : [styles.messageBubbleReceived, { backgroundColor: colors.card, borderColor: colors.border }],
                  ]}>
                    {/* Sender name for received messages */}
                    {!isOwnMessage && (
                      <View style={styles.bubbleHeader}>
                        <Text style={[styles.authorName, { color: colors.text }]}>
                          {item.author?.name || 'Researcher'}
                        </Text>
                        <Text style={[styles.authorRole, { color: colors.textMuted }]}>
                          {item.author?.role || 'Member'}
                        </Text>
                      </View>
                    )}

                    {item.content ? (
                      <Text style={[
                        styles.postContent,
                        isOwnMessage ? { color: primaryBtnTextColor } : { color: colors.text },
                      ]}>
                        {item.content}
                      </Text>
                    ) : null}

                    {/* Attached Papers Display */}
                    {item.papers && item.papers.length > 0 && (
                      <View style={styles.attachedPaperWrapper}>
                        <PaperCard
                          paper={item.papers[0]}
                          onPress={() => {
                            if (item.papers && item.papers[0]) {
                              cachePapers([item.papers[0]]);
                            }
                            if (onSelectPaper && item.papers && item.papers[0]) {
                              onSelectPaper(item.papers[0].id);
                            }
                          }}
                          onToggleSave={() => handleToggleSavePaper(item.papers![0].id)}
                        />
                      </View>
                    )}
                  </TouchableOpacity>

                  {/* Avatar on the right for sent messages */}
                  {isOwnMessage && (
                    <View style={[styles.avatar, { backgroundColor: colors.primary, marginLeft: 8, marginRight: 0 }]}>
                      <Text style={[styles.avatarText, { color: primaryBtnTextColor }]}>
                        {user?.avatar_initials || 'ME'}
                      </Text>
                    </View>
                  )}
                </View>
              );
            }}
            contentContainerStyle={styles.postList}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  fetchCommunities();
                }}
                tintColor={colors.primary}
              />
            }
          />

          {/* Post Message Bar */}
          {selectedCommunity.isMember ? (
            <View style={[styles.inputContainer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
              {/* Attachment preview banner */}
              {attachedPaper && (
                <View style={[styles.attachmentPreview, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <BookOpen size={14} color={colors.primary} />
                  <Text style={[styles.attachmentName, { color: colors.text }]} numberOfLines={1}>
                    Attached: {attachedPaper.title}
                  </Text>
                  <TouchableOpacity onPress={() => setAttachedPaper(null)} style={styles.removeAttachment}>
                    <X size={14} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              )}

              <View style={styles.inputRow}>
                <TouchableOpacity 
                  style={[styles.attachBtn, { backgroundColor: colors.background }]} 
                  onPress={openPaperSelector}
                >
                  <Paperclip size={18} color={attachedPaper ? colors.primary : colors.textMuted} />
                </TouchableOpacity>

                <TextInput
                  style={[styles.textInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  placeholder="Share a thought or paper..."
                  placeholderTextColor={colors.textMuted}
                  value={postContent}
                  onChangeText={setPostContent}
                  multiline
                />

                <TouchableOpacity 
                  style={[styles.sendBtn, { backgroundColor: colors.primary }]} 
                  onPress={handleSendPost}
                >
                  <Send size={16} color={primaryBtnTextColor} />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={[styles.lockedInput, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
              <Text style={[styles.lockedText, { color: colors.textMuted }]}>
                Join this community group to attach papers and post messages.
              </Text>
            </View>
          )}
        </KeyboardAvoidingView>
      ) : (
        <View style={styles.emptyState}>
          <Users size={48} color={colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No Groups Available</Text>
          <Text style={[styles.emptySub, { color: colors.textMuted }]}>
            Tap "New Group" at the top right to start a shared research space.
          </Text>
        </View>
      )}

      {/* Create Research Group Modal */}
      <Modal visible={isGroupModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ width: '100%' }}
          >
            <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Create Research Group</Text>
                <TouchableOpacity onPress={() => setIsGroupModalOpen(false)} style={styles.modalCloseBtn}>
                  <X size={20} color={colors.text} />
                </TouchableOpacity>
              </View>

              <View style={styles.modalBody}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Group Name</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  placeholder="e.g. Astrophysics Discussion"
                  placeholderTextColor={colors.textMuted}
                  value={groupName}
                  onChangeText={setGroupName}
                />

                <Text style={[styles.inputLabel, { color: colors.text }]}>Description</Text>
                <TextInput
                  style={[styles.input, styles.descInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  placeholder="Talk about research area, rules, focus..."
                  placeholderTextColor={colors.textMuted}
                  multiline
                  numberOfLines={3}
                  value={groupDesc}
                  onChangeText={setGroupDesc}
                />

                <View style={styles.rowFields}>
                  <View style={{ flex: 0.58 }}>
                    <Text style={[styles.inputLabel, { color: colors.text }]}>Subject Area</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                      placeholder="Computer Science, Physics, etc."
                      placeholderTextColor={colors.textMuted}
                      value={groupSubject}
                      onChangeText={setGroupSubject}
                    />
                  </View>
                  <View style={{ flex: 0.38 }}>
                    <Text style={[styles.inputLabel, { color: colors.text }]}>Group Icon</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border, textAlign: 'center' }]}
                      placeholder="🔬"
                      placeholderTextColor={colors.textMuted}
                      value={groupIcon}
                      onChangeText={setGroupIcon}
                    />
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.submitBtn, { backgroundColor: colors.primary }]}
                  onPress={handleCreateGroup}
                >
                  <Text style={[styles.submitBtnText, { color: primaryBtnTextColor }]}>Create Group</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Attach Paper Selector Modal */}
      <Modal visible={isPaperSelectorOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, styles.pickerModalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Attach Saved Research Paper</Text>
              <TouchableOpacity onPress={() => setIsPaperSelectorOpen(false)} style={styles.modalCloseBtn}>
                <X size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            {loadingPapers ? (
              <View style={styles.pickerCenter}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : (
              <FlatList<Paper>
                data={savedPapers}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ paddingBottom: 20 }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.savedPaperItem, { backgroundColor: colors.background, borderColor: colors.border }]}
                    onPress={() => handleAttachPaper(item)}
                  >
                    <BookOpen size={16} color={colors.primary} style={styles.paperIconLeft} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.savedPaperTitle, { color: colors.text }]} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={[styles.savedPaperAuthors, { color: colors.textMuted }]} numberOfLines={1}>
                        {item.authors ? item.authors.join(', ') : 'Unknown'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View style={styles.pickerCenter}>
                    <BookOpen size={32} color={colors.textMuted} />
                    <Text style={[styles.emptyPickerText, { color: colors.textMuted }]}>
                      No bookmarked papers found. Save some papers in library/discover first!
                    </Text>
                  </View>
                }
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
  header: {
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
  title: {
    fontSize: 24,
    fontWeight: '800',
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  createBtnText: {
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4,
  },
  chipList: {
    paddingVertical: 4,
  },
  commChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  commChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  bannerInfo: {
    flex: 0.7,
  },
  bannerTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  bannerDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  bannerMeta: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 6,
  },
  joinBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  joinBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  postList: {
    padding: 16,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-end',
  },
  messageRowLeft: {
    justifyContent: 'flex-start',
    paddingRight: 40,
  },
  messageRowRight: {
    justifyContent: 'flex-end',
    paddingLeft: 40,
  },
  messageBubble: {
    borderRadius: 16,
    padding: 12,
    maxWidth: '80%',
    flex: 1,
  },
  messageBubbleSent: {
    borderBottomRightRadius: 4,
  },
  messageBubbleReceived: {
    borderBottomLeftRadius: 4,
    borderWidth: 1,
  },
  bubbleHeader: {
    marginBottom: 4,
  },
  postCard: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarText: {
    fontWeight: '700',
    fontSize: 14,
  },
  authorMeta: {},
  authorName: {
    fontSize: 14,
    fontWeight: '600',
  },
  authorRole: {
    fontSize: 11,
  },
  postContent: {
    fontSize: 14,
    lineHeight: 20,
  },
  attachedPaperWrapper: {
    marginTop: 10,
    marginBottom: 4,
  },
  postFooter: {
    marginTop: 12,
    flexDirection: 'row',
  },
  postAction: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 4,
  },
  actionText: {
    fontSize: 12,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 30,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 12,
  },
  emptySub: {
    fontSize: 14,
    textAlign: 'center',
    width: 240,
    marginTop: 4,
  },
  inputContainer: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  attachmentPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    marginBottom: 8,
  },
  attachmentName: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
    flex: 1,
  },
  removeAttachment: {
    padding: 2,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  attachBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 14,
    maxHeight: 100,
    marginRight: 8,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockedInput: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  lockedText: {
    fontSize: 13,
    textAlign: 'center',
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
  pickerModalCard: {
    height: '75%',
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
  rowFields: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  submitBtn: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  pickerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  savedPaperItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
  },
  paperIconLeft: {
    marginRight: 10,
  },
  savedPaperTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  savedPaperAuthors: {
    fontSize: 12,
    marginTop: 2,
  },
  emptyPickerText: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 10,
  },
});
