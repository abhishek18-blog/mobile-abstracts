import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure notification behavior: show heads-up alert, play sound, set badge
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

  async initialize(): Promise<boolean> {
    if (this.isInitialized) return true;

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('[NotificationService] Notification permission not granted');
        return false;
      }

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('community-messages', {
          name: 'Community Messages',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#3b82f6',
          sound: 'default',
        });
      }

      this.isInitialized = true;
      return true;
    } catch (err) {
      console.warn('[NotificationService] Initialization error:', err);
      return false;
    }
  }

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
        },
        trigger: null, // Delivers immediately to user device
      });
    } catch (err) {
      console.warn('[NotificationService] Failed to trigger notification:', err);
    }
  }
}

export const notificationService = new NotificationService();
