import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { registerPushToken } from './api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

export type PushStatus = 'granted' | 'denied' | 'undetermined' | 'unsupported';

export async function pushStatus(): Promise<PushStatus> {
  if (Platform.OS === 'web' || !Device.isDevice) return 'unsupported';
  try {
    const { status, canAskAgain } = await Notifications.getPermissionsAsync();
    if (status === 'granted') return 'granted';
    return canAskAgain ? 'undetermined' : 'denied';
  } catch {
    return 'unsupported';
  }
}

/**
 * Hand the Expo push token to the server. With `ask`, shows the system permission prompt; without it,
 * only refreshes the token if the user already said yes (the prompt is never shown out of context).
 * Quietly does nothing on web or simulators.
 */
export async function registerForPush(userId: string, ask = false) {
  if (Platform.OS === 'web' || !Device.isDevice) return;
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('alerts', { name: 'Payment and security alerts', importance: Notifications.AndroidImportance.HIGH });
    }
    let { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted' && ask) status = (await Notifications.requestPermissionsAsync()).status;
    if (status !== 'granted') return;
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    const { data } = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    await registerPushToken(userId, data);
  } catch {
    // Push is best-effort: in-app notifications still work without it.
  }
}
