import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import NetInfo, { useNetInfo } from '@react-native-community/netinfo';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, F, themed } from './theme';
import { API_BASE } from '../services/api';

// Check reachability against our own API instead of NetInfo's default (a Google URL),
// so no request about this device goes to a third party.
NetInfo.configure({ reachabilityUrl: `${API_BASE}/api/health`, reachabilityTest: async (res) => res.status === 200 });

/** `isConnected === false` only once NetInfo is sure; null (unknown) shows nothing. */
export const useOnline = () => useNetInfo().isConnected !== false;

export function OfflineBanner() {
  const online = useOnline();
  const insets = useSafeAreaInsets();
  if (online) return null;
  return (
    <View style={[styles.bar, { paddingTop: insets.top + 6 }]} accessibilityRole="alert" accessibilityLiveRegion="polite" testID="offline-banner">
      <Feather name="wifi-off" size={14} color="#fff" />
      <Text style={styles.text}>You&apos;re offline. Payments are paused until you reconnect.</Text>
    </View>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    bar: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.red, paddingHorizontal: 16, paddingBottom: 8, zIndex: 1500 },
    text: { fontFamily: F.medium, fontSize: 13, color: '#fff', flex: 1 },
  }),
);
