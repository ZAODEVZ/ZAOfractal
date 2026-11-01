// Binds the reminder logic to expo-notifications. Local only, no server, no push token.
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { CHANNEL_ID, enableReminders, topUpReminders, type NotificationPort } from './reminders';

export const remindersSupported = Platform.OS !== 'web';

const port: NotificationPort = {
  async listIds() {
    const all = await Notifications.getAllScheduledNotificationsAsync();
    return all.map((n) => n.identifier);
  },
  cancelAll: () => Notifications.cancelAllScheduledNotificationsAsync(),
  async schedule(r) {
    await Notifications.scheduleNotificationAsync({
      identifier: r.id,
      content: { title: r.title, body: r.body, sound: 'default' },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(r.at),
        channelId: CHANNEL_ID,
      },
    });
  },
};

export function setupNotifications() {
  if (!remindersSupported) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

/** Whether reminders are on, extending the schedule if they are. */
export async function syncReminders(): Promise<boolean> {
  if (!remindersSupported) return false;
  return topUpReminders(port, Date.now());
}

export type EnableResult = 'on' | 'denied';

export async function turnOnReminders(): Promise<EnableResult> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Monday fractal',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
  const current = await Notifications.getPermissionsAsync();
  const granted = current.granted || (await Notifications.requestPermissionsAsync()).granted;
  if (!granted) return 'denied';
  await enableReminders(port, Date.now());
  return 'on';
}

export async function turnOffReminders(): Promise<void> {
  await port.cancelAll();
}
