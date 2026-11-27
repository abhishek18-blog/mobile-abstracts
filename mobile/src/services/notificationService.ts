import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { userApi } from './api';

export const NOTIFICATION_PREFS_KEY = '@app_notification_prefs';
export const EXPO_PUSH_TOKEN_KEY = '@expo_push_token';

export interface NotificationPrefs {
  communityAlerts: boolean;
}

const DEFAULT_PREFS: NotificationPrefs = {
  communityAlerts: true,
};

let activeCommunityId: string | null = null;

// Configure foreground notification behavior: alert heads-up banner, sound, and badge
// Suppresses foreground banner only if the user is actively viewing that exact community chat.
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const prefsRaw = await AsyncStorage.getItem(NOTIFICATION_PREFS_KEY).catch(() => null);
    let communityAlertsEnabled = true;
    if (prefsRaw) {
      try {
        const parsed = JSON.parse(prefsRaw);
        if (parsed && parsed.communityAlerts === false) {
          communityAlertsEnabled = false;
        }
      } catch {}
    }

    const notifCommunityId = notification?.request?.content?.data?.communityId;
    const isViewingSameCommunity =
      !!activeCommunityId &&
      !!notifCommunityId &&
      String(activeCommunityId) === String(notifCommunityId);

    const shouldDisplay = communityAlertsEnabled && !isViewingSameCommunity;

    return {
      shouldShowAlert: shouldDisplay,
      shouldPlaySound: shouldDisplay,
      shouldSetBadge: shouldDisplay,
      shouldShowBanner: shouldDisplay,
      shouldShowList: shouldDisplay,
    };
  },
});

class NotificationService {
  private isInitialized = false;

  setActiveCommunityId(communityId: string | null) {
    activeCommunityId = communityId;
  }

  async getPrefs(): Promise<NotificationPrefs> {
    try {
      const raw = await AsyncStorage.getItem(NOTIFICATION_PREFS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          communityAlerts: parsed.communityAlerts !== undefined ? Boolean(parsed.communityAlerts) : true,
        };
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
        // Community Messages channel (only active notification category)
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

        // Clean up legacy recommended-research channel if it exists
        await Notifications.deleteNotificationChannelAsync('recommended-research').catch(() => {});

        // Default fallback channel
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
   * Registers the device's Expo/FCM push token with the backend so community chat
   * notifications are delivered even when the app is completely closed.
   */
  async registerForPushNotificationsAsync(): Promise<string | null> {
    if (Platform.OS === 'web') return null;

    try {
      const granted = await this.initialize();
      if (!granted) return null;

      const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ??
        (Constants as any).easConfig?.projectId ??
        'c81e5673-8629-4bd7-a671-2591d968d212';

      const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
      const pushToken = tokenResponse?.data;
      if (!pushToken) return null;

      await AsyncStorage.setItem(EXPO_PUSH_TOKEN_KEY, pushToken);
      await userApi.registerPushToken(pushToken).catch((err) => {
        console.warn('[NotificationService] Failed to sync push token with server:', err?.message);
      });

      return pushToken;
    } catch (err) {
      console.warn('[NotificationService] Push token registration error:', err);
      return null;
    }
  }

  /**
   * Removes this device's push token from the backend on logout.
   */
  async unregisterPushToken(): Promise<void> {
    try {
      const pushToken = await AsyncStorage.getItem(EXPO_PUSH_TOKEN_KEY);
      if (pushToken) {
        await userApi.unregisterPushToken(pushToken).catch(() => {});
        await AsyncStorage.removeItem(EXPO_PUSH_TOKEN_KEY);
      }
    } catch {}
  }

  /**
   * Delivers a local notification when another member posts in a joined community
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
   * Diagnostic test alert so users can test community notifications on device
   */
  async sendTestNotification() {
    await this.initialize();
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '💬 Community Chat Notifications Active',
        body: 'You will receive instant alerts for new community messages even when the app is closed.',
        data: { screen: 'Community' },
        sound: 'default',
        color: '#3b82f6',
      },
      trigger: Platform.OS === 'android' ? { channelId: 'community-messages' } : null,
    });
  }
}

export const notificationService = new NotificationService();
