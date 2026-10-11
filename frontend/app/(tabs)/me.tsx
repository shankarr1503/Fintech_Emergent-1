import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { useGame } from '../../src/game/GameContext';
import { Alert } from '../../src/ui/dialog';
import { Avatar, Card, Divider, Heading, IconMark, IconName, Row, Screen, Section, Small } from '../../src/ui/kit';
import { C, themed } from '../../src/ui/theme';

type Item = { icon: IconName; title: string; sub?: string; route: string };

const GROUPS: { title: string; items: Item[] }[] = [
  {
    title: 'Money',
    items: [
      { icon: 'credit-card', title: 'Bank accounts & deposits', sub: 'Balances, FDs, RDs, PPF, NPS', route: '/my-wallet' },
      { icon: 'link-2', title: 'Linked accounts', sub: 'Account Aggregator consent', route: '/account-aggregator' },
      { icon: 'activity', title: 'Credit score', route: '/credit-score' },
    ],
  },
  {
    title: 'Settings',
    items: [
      { icon: 'user', title: 'Profile', sub: 'Name, income, fixed costs', route: '/edit-profile' },
      { icon: 'check-circle', title: 'Identity (KYC)', route: '/kyc' },
      { icon: 'shield', title: 'Security & privacy', sub: 'PIN, devices, your data', route: '/security' },
      { icon: 'bell', title: 'Notifications', sub: 'Choose what we tell you about', route: '/notification-settings' },
      { icon: 'sun', title: 'Appearance', sub: 'Light, dark or match your phone', route: '/appearance' },
    ],
  },
  {
    title: 'Support',
    items: [
      { icon: 'help-circle', title: 'Help', sub: 'FAQs and contact', route: '/help' },
      { icon: 'users', title: 'Community', route: '/community' },
      { icon: 'book-open', title: 'Learn', sub: 'Short lessons on money', route: '/learn' },
    ],
  },
];

const KYC_SUB: Record<string, string> = {
  verified: 'Verified · full payment limits',
  review: 'Under review',
  failed: 'Not verified · try again',
  none: 'Verify to pay up to ₹1 lakh a day',
};

export default function MeTab() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { profile } = useGame();

  const signOut = () =>
    Alert.alert('Log out?', "You'll need an OTP to sign back in.", [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: () => logout() },
    ]);

  return (
    <Screen back={false}>
      <View style={styles.header}>
        <Avatar name={user?.name || ''} size={72} />
        <View style={{ marginLeft: 16, flex: 1 }}>
          <Heading numberOfLines={1}>{user?.name || 'Add your name'}</Heading>
          <Small style={{ marginTop: 2 }}>+91 {user?.phone?.replace(/(\d{5})(\d{5})/, '$1 $2')}</Small>
          {profile && (
            <Small color={C.goldDeep} style={{ marginTop: 2 }}>
              Level {profile.level} · {profile.title}
            </Small>
          )}
        </View>
      </View>
      {!user?.name && (
        <Card onPress={() => router.push('/edit-profile')} style={{ marginTop: 18, backgroundColor: C.goldSoft, borderColor: C.goldSoft }} accessibilityLabel="Complete your profile">
          <Small color={C.ink}>Tell us your name and monthly income so budgets and insights are about you, not an average.</Small>
        </Card>
      )}

      {GROUPS.map((g) => (
        <Section key={g.title} title={g.title}>
          <Card padded={false} style={{ paddingHorizontal: 16 }}>
            {g.items.map((it, i) => (
              <View key={it.route}>
                {i > 0 && <Divider inset={54} />}
                <Row left={<IconMark icon={it.icon} tint={it.title} />} title={it.title} subtitle={it.route === '/kyc' ? KYC_SUB[user?.kyc_status ?? 'none'] ?? KYC_SUB.none : it.sub} onPress={() => router.push(it.route as any)} chevron testID={`me-${it.route.slice(1)}`} />
              </View>
            ))}
          </Card>
        </Section>
      ))}

      <Card padded={false} style={{ paddingHorizontal: 16, marginTop: 28 }}>
        <Row left={<IconMark icon="log-out" tint="logout" />} title="Log out" onPress={signOut} testID="logout" />
      </Card>
      <Small center style={{ marginTop: 22 }}>
        CoinQuest 2.1 · Made in India
      </Small>
    </Screen>
  );
}

const styles = themed(() => StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
}));
