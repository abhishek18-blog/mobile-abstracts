import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Users,
  Plus,
  X,
  Paperclip,
  Send,
  BookOpen,
  Tag,
  Lock,
  ArrowLeft,
  Search,
  Check,
  CheckCheck,
  Shield,
  Trash2,
  Info,
  Crown,
  UserCheck,
  UserMinus,
} from 'lucide-react-native';
import { Community, CommunityPost, Paper, CommunityMemberInfo } from '../types';
import { communityApi, papersApi, cachePapers, OFFLINE_SAVED_PAPERS_KEY } from '../services/api';
import { encryptionService } from '../services/encryptionService';
import { notificationService } from '../services/notificationService';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { PaperCard } from '../components/PaperCard';

interface CommunityScreenProps {
  onSelectPaper?: (paperId: string) => void;
}

const AVATAR_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#06b6d4'];
const getAvatarColor = (id: string) => {
  let hash = 0;
  for (let i = 0; i < (id || '').length; i++) hash = (hash << 5) - hash + id.charCodeAt(i);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

// Format realtime timestamp matching WhatsApp (e.g. 2:37 pm)
const formatMessageTime = (dateStr?: string): string => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase();
  } catch {
    return '';
  }
};

// Sort posts chronologically: oldest first, latest at bottom
const sortPostsChronological = (posts: CommunityPost[]): CommunityPost[] => {
  return [...posts].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
};

export const CommunityScreen: React.FC<CommunityScreenProps> = ({ onSelectPaper }) => {
  const { colors, theme } = useTheme();
  const { user, isGuest, logout } = useAuth();
  
  // State
  const [communities, setCommunities] = useState<Community[]>([]);
  const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [filterTab, setFilterTab] = useState<'all' | 'joined'>('all');

  const filteredCommunities = useMemo(() => {
    return communities.filter((c) => {
      if (filterTab === 'joined' && !c.isMember) return false;
      if (searchQuery.trim().length > 0) {
        const q = searchQuery.toLowerCase();
        const matchesName = c.name?.toLowerCase().includes(q);
        const matchesDesc = c.description?.toLowerCase().includes(q);
        const matchesSubject = c.subject?.toLowerCase().includes(q);
        return matchesName || matchesDesc || matchesSubject;
      }
      return true;
    });
  }, [communities, filterTab, searchQuery]);

  // Group creation state
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [groupSubject, setGroupSubject] = useState('Computer Science');
  const [groupIcon, setGroupIcon] = useState('🔬');

  // Group Info / Admin management state
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);

  // Post creation state
  const [postContent, setPostContent] = useState('');
  const [attachedPaper, setAttachedPaper] = useState<Paper | null>(null);
  const [isPaperSelectorOpen, setIsPaperSelectorOpen] = useState(false);
  const [savedPapers, setSavedPapers] = useState<Paper[]>([]);
  const [loadingPapers, setLoadingPapers] = useState(false);
  const [paperSearchQuery, setPaperSearchQuery] = useState('');

  // Refs for auto-scroll and tracking received messages for notifications
  const flatListRef = useRef<FlatList<CommunityPost>>(null);
  const seenPostIdsRef = useRef<Set<string>>(new Set());

  // Initialize notification service on mount
  useEffect(() => {
    notificationService.initialize();
  }, []);

  // Determine whether current logged-in user is an admin of the active community
  const isCurrentUserAdmin = useMemo(() => {
    if (!selectedCommunity || !user) return false;
    const memberRecord = selectedCommunity.members?.find(m => m.id === user.id);
    if (memberRecord?.community_role) {
      return memberRecord.community_role === 'admin';
    }
    if (selectedCommunity.isAdmin !== undefined) return selectedCommunity.isAdmin;
    if (selectedCommunity.created_by && String(selectedCommunity.created_by) === String(user.id)) return true;
    return false;
  }, [selectedCommunity, user]);

  const promptGuestSignIn = (communityName?: string) => {
    Alert.alert(
      'Sign In Required',
      `Guests are in search and read-only mode. Please sign in as a registered researcher to ${communityName ? `view and participate in "${communityName}"` : 'create research groups and post messages'}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign In', onPress: () => logout() },
      ]
    );
  };

  const decryptPosts = async (posts: CommunityPost[], communityId: string): Promise<CommunityPost[]> => {
    return Promise.all(
      posts.map(async (p) => {
        if (encryptionService.isEncrypted(p.content)) {
          const decrypted = await encryptionService.decryptCommunityMessage(p.content, communityId);
          return { ...p, content: decrypted, isE2EE: true };
        }
        return p;
      })
    );
  };

  const selectCommunityWithDetails = async (communityId: string) => {
    if (isGuest) {
      promptGuestSignIn();
      return;
    }

    try {
      const res = await communityApi.getById(communityId);
      if (res.success && res.data) {
        const decryptedPosts = await decryptPosts(res.data.posts || [], communityId);
        // Sort chronologically: oldest at top, latest at bottom
        const sorted = sortPostsChronological(decryptedPosts);

        // Pre-populate seen IDs so device notifications don't fire for past messages
        sorted.forEach(p => seenPostIdsRef.current.add(p.id));

        let members: CommunityMemberInfo[] = res.data.members || [];
        if (members.length === 0 && user) {
          const isCreator = String(res.data.created_by) === String(user.id);
          members = [{
            id: user.id,
            name: user.name || 'You',
            avatar_initials: user.avatar_initials || 'ME',
            community_role: (res.data.isAdmin || isCreator) ? 'admin' : 'member',
          }];
        }
        setSelectedCommunity({ ...res.data, members, posts: sorted });

        // Scroll to the bottom showing the latest messages
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: false });
        }, 120);
      }
    } catch (err) {
      console.warn('Failed to load community details:', err);
    }
  };

  const handleCommunityPress = (community: Community) => {
    if (isGuest) {
      promptGuestSignIn(community.name);
      return;
    }
    selectCommunityWithDetails(community.id);
  };

  const fetchCommunities = async () => {
    try {
      const res = await communityApi.getAll();
      if (res.success && res.data) {
        // Sanitize out any legacy mock comm- entries
        const valid = res.data.filter(c => c && c.id && !c.id.startsWith('comm-'));
        const listToUse = valid.length > 0 ? valid : res.data;
        setCommunities(listToUse);

        // If a community was ALREADY open and user is not a guest, refresh its details
        if (selectedCommunity && !isGuest) {
          const stillExists = listToUse.find(c => c.id === selectedCommunity.id);
          if (stillExists) {
            await selectCommunityWithDetails(selectedCommunity.id);
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

  // Poll for new messages every 3 seconds to keep chat real-time (when inside a chat & not guest)
  useEffect(() => {
    if (isGuest || !selectedCommunity || !selectedCommunity.id || selectedCommunity.id.startsWith('comm-')) return;

    let consecutiveErrors = 0;
    const pollInterval = setInterval(async () => {
      // Circuit breaker: stop polling if too many consecutive errors (e.g. 404)
      if (consecutiveErrors >= 3) {
        clearInterval(pollInterval);
        return;
      }

      try {
        const res = await communityApi.getById(selectedCommunity.id);
        if (res.success && res.data) {
          consecutiveErrors = 0;
          const rawPosts = res.data.posts || [];
          
          // Check for any newly arrived posts
          const newUnseen = rawPosts.filter(p => !seenPostIdsRef.current.has(p.id));

          if (newUnseen.length > 0) {
            const decryptedUnseen = await decryptPosts(newUnseen, selectedCommunity.id);

            // Send push notification to user device if sent by another participant!
            decryptedUnseen.forEach(p => {
              seenPostIdsRef.current.add(p.id);
              const isOwnMessage =
                p.author?.avatar_initials === 'ME' ||
                p.author?.name === 'You (Researcher)' ||
                (user && p.author?.name === user.name) ||
                (user && p.user_id === user.id);

              if (!isOwnMessage) {
                notificationService.sendCommunityMessageNotification({
                  communityName: selectedCommunity.name,
                  senderName: p.author?.name || 'Researcher',
                  content: p.content,
                  communityId: selectedCommunity.id,
                  hasAttachment: !!(p.papers && p.papers.length > 0),
                });
              }
            });

            const allDecrypted = await decryptPosts(rawPosts, selectedCommunity.id);
            const chronological = sortPostsChronological(allDecrypted);
            setSelectedCommunity(prev => (prev ? { ...prev, ...res.data, posts: chronological } : null));

            setTimeout(() => {
              flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
          }
        } else {
          consecutiveErrors++;
        }
      } catch (err) {
        consecutiveErrors++;
        console.warn('Failed to poll community posts:', err);
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [selectedCommunity?.id, isGuest, user]);

  // Periodic background check across joined communities for device notifications when chat is not open
  useEffect(() => {
    if (isGuest || selectedCommunity) return;

    const bgInterval = setInterval(async () => {
      try {
        const res = await communityApi.getAll();
        if (res.success && res.data) {
          const joined = res.data.filter(c => c.isMember);
          for (const comm of joined) {
            const detailRes = await communityApi.getById(comm.id);
            if (detailRes.success && detailRes.data && detailRes.data.posts) {
              const unseen = detailRes.data.posts.filter(p => !seenPostIdsRef.current.has(p.id));
              if (unseen.length > 0) {
                const decrypted = await decryptPosts(unseen, comm.id);
                decrypted.forEach(p => {
                  seenPostIdsRef.current.add(p.id);
                  const isOwn =
                    p.author?.avatar_initials === 'ME' ||
                    p.author?.name === 'You (Researcher)' ||
                    (user && p.author?.name === user.name) ||
                    (user && p.user_id === user.id);
                  if (!isOwn) {
                    notificationService.sendCommunityMessageNotification({
                      communityName: comm.name,
                      senderName: p.author?.name || 'Researcher',
                      content: p.content,
                      communityId: comm.id,
                      hasAttachment: !!(p.papers && p.papers.length > 0),
                    });
                  }
                });
              }
            }
          }
        }
      } catch {}
    }, 8000);

    return () => clearInterval(bgInterval);
  }, [isGuest, selectedCommunity, user]);

  const handleJoin = async (id: string) => {
    if (isGuest) {
      promptGuestSignIn(selectedCommunity?.name);
      return;
    }
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
    if (isGuest) {
      promptGuestSignIn();
      return;
    }

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
        
        // Set active to the new one with creator having admin privileges
        if (res.data) {
          const newCommData: Community = {
            ...res.data,
            isAdmin: true,
            created_by: user?.id,
            members: user ? [{
              id: user.id,
              name: user.name || 'You',
              avatar_initials: user.avatar_initials || 'ME',
              community_role: 'admin',
            }] : [],
          };
          setSelectedCommunity(newCommData);
        }
        Alert.alert('Success', 'Research group created successfully!');
      } else {
        Alert.alert('Error', res.error || 'Failed to create research group.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'An error occurred.');
    }
  };

  const handleDeleteCommunity = () => {
    if (!selectedCommunity) return;

    Alert.alert(
      'Delete Community',
      `Are you sure you want to permanently delete "${selectedCommunity.name}"? All posts, discussions, and member associations will be erased.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await communityApi.deleteCommunity(selectedCommunity.id);
              if (res.success) {
                Alert.alert('Deleted', 'Community has been deleted.');
                setIsInfoModalOpen(false);
                setSelectedCommunity(null);
                await fetchCommunities();
              } else {
                Alert.alert('Error', res.error || 'Failed to delete community.');
              }
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Failed to delete community.');
            }
          },
        },
      ]
    );
  };

  const handleToggleMemberRole = (memberId: string, currentRole?: 'admin' | 'member', memberName?: string) => {
    if (!selectedCommunity) return;
    const isSelf = user?.id === memberId;
    const newRole: 'admin' | 'member' = currentRole === 'admin' ? 'member' : 'admin';

    const actionText = newRole === 'admin' ? 'Promote to Admin' : 'Demote to Member';
    const confirmMessage = isSelf
      ? 'Are you sure you want to demote yourself to Member? You will lose admin privileges for this community.'
      : `Are you sure you want to ${newRole === 'admin' ? 'promote' : 'demote'} ${memberName || 'this user'} ${newRole === 'admin' ? 'to Admin' : 'to Member'}?`;

    Alert.alert(
      actionText,
      confirmMessage,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: actionText,
          style: newRole === 'member' ? 'destructive' : 'default',
          onPress: async () => {
            try {
              const res = await communityApi.updateMemberRole(selectedCommunity.id, memberId, newRole);
              if (res.success) {
                const updatedMembers = (selectedCommunity.members || []).map((m: CommunityMemberInfo) =>
                  m.id === memberId ? { ...m, community_role: newRole } : m
                );
                setSelectedCommunity(prev => prev ? {
                  ...prev,
                  members: updatedMembers,
                  isAdmin: isSelf ? (newRole === 'admin') : prev.isAdmin,
                } : null);
                Alert.alert('Success', `${memberName || 'Member'} is now ${newRole === 'admin' ? 'an Admin' : 'a Member'}.`);
              } else {
                Alert.alert('Error', res.error || 'Failed to update member role.');
              }
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Failed to update member role.');
            }
          },
        },
      ]
    );
  };

  const openPaperSelector = async () => {
    setIsPaperSelectorOpen(true);
    setLoadingPapers(true);
    setPaperSearchQuery('');
    try {
      const combinedMap = new Map<string, Paper>();

      // 1. Read from offline saved library storage
      try {
        const savedRaw = await AsyncStorage.getItem(OFFLINE_SAVED_PAPERS_KEY);
        if (savedRaw) {
          const localList: Paper[] = JSON.parse(savedRaw);
          if (Array.isArray(localList)) {
            localList.forEach(p => {
              if (p && p.id) combinedMap.set(p.id, { ...p, saved: true });
            });
          }
        }
      } catch (err) {
        console.warn('Failed reading saved papers from storage:', err);
      }

      // 2. Fetch fresh saved papers from backend API using saved_by: 'true'
      try {
        const res = await papersApi.getAll({ saved_by: 'true' });
        if (res.success && res.data && Array.isArray(res.data)) {
          res.data.forEach(p => {
            if (p && p.id) combinedMap.set(p.id, { ...p, saved: true });
          });
        }
      } catch (err) {
        console.warn('Failed fetching saved papers from API:', err);
      }

      // Fallback: Also check if any general papers or mock papers are saved
      if (combinedMap.size === 0) {
        try {
          const allRes = await papersApi.getAll();
          if (allRes.success && allRes.data) {
            allRes.data.filter(p => p.saved).forEach(p => combinedMap.set(p.id, p));
          }
        } catch {}
      }

      setSavedPapers(Array.from(combinedMap.values()));
    } catch (err) {
      console.warn('Failed to load saved papers:', err);
    } finally {
      setLoadingPapers(false);
    }
  };

  const filteredSavedPapers = useMemo(() => {
    if (!paperSearchQuery.trim()) return savedPapers;
    const q = paperSearchQuery.toLowerCase();
    return savedPapers.filter(
      p =>
        p.title?.toLowerCase().includes(q) ||
        p.authors?.some(a => a.toLowerCase().includes(q)) ||
        p.tags?.some(t => t.toLowerCase().includes(q))
    );
  }, [savedPapers, paperSearchQuery]);

  const handleAttachPaper = (paper: Paper) => {
    setAttachedPaper(paper);
    setIsPaperSelectorOpen(false);
  };

  const handleSendPost = async () => {
    if (isGuest) {
      promptGuestSignIn(selectedCommunity?.name);
      return;
    }

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
      author: { name: user?.name || 'You (Researcher)', role: 'Contributor', avatar_initials: user?.avatar_initials || 'ME' },
      likes: 0,
      created_at: new Date().toISOString(),
      papers: papersAttached,
      isE2EE: true,
    };

    // Mark temp ID as seen so notification is never self-triggered
    seenPostIdsRef.current.add(tempPostId);

    // Optimistically update the UI: Append to bottom so message appears just BELOW previous messages
    setSelectedCommunity(prev => {
      if (!prev) return null;
      return {
        ...prev,
        posts: [...(prev.posts || []), tempPost]
      };
    });

    // Auto-scroll immediately to bottom
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 50);

    const typedContent = postContent.trim();
    const paperIds = attachedPaper ? [attachedPaper.id] : [];

    setPostContent('');
    setAttachedPaper(null);

    try {
      // 🔒 End-to-End Encryption: Encrypt message content with AES-256-GCM before transmitting
      const encryptedContent = await encryptionService.encryptCommunityMessage(typedContent, selectedCommunity.id);

      const res = await communityApi.createPost(selectedCommunity.id, {
        content: encryptedContent,
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
        // Swap out the temp post with the real one returned from server (using decrypted text locally)
        seenPostIdsRef.current.add(res.data.id);
        setSelectedCommunity(prev => {
          if (!prev) return null;
          return {
            ...prev,
            posts: (prev.posts || []).map(p => p.id === tempPostId ? { ...res.data, content: typedContent, isE2EE: true } : p)
          };
        });

        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 50);
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
      {selectedCommunity ? (
        // ─────────────────────────────────────────────────────────────────────────────
        // 1. DEDICATED CHAT VIEW (Screen 2 in reference image)
        // ─────────────────────────────────────────────────────────────────────────────
        <KeyboardAvoidingView 
          style={{ flex: 1 }} 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 20}
        >
          {/* Chat Header matching reference */}
          <View style={[styles.chatHeader, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
            <TouchableOpacity
              style={styles.chatHeaderBackBtn}
              onPress={() => setSelectedCommunity(null)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <ArrowLeft size={22} color={colors.text} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.chatHeaderClickableArea}
              onPress={() => setIsInfoModalOpen(true)}
              activeOpacity={0.7}
            >
              <View style={[styles.chatHeaderAvatar, { backgroundColor: getAvatarColor(selectedCommunity.id) + '25' }]}>
                <Text style={styles.chatHeaderAvatarText}>{selectedCommunity.icon || '🔬'}</Text>
              </View>

              <View style={styles.chatHeaderDetails}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[styles.chatHeaderTitle, { color: colors.text }]} numberOfLines={1}>
                    {selectedCommunity.name}
                  </Text>
                  {isCurrentUserAdmin && (
                    <View style={[styles.adminHeaderBadge, { backgroundColor: colors.primary + '20', borderColor: colors.primary }]}>
                      <Shield size={10} color={colors.primary} />
                      <Text style={[styles.adminHeaderBadgeText, { color: colors.primary }]}>Admin</Text>
                    </View>
                  )}
                </View>
                <View style={styles.chatHeaderStatusRow}>
                  <View style={styles.greenDot} />
                  <Text style={[styles.chatHeaderSubtitle, { color: colors.textMuted }]} numberOfLines={1}>
                    {selectedCommunity.memberCount || 1} members · Tap for info
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TouchableOpacity
                style={[styles.chatHeaderIconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => setIsInfoModalOpen(true)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Info size={17} color={colors.text} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.chatHeaderJoinBtn,
                  { backgroundColor: colors.primary },
                  selectedCommunity.isMember && { backgroundColor: colors.border + '80' },
                ]}
                onPress={() => handleJoin(selectedCommunity.id)}
              >
                {selectedCommunity.isMember ? (
                  <View style={styles.joinedPillContent}>
                    <Check size={12} color={colors.text} />
                    <Text style={[styles.chatHeaderJoinText, { color: colors.text, marginLeft: 3 }]}>Joined</Text>
                  </View>
                ) : (
                  <Text style={[styles.chatHeaderJoinText, { color: primaryBtnTextColor }]}>Join</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Posts List */}
          <FlatList<CommunityPost>
            ref={flatListRef}
            data={selectedCommunity.posts || []}
            keyExtractor={(item: CommunityPost) => item.id}
            onContentSizeChange={() => {
              flatListRef.current?.scrollToEnd({ animated: false });
            }}
            onLayout={() => {
              flatListRef.current?.scrollToEnd({ animated: false });
            }}
            renderItem={({ item }: { item: CommunityPost }) => {
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
                    ]}
                  >
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

                    {/* WhatsApp Realtime Timing, E2EE Lock & Sent Checkmarks */}
                    <View style={[styles.bubbleFooter, isOwnMessage ? styles.bubbleFooterSent : styles.bubbleFooterReceived]}>
                      {item.isE2EE && (
                        <View style={styles.e2eeRow}>
                          <Lock size={9} color={isOwnMessage ? primaryBtnTextColor : colors.textMuted} style={{ opacity: 0.65 }} />
                        </View>
                      )}
                      <Text style={[styles.messageTimestamp, { color: isOwnMessage ? primaryBtnTextColor : colors.textMuted, opacity: 0.8 }]}>
                        {formatMessageTime(item.created_at)}
                      </Text>
                      {isOwnMessage && (
                        <CheckCheck size={13} color={primaryBtnTextColor} style={{ opacity: 0.85, marginLeft: 3 }} />
                      )}
                    </View>

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
                  if (selectedCommunity) {
                    selectCommunityWithDetails(selectedCommunity.id);
                  }
                  fetchCommunities();
                }}
                tintColor={colors.primary}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyChatState}>
                <View style={[styles.emptyChatCircle, { backgroundColor: colors.primary + '14' }]}>
                  <BookOpen size={32} color={colors.primary} />
                </View>
                <Text style={[styles.emptyChatTitle, { color: colors.text }]}>No Messages Yet</Text>
                <Text style={[styles.emptyChatDesc, { color: colors.textMuted }]}>
                  Send the first message or attach a paper to start discussions in this community.
                </Text>
              </View>
            }
          />

          {/* Post Message Bar */}
          {selectedCommunity.isMember ? (
            <View style={[styles.inputContainer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
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
                  placeholder="Type a message..."
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
                Join this community to attach papers and post messages.
              </Text>
              <TouchableOpacity
                style={[styles.lockedJoinBtn, { backgroundColor: colors.primary }]}
                onPress={() => handleJoin(selectedCommunity.id)}
              >
                <Text style={[styles.lockedJoinBtnText, { color: primaryBtnTextColor }]}>Join Community</Text>
              </TouchableOpacity>
            </View>
          )}
        </KeyboardAvoidingView>
      ) : (
        // ─────────────────────────────────────────────────────────────────────────────
        // 2. WHATSAPP-STYLE VERTICAL COMMUNITY LIST (Screen 1 in reference image)
        // ─────────────────────────────────────────────────────────────────────────────
        <View style={styles.verticalListWrapper}>
          {/* Top Greeting Header */}
          <View style={styles.listHeaderContainer}>
            <View>
              <Text style={[styles.listHeaderGreeting, { color: colors.textMuted }]}>
                Hello, {user?.name ? user.name.split(' ')[0] : (isGuest ? 'Guest' : 'Researcher')}
              </Text>
              <Text style={[styles.listHeaderTitle, { color: colors.text }]}>
                Communities
              </Text>
            </View>

            <View style={styles.listHeaderActions}>
              <TouchableOpacity
                style={[styles.headerCircleBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => setIsSearchVisible(!isSearchVisible)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Search size={18} color={colors.text} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Search Bar (Collapsible / Toggleable) */}
          {isSearchVisible && (
            <View style={[styles.listSearchContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Search size={16} color={colors.textMuted} style={{ marginRight: 8 }} />
              <TextInput
                style={[styles.listSearchInput, { color: colors.text }]}
                placeholder="Search groups or subjects..."
                placeholderTextColor={colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <X size={16} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Filter Pills ("All Groups", "Joined") matching reference */}
          <View style={styles.filterPillContainer}>
            <TouchableOpacity
              style={[
                styles.filterPill,
                filterTab === 'all'
                  ? [styles.filterPillActive, { backgroundColor: colors.primary }]
                  : [styles.filterPillInactive, { backgroundColor: colors.card, borderColor: colors.border }]
              ]}
              onPress={() => setFilterTab('all')}
            >
              <Text
                style={[
                  styles.filterPillText,
                  { color: filterTab === 'all' ? primaryBtnTextColor : colors.textMuted }
                ]}
              >
                All Groups
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterPill,
                filterTab === 'joined'
                  ? [styles.filterPillActive, { backgroundColor: colors.primary }]
                  : [styles.filterPillInactive, { backgroundColor: colors.card, borderColor: colors.border }]
              ]}
              onPress={() => {
                if (isGuest) {
                  promptGuestSignIn();
                } else {
                  setFilterTab('joined');
                }
              }}
            >
              <Text
                style={[
                  styles.filterPillText,
                  { color: filterTab === 'joined' ? primaryBtnTextColor : colors.textMuted }
                ]}
              >
                Joined
              </Text>
            </TouchableOpacity>
          </View>

          {/* Vertical Community List */}
          {loading && !refreshing ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <FlatList<Community>
              data={filteredCommunities}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.verticalListContent}
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
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.whatsappRow, { borderBottomColor: colors.border + '40' }]}
                  onPress={() => handleCommunityPress(item)}
                  activeOpacity={0.7}
                >
                  {/* Circular Avatar with soft tint */}
                  <View style={[styles.whatsappAvatar, { backgroundColor: getAvatarColor(item.id) + '22' }]}>
                    <Text style={styles.whatsappAvatarEmoji}>{item.icon || '🔬'}</Text>
                  </View>

                  {/* Group Info & Preview */}
                  <View style={styles.whatsappDetails}>
                    <View style={styles.whatsappHeaderRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8, gap: 6 }}>
                        <Text style={[styles.whatsappName, { color: colors.text }]} numberOfLines={1}>
                          {item.name}
                        </Text>
                        {(item.isAdmin || (user && String(item.created_by) === String(user.id))) && (
                          <View style={[styles.adminHeaderBadge, { backgroundColor: colors.primary + '20', borderColor: colors.primary }]}>
                            <Shield size={9} color={colors.primary} />
                            <Text style={[styles.adminHeaderBadgeText, { color: colors.primary }]}>Admin</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.whatsappMeta, { color: colors.textMuted }]}>
                        {item.memberCount || 1} members
                      </Text>
                    </View>

                    <View style={styles.whatsappSubRow}>
                      <Text style={[styles.whatsappSnippet, { color: colors.textMuted }]} numberOfLines={1}>
                        {item.description || 'Tap to enter group chat'}
                      </Text>
                      {item.isMember && (
                        <View style={[styles.joinedBadgePill, { backgroundColor: colors.primary + '18' }]}>
                          <Text style={[styles.joinedBadgeTextPill, { color: colors.primary }]}>Joined</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Users size={48} color={colors.textMuted} />
                  <Text style={[styles.emptyTitle, { color: colors.text }]}>No Communities Found</Text>
                  <Text style={[styles.emptySub, { color: colors.textMuted }]}>
                    {searchQuery ? 'Try a different keyword.' : 'Tap "+" to create a new research group.'}
                  </Text>
                </View>
              }
            />
          )}

          {/* Floating Action Button (FAB) matching reference */}
          <TouchableOpacity
            style={[styles.whatsappFab, { backgroundColor: colors.primary }]}
            onPress={() => {
              if (isGuest) promptGuestSignIn();
              else setIsGroupModalOpen(true);
            }}
            activeOpacity={0.85}
          >
            <Plus size={26} color={primaryBtnTextColor} />
          </TouchableOpacity>
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

      {/* Community Info & Admin Members Management Modal */}
      <Modal visible={isInfoModalOpen} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, styles.infoModalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                <View style={[styles.modalIconBox, { backgroundColor: getAvatarColor(selectedCommunity?.id || '') + '25' }]}>
                  <Text style={styles.modalIconEmoji}>{selectedCommunity?.icon || '🔬'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.modalTitle, { color: colors.text }]} numberOfLines={1}>
                    {selectedCommunity?.name}
                  </Text>
                  <Text style={[styles.infoModalSub, { color: colors.textMuted }]} numberOfLines={1}>
                    {selectedCommunity?.subject || 'Research Group'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setIsInfoModalOpen(false)} style={styles.modalCloseBtn}>
                <X size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
              {selectedCommunity?.description ? (
                <View style={[styles.infoDescBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Text style={[styles.infoDescText, { color: colors.text }]}>
                    {selectedCommunity.description}
                  </Text>
                </View>
              ) : null}

              {/* Admin status pill */}
              <View style={[styles.roleStatusBanner, { backgroundColor: isCurrentUserAdmin ? colors.primary + '18' : colors.card, borderColor: isCurrentUserAdmin ? colors.primary : colors.border }]}>
                {isCurrentUserAdmin ? (
                  <>
                    <Shield size={16} color={colors.primary} />
                    <Text style={[styles.roleStatusText, { color: colors.primary, fontWeight: '700' }]}>
                      You are an Admin of this community
                    </Text>
                  </>
                ) : (
                  <>
                    <Users size={16} color={colors.textMuted} />
                    <Text style={[styles.roleStatusText, { color: colors.textMuted }]}>
                      You are a Member of this community
                    </Text>
                  </>
                )}
              </View>

              {/* Members List Section */}
              <View style={{ marginTop: 14 }}>
                <View style={styles.sectionTitleRow}>
                  <Text style={[styles.infoSectionTitle, { color: colors.text }]}>
                    Members ({selectedCommunity?.members?.length || selectedCommunity?.memberCount || 1})
                  </Text>
                </View>

                {(selectedCommunity?.members || []).map((m: CommunityMemberInfo) => {
                  const isSelf = user?.id === m.id;
                  const isMemberAdmin = m.community_role === 'admin';

                  return (
                    <View key={m.id} style={[styles.memberItemRow, { borderBottomColor: colors.border + '50' }]}>
                      <View style={styles.memberLeftCol}>
                        <View style={[styles.memberAvatar, { backgroundColor: colors.primary }]}>
                          <Text style={[styles.avatarText, { color: primaryBtnTextColor }]}>
                            {m.avatar_initials || (m.name ? m.name.slice(0, 2).toUpperCase() : 'U')}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.memberName, { color: colors.text }]} numberOfLines={1}>
                            {m.name || 'Researcher'} {isSelf ? '(You)' : ''}
                          </Text>
                          <Text style={[styles.memberSubtext, { color: colors.textMuted }]}>
                            {m.role || 'Contributor'}
                          </Text>
                        </View>
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        {/* Role Badge */}
                        <View
                          style={[
                            styles.roleBadgePill,
                            isMemberAdmin
                              ? { backgroundColor: colors.primary + '25', borderColor: colors.primary, borderWidth: 1 }
                              : { backgroundColor: colors.background, borderColor: colors.border, borderWidth: 1 }
                          ]}
                        >
                          <Text
                            style={[
                              styles.roleBadgeText,
                              { color: isMemberAdmin ? colors.primary : colors.textMuted }
                            ]}
                          >
                            {isMemberAdmin ? 'Admin' : 'Member'}
                          </Text>
                        </View>

                        {/* Admin Action: Promote / Demote */}
                        {isCurrentUserAdmin && (
                          <TouchableOpacity
                            style={[
                              styles.roleActionBtn,
                              { backgroundColor: isMemberAdmin ? '#ef444420' : colors.primary + '20', borderColor: isMemberAdmin ? '#ef444440' : colors.primary + '40' }
                            ]}
                            onPress={() => handleToggleMemberRole(m.id, m.community_role, m.name)}
                          >
                            {isMemberAdmin ? (
                              <View style={styles.actionBtnInner}>
                                <UserMinus size={12} color="#ef4444" />
                                <Text style={[styles.actionBtnText, { color: '#ef4444' }]}>
                                  {isSelf ? 'Demote Self' : 'Demote'}
                                </Text>
                              </View>
                            ) : (
                              <View style={styles.actionBtnInner}>
                                <UserCheck size={12} color={colors.primary} />
                                <Text style={[styles.actionBtnText, { color: colors.primary }]}>Make Admin</Text>
                              </View>
                            )}
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>

              {/* Admin Actions: Delete Community */}
              {isCurrentUserAdmin && (
                <TouchableOpacity
                  style={styles.deleteCommunityBtn}
                  onPress={handleDeleteCommunity}
                  activeOpacity={0.8}
                >
                  <Trash2 size={16} color="#ef4444" />
                  <Text style={styles.deleteCommunityBtnText}>Delete Community</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Attach Paper Selector Modal */}
      <Modal visible={isPaperSelectorOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, styles.pickerModalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <BookOpen size={20} color={colors.primary} />
                <Text style={[styles.modalTitle, { color: colors.text }]}>Attach Saved Research Paper</Text>
              </View>
              <TouchableOpacity onPress={() => setIsPaperSelectorOpen(false)} style={styles.modalCloseBtn}>
                <X size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Search Input for saved papers */}
            <TextInput
              style={[styles.paperSearchInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              placeholder="Search your saved library papers..."
              placeholderTextColor={colors.textMuted}
              value={paperSearchQuery}
              onChangeText={setPaperSearchQuery}
            />

            {loadingPapers ? (
              <View style={styles.pickerCenter}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : (
              <FlatList<Paper>
                data={filteredSavedPapers}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ paddingBottom: 20 }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.savedPaperItem, { backgroundColor: colors.background, borderColor: colors.border }]}
                    onPress={() => handleAttachPaper(item)}
                  >
                    <BookOpen size={16} color={colors.primary} style={styles.paperIconLeft} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.savedPaperTitle, { color: colors.text }]} numberOfLines={2}>
                        {item.title}
                      </Text>
                      <Text style={[styles.savedPaperAuthors, { color: colors.textMuted }]} numberOfLines={1}>
                        {item.authors ? item.authors.join(', ') : 'Unknown'} {item.year ? `· ${item.year}` : ''}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View style={styles.pickerCenter}>
                    <BookOpen size={32} color={colors.textMuted} />
                    <Text style={[styles.emptyPickerText, { color: colors.textMuted }]}>
                      {paperSearchQuery ? 'No matching saved papers found.' : 'No bookmarked papers found in your saved library. Bookmark papers in Discover or For You to attach them here!'}
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
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── 1. Vertical WhatsApp-Style List Styles (Reference Screen 1) ───────────
  verticalListWrapper: {
    flex: 1,
    position: 'relative',
  },
  listHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  listHeaderGreeting: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 2,
    letterSpacing: -0.2,
  },
  listHeaderTitle: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  listHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerCircleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 4,
    marginBottom: 10,
    paddingHorizontal: 14,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
  },
  listSearchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  filterPillContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
  },
  filterPillActive: {},
  filterPillInactive: {
    borderWidth: 1,
  },
  filterPillText: {
    fontSize: 13,
    fontWeight: '700',
  },
  verticalListContent: {
    paddingHorizontal: 16,
    paddingBottom: 90,
  },
  whatsappRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
  },
  whatsappAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  whatsappAvatarEmoji: {
    fontSize: 24,
  },
  whatsappDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  whatsappHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  whatsappName: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  whatsappMeta: {
    fontSize: 12,
  },
  whatsappSubRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  whatsappSnippet: {
    fontSize: 13,
    flex: 1,
    marginRight: 8,
  },
  joinedBadgePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  joinedBadgeTextPill: {
    fontSize: 10,
    fontWeight: '700',
  },
  whatsappFab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
  },

  // ── 2. Dedicated Chat Screen Styles (Reference Screen 2) ──────────────────
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  chatHeaderBackBtn: {
    paddingRight: 12,
    paddingVertical: 4,
  },
  chatHeaderClickableArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chatHeaderIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminHeaderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
    borderWidth: 1,
    gap: 3,
  },
  adminHeaderBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  chatHeaderAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  chatHeaderAvatarText: {
    fontSize: 18,
  },
  chatHeaderDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  chatHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  chatHeaderStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  greenDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#10b981',
    marginRight: 5,
  },
  chatHeaderSubtitle: {
    fontSize: 11,
    fontWeight: '500',
  },
  chatHeaderJoinBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinedPillContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chatHeaderJoinText: {
    fontSize: 12,
    fontWeight: '700',
  },
  postList: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 12,
    maxWidth: '85%',
  },
  messageRowLeft: {
    alignSelf: 'flex-start',
  },
  messageRowRight: {
    alignSelf: 'flex-end',
    flexDirection: 'row-reverse',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  avatarText: {
    fontSize: 11,
    fontWeight: '700',
  },
  messageBubble: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
  },
  messageBubbleReceived: {
    borderTopLeftRadius: 4,
  },
  messageBubbleSent: {
    borderTopRightRadius: 4,
    borderColor: 'transparent',
  },
  bubbleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 6,
  },
  authorName: {
    fontSize: 12,
    fontWeight: '700',
  },
  authorRole: {
    fontSize: 10,
  },
  postContent: {
    fontSize: 14,
    lineHeight: 20,
  },
  bubbleFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
    alignSelf: 'flex-end',
  },
  bubbleFooterSent: {
    justifyContent: 'flex-end',
  },
  bubbleFooterReceived: {
    justifyContent: 'flex-end',
  },
  e2eeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 2,
  },
  messageTimestamp: {
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: -0.2,
  },
  e2eeIndicatorText: {
    fontSize: 9,
    fontWeight: '600',
  },
  attachedPaperWrapper: {
    marginTop: 8,
  },
  emptyChatState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: 40,
  },
  emptyChatCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyChatTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptyChatDesc: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },

  // ── Input Bar Styles ───────────────────────────────────────────────────────
  inputContainer: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  attachmentPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  attachmentName: {
    fontSize: 12,
    flex: 1,
    marginLeft: 6,
  },
  removeAttachment: {
    padding: 4,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  attachBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 14,
    borderWidth: 1,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockedInput: {
    padding: 16,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  lockedText: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 10,
  },
  lockedJoinBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 16,
  },
  lockedJoinBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },

  // ── General Modals & Empty States ──────────────────────────────────────────
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 14,
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    borderWidth: 1,
  },
  pickerModalCard: {
    maxHeight: '75%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalBody: {
    marginBottom: 10,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    borderWidth: 1,
    marginBottom: 14,
  },
  descInput: {
    height: 70,
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
    marginTop: 6,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  pickerCenter: {
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
  paperSearchInput: {
    height: 42,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    marginBottom: 12,
    fontSize: 13,
  },
  infoModalCard: {
    width: '92%',
    maxHeight: '85%',
  },
  modalIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalIconEmoji: {
    fontSize: 20,
  },
  infoModalSub: {
    fontSize: 12,
    marginTop: 2,
  },
  infoDescBox: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  infoDescText: {
    fontSize: 13,
    lineHeight: 18,
  },
  roleStatusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  roleStatusText: {
    fontSize: 13,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  memberItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  memberLeftCol: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  memberAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '600',
  },
  memberSubtext: {
    fontSize: 11,
    marginTop: 1,
  },
  roleBadgePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  roleActionBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  actionBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  deleteCommunityBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#ef444415',
    borderColor: '#ef444435',
    borderWidth: 1,
    marginTop: 20,
    gap: 8,
  },
  deleteCommunityBtnText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '700',
  },
});
