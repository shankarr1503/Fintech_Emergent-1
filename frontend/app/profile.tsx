import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Alert } from '../src/game/dialog';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { useGame } from '../src/game/GameContext';
import { MenuRow } from '../src/game/pieces';
import { BORDER, C } from '../src/game/theme';
import { Body, Box, CoinCount, PText, Screen, SectionTitle, SegmentBar, Sprite, Stat } from '../src/game/ui';
import { SpriteName } from '../src/game/sprites';

const BADGE_SPRITE: Record<string, SpriteName> = {
  coin: 'coin', brick: 'bolt', piggy: 'piggy', castle: 'castle', sword: 'sword', book: 'book', pipe: 'pipe', fire: 'fire', star: 'star',
};

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { profile } = useGame();

  const quit = () =>
    Alert.alert('Save & quit?', 'You will need your phone number to sign back in.', [
      { text: 'Keep playing', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);

  const unlocked = profile?.achievements.filter((a) => a.unlocked).length ?? 0;

  return (
    <Screen title="PLAYER 1" subtitle={profile?.title.toUpperCase()}>
      <Box color={C.paper}>
        <View style={styles.row}>
          <View style={styles.portrait}>
            <Sprite name="hero" scale={4} />
          </View>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <PText size={12} numberOfLines={1}>
              {(user?.name || 'PLAYER 1').toUpperCase()}
            </PText>
            <Body size={12} style={{ marginTop: 4 }}>
              +91 {user?.phone}
            </Body>
            <View style={{ marginTop: 8 }}>
              <CoinCount value={profile?.coins ?? 0} size={9} />
            </View>
          </View>
        </View>
        <View style={{ marginTop: 14 }}>
          <View style={styles.between}>
            <PText size={8}>LV {profile?.level ?? 1}</PText>
            <PText size={7} color={C.textMuted}>
              {profile ? `${profile.xp_into_level}/${profile.xp_for_next} XP` : ''}
            </PText>
          </View>
          <View style={{ marginTop: 6 }}>
            <SegmentBar value={profile?.progress ?? 0} max={100} color={C.cyan} segments={12} height={10} />
          </View>
        </View>
        <View style={[styles.between, { marginTop: 14 }]}>
          <Stat label="Total XP" value={(profile?.xp ?? 0).toLocaleString('en-IN')} />
          <Stat label="Streak" value={`${profile?.streak ?? 0}D`} color={C.red} align="center" />
          <Stat label="Best" value={`${profile?.best_streak ?? 0}D`} align="right" />
        </View>
      </Box>

      <SectionTitle right={<PText size={8} color={C.coin} shadow={C.ink}>{unlocked}/{profile?.achievements.length ?? 0}</PText>}>BADGES</SectionTitle>
      <View style={styles.badges}>
        {(profile?.achievements ?? []).map((a) => (
          <View key={a.id} style={[styles.badge, !a.unlocked && styles.locked]} accessibilityLabel={`${a.name}: ${a.desc}${a.unlocked ? '' : ' (locked)'}`}>
            <Sprite name={a.unlocked ? BADGE_SPRITE[a.icon] ?? 'trophy' : 'lock'} scale={3} />
            <PText size={6} center style={{ marginTop: 8 }} numberOfLines={2}>
              {a.name.toUpperCase()}
            </PText>
            <Body size={10} center numberOfLines={2} style={{ marginTop: 3 }}>
              {a.desc}
            </Body>
          </View>
        ))}
      </View>

      <SectionTitle>MENU</SectionTitle>
      <Box padding={8}>
        <MenuRow sprite="hero" label="Edit player" hint="Name, income & fixed costs" onPress={() => router.push('/edit-profile')} testID="menu-edit" />
        <MenuRow sprite="crown" label="Leaderboard" hint="See how you rank" onPress={() => router.push('/community')} />
        <MenuRow sprite="wallet" label="Inventory" hint="All bank, FD, RD, PPF & NPS accounts" onPress={() => router.push('/my-wallet')} />
        <MenuRow sprite="pipe" label="Warp zone" hint="Link accounts via Account Aggregator" onPress={() => router.push('/account-aggregator')} />
        <MenuRow sprite="shield" label="Shields" hint="Security, privacy & your data" onPress={() => router.push('/security')} />
        <MenuRow sprite="bubble" label="Help" hint="FAQ and support" onPress={() => router.push('/help')} />
        <MenuRow sprite="heart" label="Save & quit" hint="Log out" danger onPress={quit} />
      </Box>
      <Body size={11} color={C.white} center style={{ marginTop: 14 }}>
        CoinQuest v2.0
      </Body>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  portrait: { width: 72, height: 80, backgroundColor: C.skyLight, borderWidth: BORDER, borderColor: C.ink, alignItems: 'center', justifyContent: 'center' },
  badges: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 },
  badge: { width: '31.5%', alignItems: 'center', padding: 8, backgroundColor: C.paper, borderWidth: BORDER, borderColor: C.ink, minHeight: 118 },
  locked: { backgroundColor: '#CFC6AE', opacity: 0.75 },
});
