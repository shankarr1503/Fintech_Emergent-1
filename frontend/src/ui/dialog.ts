import { Alert as RNAlert, AlertButton, Platform } from 'react-native';

/**
 * Drop-in replacement for React Native's Alert. On web, react-native-web's
 * Alert.alert is a no-op, so confirmations would silently do nothing; fall back
 * to the browser's confirm/alert dialogs there.
 */
export const Alert = {
  alert(title: string, message?: string, buttons?: AlertButton[]) {
    if (Platform.OS !== 'web') {
      RNAlert.alert(title, message, buttons);
      return;
    }
    const text = message ? `${title}\n\n${message}` : title;
    const actions = (buttons ?? []).filter((b) => b.style !== 'cancel');
    if ((buttons?.length ?? 0) > 1) {
      if (window.confirm(text)) actions[0]?.onPress?.();
      else buttons?.find((b) => b.style === 'cancel')?.onPress?.();
    } else {
      window.alert(text);
      buttons?.[0]?.onPress?.();
    }
  },
};
