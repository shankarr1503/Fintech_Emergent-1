import React from 'react';
import { View } from 'react-native';
import { errorMessage, getNotificationPrefs, updateNotificationPrefs } from '../src/services/api';
import { useUserData } from '../src/game/useData';
import { Alert } from '../src/ui/dialog';
import { Card, Divider, ErrorState, Row, Screen, Section, SkeletonScreen, Small, Toggle } from '../src/ui/kit';

const HINT: Record<string, string> = {
  debit: 'Every payment that leaves your account',
  credit: 'Money you receive',
  bills: 'A few days before a bill is due',
  rewards: 'Streak reminders, quests and coins',
  security: 'New sign-ins, PIN changes, held payments. Always on.',
  marketing: 'Offers from CoinQuest and partners',
};

export default function NotificationSettings() {
  const { data, setData, loading, userId, reload, error } = useUserData((id) => getNotificationPrefs(id));

  if (loading || !data)
    return (
      <Screen title="Notifications">
        {error ? <ErrorState onRetry={reload} /> : <SkeletonScreen />}
      </Screen>
    );

  const toggle = async (kind: string, value: boolean) => {
    const before = data.prefs;
    setData({ ...data, prefs: { ...before, [kind]: value } });
    try {
      const res = await updateNotificationPrefs(userId, { [kind]: value });
      setData({ ...data, prefs: res.prefs });
    } catch (e) {
      setData({ ...data, prefs: before });
      Alert.alert("Couldn't save", errorMessage(e));
    }
  };

  return (
    <Screen title="Notifications" kicker="Settings">
      <Section title="Tell me about" style={{ marginTop: 18 }}>
        <Card padded={false} style={{ paddingHorizontal: 16 }}>
          {data.kinds.map((k: { id: string; label: string; locked: boolean }, i: number) => (
            <View key={k.id}>
              {i > 0 && <Divider />}
              <Row
                title={k.label}
                subtitle={HINT[k.id]}
                right={<Toggle value={!!data.prefs[k.id]} onChange={(v) => toggle(k.id, v)} label={k.label} disabled={k.locked} />}
                testID={`pref-${k.id}`}
              />
            </View>
          ))}
        </Card>
      </Section>
      <Small style={{ marginTop: 16 }}>
        Security alerts can&apos;t be turned off: they&apos;re how we warn you if someone else gets into your account.
      </Small>
    </Screen>
  );
}
