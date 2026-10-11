import React, { useEffect } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { getNotifications, markNotificationsRead } from '../src/services/api';
import { useUserData } from '../src/game/useData';
import { Card, Divider, Empty, IconButton, IconMark, IconName, Row, Screen, Section, SkeletonScreen, Small } from '../src/ui/kit';
import { C } from '../src/ui/theme';

type Note = { id: string; kind: string; title: string; body: string; read: boolean; created_at: string };

const ICON: Record<string, IconName> = { debit: 'arrow-up-right', credit: 'arrow-down-left', bills: 'file-text', rewards: 'award', security: 'shield', marketing: 'tag' };

function when(iso: string) {
  const d = new Date(iso + (iso.endsWith('Z') ? '' : 'Z'));
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  if (mins < 24 * 60) return `${Math.round(mins / 60)} h ago`;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export default function Notifications() {
  const router = useRouter();
  const { data, loading, refreshing, refresh, userId } = useUserData((id) => getNotifications(id));

  // Opening the inbox marks everything read (the unread dots below reflect the state on arrival).
  useEffect(() => {
    if (userId && data?.unread) markNotificationsRead(userId).catch(() => {});
  }, [userId, data?.unread]);

  const items: Note[] = data?.items ?? [];
  const security = items.filter((n) => n.kind === 'security');
  const rest = items.filter((n) => n.kind !== 'security');

  const list = (rows: Note[]) => (
    <Card padded={false} style={{ paddingHorizontal: 16 }}>
      {rows.map((n, i) => (
        <View key={n.id}>
          {i > 0 && <Divider inset={54} />}
          <Row
            left={<IconMark icon={ICON[n.kind] ?? 'bell'} tint={n.kind} />}
            title={n.title}
            subtitle={n.body}
            subtitleLines={3}
            right={
              <View style={{ alignItems: 'flex-end', marginLeft: 8 }}>
                <Small>{when(n.created_at)}</Small>
                {!n.read && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.blue, marginTop: 6 }} />}
              </View>
            }
          />
        </View>
      ))}
    </Card>
  );

  return (
    <Screen title="Notifications" right={<IconButton icon="sliders" label="Notification settings" onPress={() => router.push('/notification-settings')} />} refreshing={refreshing} onRefresh={refresh}>
      {loading ? (
        <SkeletonScreen />
      ) : items.length === 0 ? (
        <Empty icon="bell" title="All quiet" body="Payments, bills and sign-in alerts will show up here." />
      ) : (
        <>
          {security.length > 0 && <Section title="Security">{list(security)}</Section>}
          {rest.length > 0 && <Section title="Activity">{list(rest)}</Section>}
        </>
      )}
    </Screen>
  );
}
