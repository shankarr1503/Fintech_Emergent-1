import React, { useState } from 'react';
import { Share, View } from 'react-native';
import { deleteUserAccount, errorMessage, exportUserData, getAuditLog, getSecuritySettings, updateSecuritySettings } from '../src/services/api';
import { useAuth } from '../src/context/AuthContext';
import { useUserData } from '../src/game/useData';
import { Alert } from '../src/ui/dialog';
import { Card, Divider, IconMark, Row, Screen, Section, SkeletonScreen, Small, Toggle } from '../src/ui/kit';
import { C } from '../src/ui/theme';
import { formatDate, formatTime } from '../src/utils/format';

type Settings = { biometric_enabled: boolean; transaction_alerts: boolean; login_notifications: boolean };

const TOGGLES: { key: keyof Settings; title: string; sub: string }[] = [
  { key: 'biometric_enabled', title: 'App lock', sub: 'Fingerprint or Face ID to open CoinQuest' },
  { key: 'transaction_alerts', title: 'Payment alerts', sub: 'A notification for every debit and credit' },
  { key: 'login_notifications', title: 'New device alerts', sub: 'When someone signs in on another phone' },
];

export default function Security() {
  const { logout } = useAuth();
  const [busy, setBusy] = useState(false);
  const { data, setData, loading, userId } = useUserData(async (id) => {
    const [settings, log] = await Promise.all([getSecuritySettings(id), getAuditLog(id)]);
    return { settings: settings as Settings, log: log as any[] };
  });

  if (loading || !data)
    return (
      <Screen title="Security">
        <SkeletonScreen />
      </Screen>
    );

  const toggle = async (key: keyof Settings, value: boolean) => {
    const prev = data.settings;
    setData({ ...data, settings: { ...prev, [key]: value } });
    try {
      await updateSecuritySettings(userId, { ...prev, [key]: value });
    } catch (e) {
      setData({ ...data, settings: prev });
      Alert.alert("Couldn't save", errorMessage(e));
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
    Alert.alert('Delete your account?', 'Your transactions, goals, coins and progress will be erased. This cannot be undone.', [
      { text: 'Keep my account', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteUserAccount(userId, 'User requested deletion');
            await logout();
          } catch (e) {
            Alert.alert("Couldn't delete", errorMessage(e));
          }
        },
      },
    ]);

  return (
    <Screen title="Security">
      <Section title="Protection" style={{ marginTop: 18 }}>
        <Card padded={false} style={{ paddingHorizontal: 16 }}>
          {TOGGLES.map((t, i) => (
            <View key={t.key}>
              {i > 0 && <Divider />}
              <Row title={t.title} subtitle={t.sub} right={<Toggle value={!!data.settings[t.key]} onChange={(v) => toggle(t.key, v)} />} />
            </View>
          ))}
        </Card>
      </Section>

      <Section title="Your data">
        <Card padded={false} style={{ paddingHorizontal: 16 }}>
          <Row left={<IconMark icon="download" tint="export" />} title={busy ? 'Preparing…' : 'Download my data'} subtitle="Everything we store about you" onPress={busy ? undefined : exportData} chevron />
          <Divider inset={54} />
          <Row left={<IconMark icon="trash-2" tint="delete" />} title="Delete account" subtitle="Permanently erase your data" onPress={remove} chevron />
        </Card>
      </Section>

      <Section title="Recent activity">
        <Card padded={false} style={{ paddingHorizontal: 16 }}>
          {data.log.slice(0, 6).map((l, i) => (
            <View key={i}>
              {i > 0 && <Divider />}
              <Row
                title={String(l.action).replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())}
                subtitle={`${formatDate(l.timestamp)}, ${formatTime(l.timestamp)}${l.device ? ` · ${l.device}` : ''}${l.location ? ` · ${l.location}` : ''}`}
              />
            </View>
          ))}
        </Card>
      </Section>
      <Small style={{ marginTop: 18 }} color={C.ink3}>
        Something here you don&apos;t recognise? Log out and write to support straight away.
      </Small>
    </Screen>
  );
}
