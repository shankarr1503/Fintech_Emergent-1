import React, { useState } from 'react';
import { Share, View } from 'react-native';
import { Alert } from '../src/game/dialog';
import { useRouter } from 'expo-router';
import { deleteUserAccount, errorMessage, exportUserData, getAuditLog, getSecuritySettings, updateSecuritySettings } from '../src/services/api';
import { useAuth } from '../src/context/AuthContext';
import { useUserData } from '../src/game/useData';
import { MenuRow } from '../src/game/pieces';
import { C } from '../src/game/theme';
import { Body, Box, Loading, PixelSwitch, PText, Screen, SectionTitle } from '../src/game/ui';
import { formatDate, formatTime } from '../src/utils/format';

type Settings = { biometric_enabled: boolean; transaction_alerts: boolean; login_notifications: boolean };

const TOGGLES: { key: keyof Settings; label: string; hint: string }[] = [
  { key: 'biometric_enabled', label: 'Biometric lock', hint: 'Use fingerprint or Face ID to open the app' },
  { key: 'transaction_alerts', label: 'Payment alerts', hint: 'Notify me for every debit and credit' },
  { key: 'login_notifications', label: 'Login alerts', hint: 'Tell me when a new device signs in' },
];

export default function SecurityScreen() {
  const router = useRouter();
  const { logout } = useAuth();
  const [busy, setBusy] = useState(false);
  const { data, setData, loading, userId } = useUserData(async (id) => {
    const [settings, log] = await Promise.all([getSecuritySettings(id), getAuditLog(id)]);
    return { settings: settings as Settings, log: log as any[] };
  });

  if (loading || !data) return <Loading label="RAISING SHIELDS" world="underground" />;

  const toggle = async (key: keyof Settings, value: boolean) => {
    const previous = data.settings;
    const next = { ...previous, [key]: value };
    setData({ ...data, settings: next });
    try {
      await updateSecuritySettings(userId, next);
    } catch (e) {
      setData({ ...data, settings: previous });
      Alert.alert('Could not update', errorMessage(e));
    }
  };

  const exportData = async () => {
    setBusy(true);
    try {
      const dump = await exportUserData(userId);
      await Share.share({ title: 'CoinQuest data export', message: JSON.stringify(dump, null, 2) });
    } catch (e) {
      Alert.alert('Export failed', errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const remove = () =>
    Alert.alert('GAME OVER?', 'This permanently deletes your account, transactions, goals and progress. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete forever',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteUserAccount(userId, 'User requested deletion');
            await logout();
            router.replace('/(auth)/login');
          } catch (e) {
            Alert.alert('Could not delete', errorMessage(e));
          }
        },
      },
    ]);

  return (
    <Screen title="SHIELDS" subtitle="PRIVACY & SECURITY" world="underground">
      <Box>
        {TOGGLES.map((t) => (
          <MenuRow key={t.key} sprite="shield" label={t.label} hint={t.hint} right={<PixelSwitch value={!!data.settings[t.key]} onChange={(v) => toggle(t.key, v)} />} />
        ))}
      </Box>

      <SectionTitle>YOUR DATA</SectionTitle>
      <Box>
        <MenuRow sprite="scroll" label={busy ? 'Exporting...' : 'Export my data'} hint="Download everything we store about you" onPress={busy ? undefined : exportData} />
        <MenuRow sprite="pipe" label="Linked accounts" hint="Manage Account Aggregator consent" onPress={() => router.push('/account-aggregator')} />
        <MenuRow sprite="boss" label="Delete account" hint="Permanently erase your data" danger onPress={remove} />
      </Box>

      <SectionTitle>SAVE POINTS (ACTIVITY)</SectionTitle>
      <Box padding={12}>
        {data.log.slice(0, 8).map((l, i) => (
          <View key={i} style={{ paddingVertical: 8, borderBottomWidth: 2, borderColor: C.paperDark }}>
            <PText size={8}>{String(l.action).replace(/_/g, ' ').toUpperCase()}</PText>
            <Body size={12} style={{ marginTop: 3 }}>
              {formatDate(l.timestamp)} {formatTime(l.timestamp)}
              {l.device ? ` • ${l.device}` : ''}
              {l.location ? ` • ${l.location}` : ''}
            </Body>
          </View>
        ))}
      </Box>
      <Body size={12} color={C.gray} center style={{ marginTop: 12 }}>
        Data stored in India • encrypted in transit and at rest • DPDP Act 2023
      </Body>
    </Screen>
  );
}
