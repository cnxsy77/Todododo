import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const CHANNEL_ID = 'task-reminders';

// 前台收到通知时的展示策略（模块顶层调用，import 即生效）
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    priority: Notifications.AndroidNotificationPriority.HIGH,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * 初始化通知：创建 Android 通知渠道。在 _layout 启动时调用一次。
 */
export const initNotifications = async (): Promise<void> => {
  if (Platform.OS === 'web') return;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: '任务提醒',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
    });
  }
};

/**
 * 请求通知权限，返回是否已授权。Web 端恒为 false。
 */
export const ensureNotificationPermissions = async (): Promise<boolean> => {
  if (Platform.OS === 'web') return false;
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
};

/**
 * 调度任务提醒。identifier 复用 taskId 便于取消；已过期的时间不调度。
 */
export const scheduleTaskReminder = async (
  taskId: string,
  title: string,
  reminderAt: number
): Promise<void> => {
  if (Platform.OS === 'web') return;
  if (reminderAt <= Date.now()) return;
  // 先取消同 identifier 的旧调度，避免重复
  await Notifications.cancelScheduledNotificationAsync(taskId);
  await Notifications.scheduleNotificationAsync({
    identifier: taskId,
    content: {
      title: '任务提醒',
      body: title,
      data: { taskId },
      sound: 'default',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(reminderAt),
      channelId: CHANNEL_ID,
    },
  });
};

/**
 * 取消任务提醒（按 identifier）。
 */
export const cancelTaskReminder = async (taskId: string): Promise<void> => {
  if (Platform.OS === 'web') return;
  await Notifications.cancelScheduledNotificationAsync(taskId);
};
