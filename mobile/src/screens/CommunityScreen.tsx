import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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
  Keyboard,
  Platform,
  ScrollView,
  Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  MoreVertical,
  Sparkles,
  Compass,
  FlaskConical,
  Brain,
} from 'lucide-react-native';
import { Community, CommunityPost, Paper, CommunityMemberInfo } from '../types';
import { communityApi, papersApi, cachePapers, OFFLINE_SAVED_PAPERS_KEY } from '../services/api';
import { getSocket } from '../services/socketService';
import { encryptionService } from '../services/encryptionService';
import { notificationService } from '../services/notificationService';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { PaperCard } from '../components/PaperCard';
import { CommunitiesIllustration } from '../components/HeaderIllustrations';

const OFFLINE_COMMUNITIES_KEY = 'offline_communities';
const OFFLINE_COMMUNITY_DETAIL_PREFIX = 'offline_community_detail_';
const SEEN_COMMUNITY_POSTS_KEY = 'seen_community_posts_ids';

interface CommunityScreenProps {
  onSelectPaper?: (paperId: string) => void;
  pendingCommunityId?: string | null;
  onClearPendingCommunity?: () => void;
}

const AVATAR_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#06b6d4'];
const getAvatarColor = (id: string) => {
  let hash = 0;
  for (let i = 0; i < (id || '').length; i++) hash = (hash << 5) - hash + id.charCodeAt(i);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

const getCommunityIconConfig = (name: string, subject?: string, iconStr?: string, isDark?: boolean) => {
  const s = `${name} ${subject || ''} ${iconStr || ''}`.toLowerCase();
  if (s.includes('astro') || s.includes('space') || s.includes('telescope') || s.includes('physic')) {
    return {
      bg: isDark ? 'rgba(59, 130, 246, 0.22)' : '#DBEAFE',
      color: isDark ? '#60A5FA' : '#2563EB',
      Icon: Compass,
    };
  }
  if (s.includes('chem') || s.includes('bio') || s.includes('flask') || s.includes('nano') || s.includes('reaction') || s.includes('lab')) {
    return {
      bg: isDark ? 'rgba(16, 185, 129, 0.22)' : '#D1FAE5',
      color: isDark ? '#34D399' : '#059669',
      Icon: FlaskConical,
    };
  }
  if (s.includes('abstract') || s.includes('communit') || s.includes('dhempe') || s.includes('group') || s.includes('team')) {
    return {
      bg: isDark ? 'rgba(139, 92, 246, 0.22)' : '#EDE9FE',
      color: isDark ? '#A78BFA' : '#7C3AED',
      Icon: Users,
    };
  }
  if (s.includes('qualcom') || s.includes('ai') || s.includes('deep') || s.includes('learn') || s.includes('brain')) {
    return {
      bg: isDark ? 'rgba(239, 68, 68, 0.22)' : '#FEE2E2',
      color: isDark ? '#F87171' : '#DC2626',
      Icon: Brain,
    };
  }
  return {
    bg: isDark ? 'rgba(249, 115, 22, 0.22)' : '#FFEDD5',
    color: isDark ? '#FB923C' : '#EA580C',
    Icon: Brain,
  };
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

// Persist community detail + messages + attached papers to AsyncStorage for offline/instant load
const persistCommunityDetailCache = (community: Community) => {
  if (!community?.id) return;
  const cacheablePosts = (community.posts || []).filter(p => p.status !== 'sending');
  const payload: Community = { ...community, posts: cacheablePosts };
  AsyncStorage.setItem(`${OFFLINE_COMMUNITY_DETAIL_PREFIX}${community.id}`, JSON.stringify(payload)).catch(() => {});

  const attachedPapers = cacheablePosts.flatMap(p => p.papers || []).filter(Boolean) as Paper[];
  if (attachedPapers.length > 0) {
    cachePapers(attachedPapers);
  }
};

interface MessageBubbleProps {
  item: CommunityPost;
  isOwnMessage: boolean;
  userAvatarInitials: string;
  colors: any;
  primaryBtnTextColor: string;
  onRetry: (post: CommunityPost) => void;
  onDelete: (postId: string) => void;
  onSelectPaper?: (paperId: string) => void;
  onToggleSavePaper: (paperId: string) => void;
}

const MessageBubbleItem = React.memo<MessageBubbleProps>(({
  item,
  isOwnMessage,
  userAvatarInitials,
  colors,
  primaryBtnTextColor,
  onRetry,
  onDelete,
  onSelectPaper,
  onToggleSavePaper,
}) => (
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
      onPress={() => item.status === 'failed' && onRetry(item)}
      onLongPress={() => isOwnMessage && onDelete(item.id)}
      style={[
        styles.messageBubble,
        isOwnMessage
          ? [styles.messageBubbleSent, { backgroundColor: item.status === 'failed' ? '#B91C1C' : colors.primary }]
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
          item.status === 'failed' ? (
            <Text style={[styles.messageTimestamp, { color: primaryBtnTextColor, marginLeft: 4, fontWeight: '600' }]}>
              · Failed (Tap to retry)
            </Text>
          ) : item.status === 'sending' ? (
            <Check size={13} color={primaryBtnTextColor} style={{ opacity: 0.65, marginLeft: 3 }} />
          ) : (
            <CheckCheck size={13} color={primaryBtnTextColor} style={{ opacity: 0.85, marginLeft: 3 }} />
          )
        )}
      </View>

      {item.papers && item.papers.length > 0 && item.papers[0] && (
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
            onToggleSave={() => onToggleSavePaper(item.papers![0].id)}
          />
        </View>
      )}
    </TouchableOpacity>

    {isOwnMessage && (
      <View style={[styles.avatar, { backgroundColor: colors.primary, marginLeft: 8, marginRight: 0 }]}>
        <Text style={[styles.avatarText, { color: primaryBtnTextColor }]}>
          {userAvatarInitials}
        </Text>
      </View>
    )}
  </View>
));

interface CommunityCardItemProps {
  item: Community;
  isAdmin: boolean;
  colors: any;
  theme: string;
  onPress: (c: Community) => void;
  onOptions: (c: Community) => void;
}

const CommunityCardItem = React.memo<CommunityCardItemProps>(({
  item,
  isAdmin,
  colors,
  theme,
  onPress,
  onOptions,
}) => {
  const iconConfig = getCommunityIconConfig(item.name, item.subject, item.icon, theme === 'dark');
  const ItemIcon = iconConfig.Icon;

  return (
    <TouchableOpacity
      style={[
        styles.communityCard,
        {
          backgroundColor: colors.card,
          borderColor: theme === 'dark' ? colors.border : '#EDF2F9',
        },
      ]}
      onPress={() => onPress(item)}
      activeOpacity={0.85}
    >
      <View style={[styles.communityAvatar, { backgroundColor: iconConfig.bg }]}>
        <ItemIcon size={24} color={iconConfig.color} strokeWidth={2} />
      </View>

      <View style={styles.communityDetails}>
        <View style={styles.communityTitleRow}>
          <Text
            style={[styles.communityName, { color: colors.text }]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {item.name}
          </Text>
          {isAdmin && (
            <View style={styles.adminHeaderBadge}>
              <Shield size={10} color="#2563EB" fill="#2563EB" />
              <Text style={styles.adminHeaderBadgeText}>Admin</Text>
            </View>
          )}
        </View>

        <Text style={[styles.communitySnippet, { color: colors.textMuted }]} numberOfLines={1}>
          {item.description || item.subject || 'Tap to enter group chat'}
        </Text>
      </View>

      <View style={styles.communityRightCol}>
        <View style={styles.communityMetaRow}>
          {item.isMember && <View style={styles.isMemberDot} />}
          <Text style={[styles.communityMeta, { color: colors.textMuted }]}>
            {item.memberCount || 1} {item.memberCount === 1 ? 'member' : 'members'}
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.threeDotsBtn,
            {
              backgroundColor: theme === 'dark' ? '#24324D' : '#F1F5F9',
              borderColor: theme === 'dark' ? '#334155' : '#E2E8F0',
            },
          ]}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          onPress={(e) => {
            e.stopPropagation();
            onOptions(item);
          }}
          activeOpacity={0.7}
        >
          <MoreVertical size={16} color={colors.text} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
});

export const CommunityScreen: React.FC<CommunityScreenProps> = ({
  onSelectPaper,
  pendingCommunityId,
  onClearPendingCommunity,
}) => {
  const { colors, theme } = useTheme();
  const { user, isGuest, logout } = useAuth();
  const insets = useSafeAreaInsets();
  
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
  const containerRef = useRef<React.ComponentRef<typeof View>>(null);
  const [androidKeyboardPadding, setAndroidKeyboardPadding] = useState(0);
  const flatListRef = useRef<FlatList<CommunityPost>>(null);
  const isNearBottomRef = useRef(true);
  const seenPostIdsRef = useRef<Set<string>>(new Set());
  const seededCommunitiesRef = useRef<Set<string>>(new Set());
  const sessionStartTimeRef = useRef<number>(Date.now());
  const initialSyncDoneRef = useRef(false);
  const chatTransitionAnim = useRef(new Animated.Value(0)).current;

  // Track active open community so foreground notifications don't fire for the chat user is reading
  useEffect(() => {
    notificationService.setActiveCommunityId(selectedCommunity?.id ? String(selectedCommunity.id) : null);
    return () => {
      notificationService.setActiveCommunityId(null);
    };
  }, [selectedCommunity?.id]);

  // Open community directly when user taps a push notification
  useEffect(() => {
    if (pendingCommunityId && !isGuest) {
      selectCommunityWithDetails(pendingCommunityId);
      onClearPendingCommunity?.();
    }
  }, [pendingCommunityId, isGuest]);

  // Handle Android keyboard overlap (especially under edgeToEdgeEnabled) without double-padding
  // and smoothly scroll to bottom when keyboard opens inside a chat
  useEffect(() => {
    if (!selectedCommunity) {
      setAndroidKeyboardPadding(0);
      return;
    }

    const showSub = Keyboard.addListener('keyboardDidShow', (e) => {
      if (Platform.OS === 'android' && containerRef.current && e?.endCoordinates?.screenY) {
        // Measure after a brief tick so adjustResize (if active) has already settled
        setTimeout(() => {
          containerRef.current?.measureInWindow((_x, y, _w, height) => {
            const bottomY = y + height;
            const overlap = Math.max(0, bottomY - e.endCoordinates.screenY);
            setAndroidKeyboardPadding(overlap);
          });
        }, 40);
      }

      if (isNearBottomRef.current) {
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 80);
      }
    });

    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      if (Platform.OS === 'android') {
        setAndroidKeyboardPadding(0);
      }
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [selectedCommunity?.id]);

  const handleBackFromChat = () => {
    Animated.timing(chatTransitionAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => setSelectedCommunity(null));
  };

  // Initialize notification service and restore persisted seen post IDs on mount
  useEffect(() => {
    notificationService.initialize();
    AsyncStorage.getItem(SEEN_COMMUNITY_POSTS_KEY).then(raw => {
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            parsed.forEach((id: string) => seenPostIdsRef.current.add(id));
          }
        } catch {}
      }
    }).catch(() => {});
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

  const mergeWithPendingPosts = (serverPosts: CommunityPost[], existingPosts: CommunityPost[] = []): CommunityPost[] => {
    const pending = existingPosts.filter(p => p.status === 'sending' || p.status === 'failed');
    if (pending.length === 0) return serverPosts;
    const serverIds = new Set(serverPosts.map(p => p.id));
    const remainingPending = pending.filter(p => !serverIds.has(p.id));
    return sortPostsChronological([...serverPosts, ...remainingPending]);
  };

  const selectCommunityWithDetails = async (communityId: string) => {
    if (isGuest) {
      promptGuestSignIn();
      return;
    }

    try {
      // 1. Instant Cache Fallback: Load saved community details immediately
      let loadedFromCache = false;
      const cachedDetail = await AsyncStorage.getItem(`${OFFLINE_COMMUNITY_DETAIL_PREFIX}${communityId}`);
      if (cachedDetail) {
        try {
          const parsed: Community = JSON.parse(cachedDetail);
          if (parsed && parsed.id === communityId) {
            loadedFromCache = true;
            setSelectedCommunity(parsed);
            chatTransitionAnim.setValue(1);
            parsed.posts?.forEach((p) => seenPostIdsRef.current.add(p.id));
            setTimeout(() => {
              flatListRef.current?.scrollToEnd({ animated: false });
            }, 60);
          }
        } catch {}
      }

      // 2. Network Fetch: Fetch fresh data from server
      const res = await communityApi.getById(communityId);
      if (res.success && res.data) {
        const decryptedPosts = await decryptPosts(res.data.posts || [], communityId);
        // Sort chronologically: oldest at top, latest at bottom
        const sorted = sortPostsChronological(decryptedPosts);

        // Pre-populate seen IDs so device notifications don't fire for past messages
        sorted.forEach(p => seenPostIdsRef.current.add(p.id));
        AsyncStorage.setItem(SEEN_COMMUNITY_POSTS_KEY, JSON.stringify(Array.from(seenPostIdsRef.current))).catch(() => {});

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
        const updatedCommunity = { ...res.data, members, posts: mergeWithPendingPosts(sorted, selectedCommunity?.posts) };
        setSelectedCommunity(updatedCommunity);
        if (!loadedFromCache) {
          chatTransitionAnim.setValue(0);
          Animated.timing(chatTransitionAnim, {
            toValue: 1,
            duration: 180,
            useNativeDriver: true,
          }).start();
        }

        // Cache community detail + attached papers
        persistCommunityDetailCache(updatedCommunity);

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
      // 1. Instant offline cache load
      const cached = await AsyncStorage.getItem(OFFLINE_COMMUNITIES_KEY);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setCommunities(parsed);
            setLoading(false);
          }
        } catch {}
      }

      // 2. Fresh network fetch
      const res = await communityApi.getAll();
      if (res.success && res.data) {
        // Sanitize out any legacy mock comm- entries
        const valid = res.data.filter(c => c && c.id && !c.id.startsWith('comm-'));
        const listToUse = valid.length > 0 ? valid : res.data;
        setCommunities(listToUse);
        await AsyncStorage.setItem(OFFLINE_COMMUNITIES_KEY, JSON.stringify(listToUse));

        // Initial seed of posts to prevent any historical notifications
        if (!initialSyncDoneRef.current) {
          const joined = listToUse.filter(c => c.isMember);
          for (const comm of joined) {
            if (comm.posts) {
              comm.posts.forEach(p => seenPostIdsRef.current.add(p.id));
            }
          }
          await AsyncStorage.setItem(SEEN_COMMUNITY_POSTS_KEY, JSON.stringify(Array.from(seenPostIdsRef.current)));
          initialSyncDoneRef.current = true;
        }

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

  // Real-time WebSocket delivery (Socket.IO) for instant message push
  useEffect(() => {
    if (isGuest || !selectedCommunity?.id || selectedCommunity.id.startsWith('comm-')) return;

    const commId = String(selectedCommunity.id);
    let active = true;
    let activeSocket: Awaited<ReturnType<typeof getSocket>> = null;

    const handleNewPost = async (incomingPost: CommunityPost) => {
      if (!active || !incomingPost) return;
      const postId = String(incomingPost.id || (incomingPost as any)._id || '');
      if (!postId) return;

      // Skip if we already have this post (e.g. our own optimistic post just resolved)
      if (seenPostIdsRef.current.has(postId)) return;
      seenPostIdsRef.current.add(postId);
      AsyncStorage.setItem(SEEN_COMMUNITY_POSTS_KEY, JSON.stringify(Array.from(seenPostIdsRef.current))).catch(() => {});

      const [decrypted] = await decryptPosts([{ ...incomingPost, id: postId }], commId);
      if (!active) return;

      setSelectedCommunity(prev => {
        if (!prev || String(prev.id) !== commId) return prev;
        const existing = prev.posts || [];
        if (existing.some(p => p.id === postId)) return prev;
        const nextCommunity = {
          ...prev,
          posts: sortPostsChronological([...existing, decrypted]),
        };
        persistCommunityDetailCache(nextCommunity);
        return nextCommunity;
      });

      if (isNearBottomRef.current) {
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 60);
      }
    };

    const handleDeletePostEvent = (payload: { communityId?: string; postId?: string }) => {
      if (!active || !payload?.postId) return;
      if (payload.communityId && String(payload.communityId) !== commId) return;

      setSelectedCommunity(prev => {
        if (!prev || String(prev.id) !== commId) return prev;
        const nextCommunity = {
          ...prev,
          posts: (prev.posts || []).filter(p => p.id !== payload.postId),
        };
        persistCommunityDetailCache(nextCommunity);
        return nextCommunity;
      });
    };

    getSocket().then((sock) => {
      if (!active || !sock) return;
      activeSocket = sock;
      sock.emit('join_community', commId);
      sock.on('new_post', handleNewPost);
      sock.on('delete_post', handleDeletePostEvent);
    });

    return () => {
      active = false;
      if (activeSocket) {
        activeSocket.emit('leave_community', commId);
        activeSocket.off('new_post', handleNewPost);
        activeSocket.off('delete_post', handleDeletePostEvent);
      }
    };
  }, [selectedCommunity?.id, isGuest]);

  // Fallback sync every 15 seconds in case WebSocket temporarily disconnects
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
            // Mark all as seen so they are never notified
            newUnseen.forEach(p => seenPostIdsRef.current.add(p.id));
            AsyncStorage.setItem(SEEN_COMMUNITY_POSTS_KEY, JSON.stringify(Array.from(seenPostIdsRef.current))).catch(() => {});

            // NOTE: Do NOT send external push notification for the chat room user is actively viewing!
            // The user is literally right here watching the conversation in real time.

            const allDecrypted = await decryptPosts(rawPosts, selectedCommunity.id);
            const chronological = sortPostsChronological(allDecrypted);
            setSelectedCommunity(prev => {
              if (!prev) return null;
              const nextCommunity = { ...prev, ...res.data, posts: mergeWithPendingPosts(chronological, prev.posts) };
              persistCommunityDetailCache(nextCommunity);
              return nextCommunity;
            });

            setTimeout(() => {
              if (isNearBottomRef.current) {
                flatListRef.current?.scrollToEnd({ animated: true });
              }
            }, 100);
          }
        } else {
          consecutiveErrors++;
        }
      } catch (err) {
        consecutiveErrors++;
        console.warn('Failed to poll community posts:', err);
      }
    }, 15000);

    return () => clearInterval(pollInterval);
  }, [selectedCommunity?.id, isGuest, user]);

  // Periodic background check across joined communities for device notifications when chat is not open
  useEffect(() => {
    if (isGuest || selectedCommunity) return;

    const bgInterval = setInterval(async () => {
      // ONLY check if initial sync has already seeded historical messages
      if (!initialSyncDoneRef.current) return;

      try {
        const res = await communityApi.getAll();
        if (res.success && res.data) {
          const joined = res.data.filter(c => c.isMember);
          for (const comm of joined) {
            const detailRes = await communityApi.getById(comm.id);
            if (detailRes.success && detailRes.data && detailRes.data.posts) {
              const isFirstSeedForComm = !seededCommunitiesRef.current.has(comm.id);
              seededCommunitiesRef.current.add(comm.id);

              const unseen = detailRes.data.posts.filter(p => !seenPostIdsRef.current.has(p.id));
              if (unseen.length > 0) {
                if (isFirstSeedForComm) {
                  // Silently mark historical posts as seen on first check so opening the app never replays old notifications
                  unseen.forEach(p => seenPostIdsRef.current.add(p.id));
                  AsyncStorage.setItem(SEEN_COMMUNITY_POSTS_KEY, JSON.stringify(Array.from(seenPostIdsRef.current))).catch(() => {});
                } else {
                  const decrypted = await decryptPosts(unseen, comm.id);
                  let newlySeenAdded = false;
                  decrypted.forEach(p => {
                    seenPostIdsRef.current.add(p.id);
                    newlySeenAdded = true;
                    const isOwn =
                      p.author?.avatar_initials === 'ME' ||
                      p.author?.name === 'You (Researcher)' ||
                      (user && p.author?.name === user.name) ||
                      (user && p.user_id === user.id);

                    const postTime = p.created_at ? new Date(p.created_at).getTime() : 0;
                    const isNewInSession = postTime >= sessionStartTimeRef.current;

                    // Only notify if truly from someone else, created after app open, and user is not inside this community
                    if (!isOwn && isNewInSession) {
                      notificationService.sendCommunityMessageNotification({
                        communityName: comm.name,
                        senderName: p.author?.name || 'Researcher',
                        content: p.content,
                        communityId: comm.id,
                        hasAttachment: !!(p.papers && p.papers.length > 0),
                      });
                    }
                  });

                  if (newlySeenAdded) {
                    AsyncStorage.setItem(SEEN_COMMUNITY_POSTS_KEY, JSON.stringify(Array.from(seenPostIdsRef.current))).catch(() => {});
                  }
                }
              }
            }
          }
        }
      } catch {}
    }, 15000);

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

  const handleCommunityOptions = (item: Community) => {
    if (isGuest) {
      promptGuestSignIn(item.name);
      return;
    }

    if (item.isMember) {
      Alert.alert(
        item.name,
        `You are a member (${item.memberCount || 1} ${item.memberCount === 1 ? 'member' : 'members'})`,
        [
          { text: 'Open Chat', onPress: () => handleCommunityPress(item) },
          {
            text: 'Leave Community',
            style: 'destructive',
            onPress: () => handleJoin(item.id),
          },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    } else {
      Alert.alert(
        item.name,
        `${item.description || item.subject || 'Research Community'}\n(${item.memberCount || 1} ${item.memberCount === 1 ? 'member' : 'members'})`,
        [
          { text: 'Join Community', onPress: () => handleJoin(item.id) },
          { text: 'Preview Chat', onPress: () => handleCommunityPress(item) },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    }
  };

  const handleChatOptions = () => {
    if (!selectedCommunity) return;
    if (isGuest) {
      promptGuestSignIn(selectedCommunity.name);
      return;
    }

    const isMember = selectedCommunity.isMember;
    const options: { text: string; style?: 'default' | 'cancel' | 'destructive'; onPress?: () => void }[] = [
      {
        text: 'Group Info',
        onPress: () => setIsInfoModalOpen(true),
      },
      {
        text: isMember ? 'Leave Community' : 'Join Community',
        style: isMember ? 'destructive' : 'default',
        onPress: () => handleJoin(selectedCommunity.id),
      },
      {
        text: 'Cancel',
        style: 'cancel',
      },
    ];

    Alert.alert(
      selectedCommunity.name,
      `${selectedCommunity.memberCount || 1} ${selectedCommunity.memberCount === 1 ? 'member' : 'members'} · ${selectedCommunity.subject || 'Research Group'}`,
      options
    );
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

      if (res.success && res.data) {
        const rawId = String(res.data.id || (res.data as any)._id || `comm-${Date.now()}`);
        setGroupName('');
        setGroupDesc('');
        setGroupSubject('Computer Science');
        setGroupIcon('🔬');
        setIsGroupModalOpen(false);

        const newCommData: Community = {
          ...res.data,
          id: rawId,
          isAdmin: true,
          isMember: true,
          created_by: user?.id,
          memberCount: res.data.memberCount || 1,
          members: user ? [{
            id: user.id,
            name: user.name || 'You',
            avatar_initials: user.avatar_initials || 'ME',
            community_role: 'admin',
          }] : [],
          posts: [],
        };

        // Cache the newly created community immediately
        AsyncStorage.setItem(`${OFFLINE_COMMUNITY_DETAIL_PREFIX}${rawId}`, JSON.stringify(newCommData)).catch(() => {});

        setSelectedCommunity(newCommData);
        chatTransitionAnim.setValue(0);
        Animated.timing(chatTransitionAnim, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }).start();

        await fetchCommunities();
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
                AsyncStorage.removeItem(`${OFFLINE_COMMUNITY_DETAIL_PREFIX}${selectedCommunity.id}`).catch(() => {});
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

  const transmitPost = async (
    commId: string,
    tempPostId: string,
    typedContent: string,
    paperIds: string[],
    papersAttached: Paper[]
  ) => {
    const maxAttempts = 3;
    let lastError = 'Failed to post message.';

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        // 🔒 End-to-End Encryption: Encrypt message content with AES-256-GCM before transmitting
        const encryptedContent = await encryptionService.encryptCommunityMessage(typedContent, commId);
        const res = await communityApi.createPost(commId, {
          content: encryptedContent,
          paper_ids: paperIds,
        });

        if (res.success && res.data) {
          const realPostId = String(res.data.id || (res.data as any)._id || tempPostId);
          seenPostIdsRef.current.add(realPostId);
          AsyncStorage.setItem(SEEN_COMMUNITY_POSTS_KEY, JSON.stringify(Array.from(seenPostIdsRef.current))).catch(() => {});

          setSelectedCommunity(prev => {
            if (!prev) return null;
            const nextCommunity: Community = {
              ...prev,
              posts: (prev.posts || []).map(p => p.id === tempPostId ? {
                ...res.data,
                id: realPostId,
                content: typedContent,
                isE2EE: true,
                status: 'sent' as const,
                papers: papersAttached.length > 0 ? papersAttached : (res.data.papers || []),
              } : p)
            };
            persistCommunityDetailCache(nextCommunity);
            return nextCommunity;
          });

          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 50);
          return;
        }

        lastError = res.error || lastError;
        // Don't retry client validation/auth errors (400/403/404)
        if (/required|characters|join this community|not found|unauthorized/i.test(lastError)) {
          break;
        }
      } catch (err: any) {
        lastError = err?.message || lastError;
      }

      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, attempt * 1000));
      }
    }

    // Keep message visible as 'failed' so the user can tap to retry instead of losing it
    setSelectedCommunity(prev => {
      if (!prev) return null;
      return {
        ...prev,
        posts: (prev.posts || []).map(p => p.id === tempPostId ? { ...p, status: 'failed' } : p)
      };
    });
    Alert.alert('Message Not Sent', `${lastError} Tap the failed message to retry.`);
  };

  const handleRetryPost = async (post: CommunityPost) => {
    if (!selectedCommunity || post.status !== 'failed') return;
    const commId = String(selectedCommunity.id || (selectedCommunity as any)._id || '');
    if (!commId) return;

    setSelectedCommunity(prev => {
      if (!prev) return null;
      return {
        ...prev,
        posts: (prev.posts || []).map(p => p.id === post.id ? { ...p, status: 'sending' } : p)
      };
    });

    const paperIds = (post.papers || []).map(p => p.id);
    await transmitPost(commId, post.id, post.content, paperIds, post.papers || []);
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

    const commId = String(selectedCommunity.id || (selectedCommunity as any)._id || '');
    if (!commId) {
      Alert.alert('Error', 'Community ID is missing. Please re-open the community.');
      return;
    }

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
      status: 'sending',
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

    await transmitPost(commId, tempPostId, typedContent, paperIds, papersAttached);
  };

  const handleToggleSavePaper = async (paperId: string) => {
    try {
      const paperObj = selectedCommunity?.posts?.flatMap(p => p.papers || []).find(p => p.id === paperId);
      const res = await papersApi.toggleSave(paperId, paperObj);
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
              const nextCommunity = {
                ...prev,
                posts: prev.posts?.filter(p => p.id !== postId)
              };
              persistCommunityDetailCache(nextCommunity);
              return nextCommunity;
            });
          }
        },
        { 
          text: 'Delete for everyone', 
          style: 'destructive', 
          onPress: async () => {
            try {
              // Delete from server
              const res = await communityApi.deletePost(selectedCommunity.id, postId);
              if (!res.success) {
                Alert.alert('Error', res.error || 'Failed to delete message from server.');
                return;
              }
              // Update local state & cache
              setSelectedCommunity(prev => {
                if (!prev) return prev;
                const nextCommunity = {
                  ...prev,
                  posts: prev.posts?.filter(p => p.id !== postId)
                };
                persistCommunityDetailCache(nextCommunity);
                return nextCommunity;
              });
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Failed to delete message.');
              console.warn('Failed to delete post:', err);
            }
          }
        }
      ]
    );
  };

  // Button text/icon dynamic styling matching black/white theme
  const primaryBtnTextColor = theme === 'dark' ? '#000000' : '#ffffff';

  const renderMessageItem = useCallback(({ item }: { item: CommunityPost }) => {
    const isOwnMessage =
      item.author?.avatar_initials === 'ME' ||
      item.author?.name === 'You (Researcher)' ||
      (user && item.author?.name === user.name) ||
      (user && item.user_id === user.id);

    return (
      <MessageBubbleItem
        item={item}
        isOwnMessage={Boolean(isOwnMessage)}
        userAvatarInitials={user?.avatar_initials || 'ME'}
        colors={colors}
        primaryBtnTextColor={primaryBtnTextColor}
        onRetry={handleRetryPost}
        onDelete={handleDeletePost}
        onSelectPaper={onSelectPaper}
        onToggleSavePaper={handleToggleSavePaper}
      />
    );
  }, [user, colors, primaryBtnTextColor, onSelectPaper]);

  const renderCommunityItem = useCallback(({ item }: { item: Community }) => {
    const isAdmin = Boolean(item.isAdmin || (user && String(item.created_by) === String(user.id)));
    return (
      <CommunityCardItem
        item={item}
        isAdmin={isAdmin}
        colors={colors}
        theme={theme}
        onPress={handleCommunityPress}
        onOptions={handleCommunityOptions}
      />
    );
  }, [user, colors, theme]);

  return (
    <View
      ref={containerRef}
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          paddingTop: insets.top,
          paddingLeft: insets.left,
          paddingRight: insets.right,
          paddingBottom: Platform.OS === 'android' && selectedCommunity ? androidKeyboardPadding : 0,
        },
      ]}
    >
      {selectedCommunity ? (
        // ─────────────────────────────────────────────────────────────────────────────
        // 1. DEDICATED CHAT VIEW (Screen 2 in reference image)
        // ─────────────────────────────────────────────────────────────────────────────
        <Animated.View
          style={{
            flex: 1,
            opacity: chatTransitionAnim,
            transform: [
              {
                translateX: chatTransitionAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [24, 0],
                }),
              },
            ],
          }}
        >
          <KeyboardAvoidingView 
            style={{ flex: 1 }} 
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
          >
            {/* Chat Header matching reference */}
            <View style={[styles.chatHeader, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
              <TouchableOpacity
                style={styles.chatHeaderBackBtn}
                onPress={handleBackFromChat}
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
                <View style={styles.chatHeaderTitleRow}>
                  <Text
                    style={[styles.chatHeaderTitle, { color: colors.text }]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
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

            {/* 3-Dots Menu Button: Contains Group Info, Join/Leave community */}
            <TouchableOpacity
              style={[styles.chatHeaderIconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={handleChatOptions}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel="Group and Membership Options"
            >
              <MoreVertical size={19} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Posts List */}
          <FlatList<CommunityPost>
            ref={flatListRef}
            style={{ flex: 1 }}
            data={selectedCommunity.posts || []}
            keyExtractor={(item: CommunityPost, index: number) => (item?.id ? String(item.id) : `post-${index}`)}
            initialNumToRender={15}
            maxToRenderPerBatch={12}
            windowSize={9}
            removeClippedSubviews={false}
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
            scrollEventThrottle={100}
            onScroll={(e) => {
              const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
              isNearBottomRef.current = layoutMeasurement.height + contentOffset.y >= contentSize.height - 120;
            }}
            onContentSizeChange={() => {
              if (isNearBottomRef.current) {
                flatListRef.current?.scrollToEnd({ animated: false });
              }
            }}
            onLayout={() => {
              flatListRef.current?.scrollToEnd({ animated: false });
            }}
            renderItem={renderMessageItem}
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
      </Animated.View>
      ) : (
        // ─────────────────────────────────────────────────────────────────────────────
        // 2. WHATSAPP-STYLE VERTICAL COMMUNITY LIST (Screen 1 in reference image)
        // ─────────────────────────────────────────────────────────────────────────────
        <View style={styles.verticalListWrapper}>
          {/* Top Greeting Header matching 4.png */}
          <View style={styles.listHeaderContainer}>
            <View style={{ flex: 1, paddingRight: 8, zIndex: 2 }}>
              <Text style={[styles.listHeaderGreeting, { color: colors.textMuted }]}>
                Hello, {user?.name ? user.name.split(' ')[0] : (isGuest ? 'Guest' : 'Abhishek')}
              </Text>
              <Text style={[styles.listHeaderTitle, { color: colors.text }]}>
                Communities
              </Text>
              <Text style={[styles.listHeaderSubtitle, { color: colors.textMuted }]}>
                Connect • Discuss • Grow
              </Text>
            </View>

            <View style={styles.listHeaderActions}>
              <TouchableOpacity
                style={[
                  styles.headerCircleBtn,
                  {
                    backgroundColor: colors.card,
                    borderColor: theme === 'dark' ? colors.border : '#E2E8F0',
                  }
                ]}
                onPress={() => setIsSearchVisible(!isSearchVisible)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                activeOpacity={0.8}
              >
                <Search size={19} color={colors.primary} strokeWidth={2.2} />
              </TouchableOpacity>
            </View>

            {/* 3D Blue Community Avatars Illustration matching 4.png */}
            <View style={styles.illustrationBackground}>
              <CommunitiesIllustration size={110} />
            </View>
          </View>

          {/* Search Bar (Collapsible / Toggleable) */}
          {isSearchVisible && (
            <View style={[
              styles.listSearchContainer,
              {
                backgroundColor: colors.card,
                borderColor: theme === 'dark' ? colors.border : '#E2E8F0',
              }
            ]}>
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

          {/* Filter Pills ("All Groups", "Joined") matching 4.png */}
          <View style={styles.filterPillContainer}>
            <TouchableOpacity
              style={[
                styles.filterPill,
                filterTab === 'all'
                  ? styles.filterPillActive
                  : [styles.filterPillInactive, { backgroundColor: colors.card, borderColor: theme === 'dark' ? colors.border : '#E2E8F0' }]
              ]}
              onPress={() => setFilterTab('all')}
              activeOpacity={0.8}
            >
              <Users size={16} color={filterTab === 'all' ? '#FFFFFF' : colors.text} strokeWidth={2.2} />
              <Text
                style={[
                  styles.filterPillText,
                  filterTab === 'all' ? styles.filterPillTextActive : [styles.filterPillTextInactive, { color: colors.text }]
                ]}
              >
                All Groups
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterPill,
                filterTab === 'joined'
                  ? styles.filterPillActive
                  : [styles.filterPillInactive, { backgroundColor: colors.card, borderColor: theme === 'dark' ? colors.border : '#E2E8F0' }]
              ]}
              onPress={() => {
                if (isGuest) {
                  promptGuestSignIn();
                } else {
                  setFilterTab('joined');
                }
              }}
              activeOpacity={0.8}
            >
              <Check size={16} color={filterTab === 'joined' ? '#FFFFFF' : colors.primary} strokeWidth={2.4} />
              <Text
                style={[
                  styles.filterPillText,
                  filterTab === 'joined' ? styles.filterPillTextActive : [styles.filterPillTextInactive, { color: colors.text }]
                ]}
              >
                Joined
              </Text>
            </TouchableOpacity>
          </View>

          {/* Vertical Community List rendered as beautiful cards matching 4.png */}
          {loading && !refreshing ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <FlatList<Community>
              data={filteredCommunities}
              keyExtractor={(item, index) => (item?.id ? String(item.id) : `comm-${index}`)}
              contentContainerStyle={styles.verticalListContent}
              initialNumToRender={12}
              maxToRenderPerBatch={10}
              windowSize={9}
              removeClippedSubviews={Platform.OS === 'android'}
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
              renderItem={renderCommunityItem}
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

          {/* Floating Action Button (FAB) matching reference 4.png */}
          <TouchableOpacity
            style={[styles.whatsappFab, { backgroundColor: '#1363F5' }]}
            onPress={() => {
              if (isGuest) promptGuestSignIn();
              else setIsGroupModalOpen(true);
            }}
            activeOpacity={0.85}
          >
            <Plus size={26} color="#FFFFFF" strokeWidth={2.4} />
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
      <Modal visible={isInfoModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdropDismiss}
            activeOpacity={1}
            onPress={() => setIsInfoModalOpen(false)}
          />
          <View
            style={[
              styles.modalCard,
              styles.infoModalCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                paddingBottom: Math.max(insets.bottom, 16) + 12,
              },
            ]}
          >
            {/* Top Sheet Drag Handle */}
            <View style={[styles.bottomSheetHandle, { backgroundColor: colors.border }]} />

            <View style={styles.infoModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, marginRight: 8 }}>
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
              <TouchableOpacity
                onPress={() => setIsInfoModalOpen(false)}
                style={[styles.modalCloseBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={18} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
              {selectedCommunity?.description ? (
                <View style={[styles.infoDescBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Text style={[styles.infoDescLabel, { color: colors.textMuted }]}>About Group</Text>
                  <Text style={[styles.infoDescText, { color: colors.text }]}>
                    {selectedCommunity.description}
                  </Text>
                </View>
              ) : null}

              {/* Admin status pill */}
              <View
                style={[
                  styles.roleStatusBanner,
                  {
                    backgroundColor: isCurrentUserAdmin ? colors.primary + '15' : colors.background,
                    borderColor: isCurrentUserAdmin ? colors.primary + '40' : colors.border,
                  },
                ]}
              >
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
              <View style={{ marginTop: 16 }}>
                {(() => {
                  let membersList = [...(selectedCommunity?.members || [])];
                  if (membersList.length === 0 && user) {
                    membersList.push({
                      id: user.id,
                      name: user.name || 'You',
                      avatar_initials: user.avatar_initials || 'ME',
                      community_role: isCurrentUserAdmin ? 'admin' : 'member',
                      role: user.role || 'Researcher',
                    });
                  }
                  if (selectedCommunity?.posts) {
                    selectedCommunity.posts.forEach((p) => {
                      const postAuthor = p.author;
                      if (postAuthor && postAuthor.name && !membersList.some((m) => m.name === postAuthor.name)) {
                        membersList.push({
                          id: p.user_id || `user-${postAuthor.name}`,
                          name: postAuthor.name,
                          avatar_initials: postAuthor.avatar_initials || postAuthor.name.slice(0, 2).toUpperCase(),
                          community_role: 'member',
                          role: postAuthor.role || 'Contributor',
                        });
                      }
                    });
                  }

                  return (
                    <>
                      <View style={styles.sectionHeaderBlock}>
                        <View style={styles.sectionTitleRow}>
                          <Text style={[styles.infoSectionTitle, { color: colors.text }]}>
                            MEMBERS & ROLES
                          </Text>
                          <Text style={[styles.memberCountBadge, { color: colors.textMuted }]}>
                            {membersList.length} {membersList.length === 1 ? 'member' : 'members'}
                          </Text>
                        </View>
                        {isCurrentUserAdmin && (
                          <Text style={[styles.adminHintText, { color: colors.primary }]}>
                            Admin: Tap to Promote / Demote
                          </Text>
                        )}
                      </View>

                      {membersList.map((m: CommunityMemberInfo) => {
                        const isSelf = user?.id === m.id;
                        const isMemberAdmin = m.community_role === 'admin';

                        return (
                          <View key={m.id} style={[styles.memberItemRow, { borderBottomColor: colors.border + '40' }]}>
                            <View style={styles.memberLeftCol}>
                              <View style={[styles.memberAvatar, { backgroundColor: colors.primary }]}>
                                <Text style={[styles.avatarText, { color: primaryBtnTextColor }]}>
                                  {m.avatar_initials || (m.name ? m.name.slice(0, 2).toUpperCase() : 'U')}
                                </Text>
                              </View>
                              <View style={{ flex: 1, marginRight: 8 }}>
                                <Text style={[styles.memberName, { color: colors.text }]} numberOfLines={1}>
                                  {m.name || 'Researcher'} {isSelf ? '(You)' : ''}
                                </Text>
                                <Text style={[styles.memberSubtext, { color: colors.textMuted }]} numberOfLines={1}>
                                  {m.role || 'Contributor'}
                                </Text>
                              </View>
                            </View>

                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              {/* Admin badge */}
                              {isMemberAdmin && (
                                <View
                                  style={[
                                    styles.roleBadgePill,
                                    { backgroundColor: colors.primary + '20', borderColor: colors.primary + '50', borderWidth: 1 },
                                  ]}
                                >
                                  <Shield size={10} color={colors.primary} style={{ marginRight: 3 }} />
                                  <Text style={[styles.roleBadgeText, { color: colors.primary }]}>Admin</Text>
                                </View>
                              )}

                              {/* Regular member badge if viewer is NOT admin */}
                              {!isMemberAdmin && !isCurrentUserAdmin && (
                                <View
                                  style={[
                                    styles.roleBadgePill,
                                    { backgroundColor: colors.background, borderColor: colors.border, borderWidth: 1 },
                                  ]}
                                >
                                  <Text style={[styles.roleBadgeText, { color: colors.textMuted }]}>Member</Text>
                                </View>
                              )}

                              {/* Admin Action: Promote / Demote */}
                              {isCurrentUserAdmin && (
                                <TouchableOpacity
                                  style={[
                                    styles.roleActionBtn,
                                    {
                                      backgroundColor: isMemberAdmin ? '#ef444418' : colors.primary + '18',
                                      borderColor: isMemberAdmin ? '#ef444450' : colors.primary + '50',
                                    },
                                  ]}
                                  onPress={() => handleToggleMemberRole(m.id, m.community_role, m.name)}
                                  activeOpacity={0.7}
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
                    </>
                  );
                })()}
              </View>

              {/* Admin Actions: Delete Community */}
              {isCurrentUserAdmin && (
                <TouchableOpacity
                  style={[styles.deleteCommunityBtn, { marginTop: 24 }]}
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
                keyExtractor={(item, index) => (item?.id ? `${item.id}-${index}` : `saved-paper-${index}`)}
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
    </View>
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

  // ── 1. Vertical Community List Styles matching reference 4.png ───────────
  verticalListWrapper: {
    flex: 1,
    position: 'relative',
  },
  listHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 6,
    position: 'relative',
    minHeight: 52,
  },
  listHeaderGreeting: {
    fontSize: 12.5,
    fontWeight: '500',
    marginBottom: 1,
    letterSpacing: -0.2,
  },
  listHeaderTitle: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
    lineHeight: 30,
  },
  listHeaderSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 1,
  },
  listHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
  },
  illustrationBackground: {
    position: 'absolute',
    right: 0,
    top: -15,
    opacity: 0.85,
    zIndex: 1,
    pointerEvents: 'none',
  },
  headerCircleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1A3B70',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  listSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 2,
    marginBottom: 8,
    paddingHorizontal: 14,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
  },
  listSearchInput: {
    flex: 1,
    fontSize: 13.5,
    paddingVertical: 0,
  },
  filterPillContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 8,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterPillActive: {
    backgroundColor: '#1363F5',
    borderColor: '#1363F5',
    shadowColor: '#1363F5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  filterPillInactive: {
    borderColor: '#E2E8F0',
    shadowColor: '#1A3B70',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  filterPillText: {
    fontSize: 13,
    fontWeight: '600',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  filterPillTextInactive: {
    color: '#64748B',
    fontWeight: '600',
  },
  verticalListContent: {
    paddingHorizontal: 0,
    paddingTop: 4,
    paddingBottom: 24,
  },
  communityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 14,
    borderWidth: 1,
    shadowColor: '#1A3B70',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  communityAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  communityDetails: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    marginRight: 8,
  },
  communityTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
    marginBottom: 3,
    gap: 6,
  },
  communityName: {
    fontSize: 15.5,
    fontWeight: '700',
    letterSpacing: -0.2,
    flexShrink: 1,
  },
  adminHeaderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 8,
    gap: 3,
  },
  adminHeaderBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2563EB',
  },
  communitySnippet: {
    fontSize: 12.5,
    lineHeight: 17,
  },
  communityRightCol: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  communityMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  communityMeta: {
    fontSize: 11.5,
    fontWeight: '500',
  },
  isMemberDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 4,
  },
  threeDotsBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  joinedBadgePill: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  joinedBadgeTextPill: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#2563EB',
  },
  joinActionBtn: {
    backgroundColor: '#FFFFFF',
    borderColor: '#2563EB',
    borderWidth: 1.2,
    paddingHorizontal: 14,
    paddingVertical: 3.5,
    borderRadius: 12,
  },
  joinActionBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#2563EB',
  },
  whatsappFab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1363F5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
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
    minWidth: 0,
    marginRight: 8,
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
    minWidth: 0,
    justifyContent: 'center',
  },
  chatHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
    gap: 6,
  },
  chatHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
    flexShrink: 1,
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
  modalBackdropDismiss: {
    ...StyleSheet.absoluteFill,
  },
  infoModalCard: {
    width: '100%',
    maxHeight: '85%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  bottomSheetHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 14,
  },
  infoModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    marginBottom: 4,
  },
  modalIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalIconEmoji: {
    fontSize: 22,
  },
  infoModalSub: {
    fontSize: 12,
    marginTop: 2,
  },
  infoDescBox: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  infoDescLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  infoDescText: {
    fontSize: 13,
    lineHeight: 18,
  },
  roleStatusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  roleStatusText: {
    fontSize: 13,
  },
  sectionHeaderBlock: {
    marginBottom: 10,
    marginTop: 2,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  infoSectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  memberCountBadge: {
    fontSize: 12,
    fontWeight: '600',
  },
  adminHintText: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 3,
  },
  memberItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
    borderBottomWidth: 1,
  },
  memberLeftCol: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  memberAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  roleActionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
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
    paddingVertical: 13,
    borderRadius: 10,
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
