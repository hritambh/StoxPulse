import { Platform } from 'react-native';
import api from './api';

export async function registerForPushNotifications(): Promise<string | null> {
  if (Platform.OS === 'web') {
    console.warn('Push notifications are not supported on web');
    return null;
  }

  const Device = await import('expo-device');
  const Notifications = await import('expo-notifications');
  const Constants = (await import('expo-constants')).default;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });

  if (!Device.isDevice) {
    console.warn('Push notifications require a physical device');
    return null;
  }

  const { status: existingStatus } =
    await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('Push notification permission not granted');
    return null;
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });

  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
    });
  }

  try {
    await api.patch('/user/push-token', { pushToken: tokenData.data });
  } catch (err) {
    console.error('Failed to register push token with server:', err);
  }

  return tokenData.data;
}
