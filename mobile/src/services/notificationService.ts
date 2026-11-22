import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { recommendationApi } from './api';
import { Paper } from '../types';

export const SEEN_PAPERS_STORAGE_KEY = '@seen_rec_paper_ids';
export const NOTIFICATION_PREFS_KEY = '@app_notification_prefs';

export interface NotificationPrefs {
  paperAlerts: boolean;
  communityAlerts: boolean;
}

const DEFAULT_PREFS: NotificationPrefs = {
  paperAlerts: true,
  communityAlerts: true,
};

// Configure foreground notification behavior: alert heads-up banner, sound, and badge
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

class NotificationService {
  private isInitialized = false;

  async getPrefs(): Promise<NotificationPrefs> {
    try {
      const raw = await AsyncStorage.getItem(NOTIFICATION_PREFS_KEY);
      if (raw) {
        return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
      }
    } catch {}
    return DEFAULT_PREFS;
  }

  async savePrefs(prefs: Partial<NotificationPrefs>): Promise<NotificationPrefs> {
    const current = await this.getPrefs();
    const updated = { ...current, ...prefs };
    try {
      await AsyncStorage.setItem(NOTIFICATION_PREFS_KEY, JSON.stringify(updated));
    } catch {}
    return updated;
  }

  async initialize(): Promise<boolean> {
    if (this.isInitialized) return true;

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
          },
        });
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('[NotificationService] Notification permission not granted');
        return false;
      }

      if (Platform.OS === 'android') {
        // Channel 1: Community Messages
        await Notifications.setNotificationChannelAsync('community-messages', {
          name: 'Community Messages',
          description: 'Notifications for new discussions and messages in joined research groups',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#3b82f6',
          sound: 'default',
          enableVibrate: true,
          showBadge: true,
        });

        // Channel 2: Recommended Research Papers
        await Notifications.setNotificationChannelAsync('recommended-research', {
          name: 'Recommended Research',
          description: 'Alerts when newly published papers match your personalized research topics',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 300, 200, 300],
          lightColor: '#10b981',
          sound: 'default',
          enableVibrate: true,
          showBadge: true,
        });

        // Channel 3: Default General Alerts
        await Notifications.setNotificationChannelAsync('default', {
          name: 'General Alerts',
          importance: Notifications.AndroidImportance.MAX,
          sound: 'default',
          enableVibrate: true,
          showBadge: true,
        });
      }

      this.isInitialized = true;
      return true;
    } catch (err) {
      console.warn('[NotificationService] Initialization error:', err);
      return false;
    }
  }

  /**
   * Delivers a notification when another member posts in a joined community
   */
  async sendCommunityMessageNotification({
    communityName,
    senderName,
    content,
    communityId,
    hasAttachment = false,
  }: {
    communityName: string;
    senderName: string;
    content: string;
    communityId: string;
    hasAttachment?: boolean;
  }) {
    try {
      const prefs = await this.getPrefs();
      if (!prefs.communityAlerts) return;

      await this.initialize();

      const bodyText = hasAttachment
        ? `${content ? content + ' ' : ''}📎 Attached a research paper`
        : content || 'Sent a new message';

      await Notifications.scheduleNotificationAsync({
        content: {
          title: `${senderName || 'Researcher'} in ${communityName}`,
          body: bodyText,
          data: { communityId, screen: 'Community' },
          sound: 'default',
          color: '#3b82f6',
        },
        trigger: Platform.OS === 'android' ? { channelId: 'community-messages' } : null,
      });
    } catch (err) {
      console.warn('[NotificationService] Failed to trigger community notification:', err);
    }
  }

  /**
   * Delivers a notification when a new paper is published in user's recommended topics
   * Format requested: "A new research from ...."
   */
  async sendNewPaperNotification({
    topic,
    paperTitle,
    sourceOrAuthor,
    paperId,
  }: {
    topic: string;
    paperTitle: string;
    sourceOrAuthor?: string;
    paperId?: string;
  }) {
    try {
      const prefs = await this.getPrefs();
      if (!prefs.paperAlerts) return;

      await this.initialize();

      const authorText = sourceOrAuthor ? sourceOrAuthor : 'ArXiv Researchers';
      const notificationBody = `A new research from ${authorText}: "${paperTitle}"`;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: `New Research in ${topic}`,
          body: notificationBody,
          data: { paperId, screen: 'ForYou', topic },
          sound: 'default',
          color: '#10b981',
        },
        trigger: Platform.OS === 'android' ? { channelId: 'recommended-research' } : null,
      });
    } catch (err) {
      console.warn('[NotificationService] Failed to trigger paper notification:', err);
    }
  }

  /**
   * Automated check: compares fresh papers in user's recommended interests against seen IDs.
   * If fresh papers appear, sends "A new research from ..." notification and records seen ID.
   */
  async checkAndNotifyNewRecommendedPapers(interests: string[]) {
    if (!interests || interests.length === 0) return;

    try {
      const prefs = await this.getPrefs();
      if (!prefs.paperAlerts) return;

      const rawSeen = await AsyncStorage.getItem(SEEN_PAPERS_STORAGE_KEY);
      let seenSet: Set<string>;

      if (!rawSeen) {
        // Initial setup run: seed seen papers so we do not flood the user on first launch
        seenSet = new Set<string>();
        for (const topic of interests.slice(0, 2)) {
          const papers = await recommendationApi.getRecommendations(topic, 10);
          papers.forEach((p: Paper) => {
            if (p.id) seenSet.add(p.id);
          });
        }
        await AsyncStorage.setItem(SEEN_PAPERS_STORAGE_KEY, JSON.stringify(Array.from(seenSet)));
        return;
      }

      seenSet = new Set<string>(JSON.parse(rawSeen));

      // Check user's recommended topics for newly published papers
      let newPapersFound = 0;
      for (const topic of interests) {
        if (newPapersFound >= 2) break; // Limit to 2 per cycle to avoid notification flood

        const freshPapers = await recommendationApi.getRecommendations(topic, 8);
        for (const paper of freshPapers) {
          if (paper && paper.id && !seenSet.has(paper.id)) {
            seenSet.add(paper.id);
            newPapersFound++;

            const source = paper.authors?.[0] || paper.tags?.[0] || 'ArXiv';
            await this.sendNewPaperNotification({
              topic,
              paperTitle: paper.title,
              sourceOrAuthor: source,
              paperId: paper.id,
            });

            if (newPapersFound >= 2) break;
          }
        }
      }

      if (newPapersFound > 0) {
        await AsyncStorage.setItem(SEEN_PAPERS_STORAGE_KEY, JSON.stringify(Array.from(seenSet)));
      }
    } catch (err) {
      console.warn('[NotificationService] Error checking recommended papers:', err);
    }
  }

  /**
   * Diagnostic test alert so users can test on physical device / installed APK
   */
  async sendTestNotification() {
    await this.initialize();
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🔔 Abstracts Notifications Active',
        body: 'A new research from ArXiv: Your permanent APK is ready to receive instant alerts!',
        data: { screen: 'Settings' },
        sound: 'default',
      },
      trigger: Platform.OS === 'android' ? { channelId: 'recommended-research' } : null,
    });
  }
}

export const notificationService = new NotificationService();
