import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

class NotificationService {
  private token: string | null = null;

  async init() {
    if (!Device.isDevice) {
      console.log('Push notifications require a physical device');
      return;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Push notification permission denied');
      return;
    }

    // Get push token
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: Constants.expoConfig?.extra?.eas?.projectId,
    });
    this.token = tokenData.data;

    // Configure notification behavior
    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#4fc3f7',
      });
    }

    // Listen for notifications
    Notifications.addNotificationReceivedListener(this.handleNotification);
    Notifications.addNotificationResponseReceivedListener(this.handleNotificationResponse);
  }

  private handleNotification = (notification: Notifications.Notification) => {
    console.log('Notification received:', notification);
  };

  private handleNotificationResponse = (response: Notifications.NotificationResponse) => {
    const data = response.notification.request.content.data;
    console.log('Notification response:', data);
    // Handle deep linking based on notification data
  };

  async scheduleDailyReminder(hour: number = 9, minute: number = 0) {
    await Notifications.cancelAllScheduledNotificationsAsync();
    
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🧠 Time for brain training!',
        body: 'Complete your daily workout to maintain your streak!',
        data: { type: 'daily_reminder', screen: 'Games' },
      },
      trigger: {
        hour,
        minute,
        repeats: true,
      },
    });
  }

  async scheduleStreakWarning() {
    const evening = new Date();
    evening.setHours(20, 0, 0, 0);
    
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '⚠️ Streak in danger!',
        body: "Don't lose your streak! Play at least one game before midnight.",
        data: { type: 'streak_warning', screen: 'Games' },
      },
      trigger: {
        date: evening,
      },
    });
  }

  async sendAchievementNotification(achievementName: string) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🏆 Achievement Unlocked!',
        body: `Congratulations! You earned: ${achievementName}`,
        data: { type: 'achievement', screen: 'Profile' },
      },
      trigger: null, // Immediate
    });
  }

  async sendLevelUpNotification(level: number) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '⭐ Level Up!',
        body: `You've reached Level ${level}! Keep up the great work!`,
        data: { type: 'level_up', screen: 'Dashboard' },
      },
      trigger: null,
    });
  }

  getToken() {
    return this.token;
  }

  async cancelAll() {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }
}

export const notificationService = new NotificationService();


