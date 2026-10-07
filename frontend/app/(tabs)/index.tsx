import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { getDashboard, getInsights } from '../../src/services/api';
import { useGame } from '../../src/game/GameContext';
import { useUserData } from '../../src/game/useData';
import { PlayerHUD, TxnRow } from '../../src/game/pieces';
import { SpriteName } from '../../src/game/sprites';
import { BORDER, C } from '../../src/game/theme';
import {
  Body,
  Box,
  Loading,
  MysteryBlock,
  PixelButton,
  PText,
  Screen,
  SectionTitle,
  SegmentBar,
  Sprite,
  Stat,
  TypeText,
  tap,
} from '../../src/game/ui';
import { formatCompact, formatCurrency } from '../../src/utils/format';

type Dashboard = {
  spending: { this_month: number; last_month: number; change_percentage: number; remaining_balance: number };
  income: number;
  debts: { total: number; monthly_emi: number; count: number };
  savings: { total_saved: number; total_target: number; progress: number; goals_count: number };
  category_breakdown: Record<string, number>;
  recent_transactions: any[];
  recommended_action: { type: string; title: string; description: string };
};

const WORLDS: { label: string; sub: string; sprite: SpriteName; route: string; color: string }[] = [
  { label: 'POWER METER', sub: 'Credit score', sprite: 'crown', route: '/credit-score', color: '#FFE08A' },
  { label: 'WARP ZONE', sub: 'Link all banks', sprite: 'pipe', route: '/account-aggregator', color: '#B8F28A' },
  { label: 'POWER-UPS', sub: 'Instant loans', sprite: 'potion', route: '/digital-loans', color: '#FFC2F2' },
  { label: 'ITEM SHOP', sub: 'Spend coins', sprite: 'gift', route: '/rewards', color: '#FFD0A8' },
  { label: 'ACADEMY', sub: 'Learn & earn XP', sprite: 'book', route: '/learn', color: '#B9D3FF' },
  { label: 'GUILD HALL', sub: 'Community', sprite: 'bubble', route: '/community', color: '#E3E3E3' },
  { label: 'SPEND RADAR', sub: 'Cut expenses', sprite: 'fire', route: '/expenses', color: '#FFB8A8' },
  { label: 'INVENTORY', sub: 'All accounts', sprite: 'wallet', route: '/my-wallet', color: '#F4D9A6' },
];

export default function HomeScreen() {
  const router = useRouter();
  const { profile, checkIn, refresh: refreshGame } = useGame();
  const { data, loading, refreshing, refresh } = useUserData(async (id) => {
    const [dashboard, insights] = await Promise.all([getDashboard(id), getInsights(id).catch(() => [])]);
    return { dashboard: dashboard as Dashboard, insights: (insights || []) as { title: string; description: string; category: string }[] };
  });
  const [hint, setHint] = useState(0);
  const [checking, setChecking] = useState(false);

  const insights = data?.insights ?? [];
  useEffect(() => {
    if (insights.length < 2) return;
    const id = setInterval(() => setHint((h) => (h + 1) % insights.length), 9000);
    return () => clearInterval(id);
  }, [insights.length]);

  const topCategories = useMemo(() => {
    const entries = Object.entries(data?.dashboard.category_breakdown ?? {}).filter(([, v]) => v > 0);
    return entries.sort((a, b) => b[1] - a[1]).slice(0, 4);
  }, [data]);

  if (loading) return <Loading label="WORLD 1-1" />;
  const d = data?.dashboard;
  if (!d) {
    return (
      <Screen title="OOPS!" back={false}>
        <Box>
          <PText size={10}>THE PIPE IS BLOCKED</PText>
          <Body style={{ marginVertical: 10 }}>We could not reach the server. Check your connection and try again.</Body>
          <PixelButton label="RETRY" onPress={refresh} />
        </Box>
      </Screen>
    );
  }

  const go = (route: string) => router.push(route as any);
  const spentUp = d.spending.change_percentage > 0;
  const action = d.recommended_action;

  return (
    <Screen
      title="COINQUEST"
      subtitle={`STREAK ${profile?.streak ?? 0} DAYS`}
      back={false}
      refreshing={refreshing}
      onRefresh={() => {
        refresh();
        refreshGame();
      }}
      right={
        <Pressable onPress={() => go('/help')} accessibilityRole="button" accessibilityLabel="Help" style={styles.helpBtn}>
          <PText size={12} color={C.white} shadow={C.blockDark}>
            ?
          </PText>
        </Pressable>
      }
    >
      <PlayerHUD />

      {profile && !profile.checked_in_today && (
        <Pressable
          testID="checkin"
          onPress={async () => {
            tap();
            setChecking(true);
            try {
              await checkIn();
            } finally {
              setChecking(false);
            }
          }}
          disabled={checking}
          style={styles.checkin}
          accessibilityRole="button"
          accessibilityLabel="Claim daily bonus"
        >
          <Sprite name="chest" scale={3} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <PText size={9}>DAILY BONUS READY!</PText>
            <Body size={12} style={{ marginTop: 4 }}>
              Tap to claim coins and keep your {profile.streak}-day streak alive.
            </Body>
          </View>
          <PText size={14}>{'>'}</PText>
        </Pressable>
      )}

      {/* Coin vault: this month's money */}
      <Box style={{ marginTop: 14 }} color={C.paper}>
        <View style={styles.between}>
          <PText size={8} color={C.textMuted}>
            COIN VAULT • THIS MONTH
          </PText>
          <View style={[styles.tag, { backgroundColor: spentUp ? C.red : C.pipe }]}>
            <PText size={7} color={C.white}>
              {spentUp ? '▲' : '▼'} {Math.abs(d.spending.change_percentage)}%
            </PText>
          </View>
        </View>
        <PText size={22} style={{ marginTop: 12 }} color={d.spending.remaining_balance < 0 ? C.red : C.text}>
          {formatCurrency(d.spending.remaining_balance)}
        </PText>
        <Body size={12} style={{ marginTop: 4 }}>
          left to spend after this month&apos;s outflows
        </Body>
        <View style={[styles.between, { marginTop: 14 }]}>
          <Stat label="Income" value={formatCompact(d.income)} color={C.pipe} />
          <Stat label="Spent" value={formatCompact(d.spending.this_month)} color={C.red} align="center" />
          <Stat label="EMIs" value={formatCompact(d.debts.monthly_emi)} align="right" />
        </View>
      </Box>

      {/* Quick actions as bumpable blocks */}
      <View style={styles.blocks}>
        <MysteryBlock label="SEND" sprite="coin" onPress={() => go('/(tabs)/pay')} testID="block-pay" />
        <MysteryBlock label="BILLS" sprite="bolt" onPress={() => go('/bills')} testID="block-bills" />
        <MysteryBlock label="CARDS" sprite="card" onPress={() => go('/credit-score')} />
        <MysteryBlock label="SHOP" sprite="gift" onPress={() => go('/rewards')} />
      </View>

      {/* Sage hint */}
      {insights.length > 0 && (
        <Box color={C.ink} style={{ marginTop: 6 }} padding={14}>
          <View style={styles.row}>
            <Sprite name="potion" scale={3} />
            <PText size={8} color={C.coin} style={{ marginLeft: 10 }}>
              THE SAGE SAYS...
            </PText>
          </View>
          <TypeText key={hint} text={insights[hint % insights.length].title.toUpperCase()} size={10} color={C.white} style={{ marginTop: 12 }} />
          <Body color="#D8D8D8" size={13} style={{ marginTop: 8 }}>
            {insights[hint % insights.length].description}
          </Body>
        </Box>
      )}

      {/* Daily quests */}
      {profile && (
        <>
          <SectionTitle>DAILY QUESTS</SectionTitle>
          <Box padding={12}>
            {profile.quests.map((q, i) => (
              <View key={q.id} style={[styles.quest, i < profile.quests.length - 1 && styles.questDivider]}>
                <View style={[styles.questCheck, q.done && { backgroundColor: C.pipe }]}>
                  {q.done ? (
                    <PText size={9} color={C.white}>
                      ✓
                    </PText>
                  ) : null}
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <PText size={9} color={q.done ? C.textMuted : C.text}>
                    {q.title.toUpperCase()}
                  </PText>
                  <Body size={12} style={{ marginTop: 3 }}>
                    {q.desc} ({q.progress}/{q.target})
                  </Body>
                </View>
                <View style={styles.row}>
                  <Sprite name="coin" scale={1.5} />
                  <PText size={8} style={{ marginLeft: 4 }}>
                    {q.reward_coins}
                  </PText>
                </View>
              </View>
            ))}
          </Box>
        </>
      )}

      {/* Recommended move */}
      {action && (
        <Pressable
          onPress={() => go(action.type === 'debt' ? '/(tabs)/debts' : action.type === 'savings' ? '/(tabs)/savings' : '/expenses')}
          style={{ marginTop: 16 }}
          accessibilityRole="button"
        >
          <Box color="#D7F5B0">
            <View style={styles.row}>
              <Sprite name="star" scale={3} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <PText size={8} color={C.pipeDark}>
                  NEXT BEST MOVE
                </PText>
                <PText size={10} style={{ marginTop: 6 }}>
                  {action.title.toUpperCase()}
                </PText>
                <Body size={13} style={{ marginTop: 6 }}>
                  {action.description}
                </Body>
              </View>
            </View>
          </Box>
        </Pressable>
      )}

      {/* Boss + castle previews */}
      <View style={[styles.row, { gap: 12, marginTop: 16, alignItems: 'stretch' }]}>
        <Pressable style={{ flex: 1 }} onPress={() => go('/(tabs)/debts')} accessibilityRole="button" accessibilityLabel="Debt bosses">
          <Box color="#2A1A3A" style={{ flex: 1 }}>
            <Sprite name="boss" scale={3} />
            <PText size={8} color={C.white} style={{ marginTop: 10 }}>
              {d.debts.count} BOSSES
            </PText>
            <PText size={12} color={C.lava} style={{ marginTop: 8 }}>
              {formatCompact(d.debts.total)}
            </PText>
            <PText size={6} color={C.gray} style={{ marginTop: 6 }}>
              TOTAL DEBT HP
            </PText>
          </Box>
        </Pressable>
        <Pressable style={{ flex: 1 }} onPress={() => go('/(tabs)/savings')} accessibilityRole="button" accessibilityLabel="Savings goals">
          <Box color="#CFE8FF" style={{ flex: 1 }}>
            <Sprite name="castle" scale={3} />
            <PText size={8} style={{ marginTop: 10 }}>
              {d.savings.goals_count} CASTLES
            </PText>
            <PText size={12} color={C.pipeDark} style={{ marginTop: 8 }}>
              {formatCompact(d.savings.total_saved)}
            </PText>
            <View style={{ marginTop: 8 }}>
              <SegmentBar value={d.savings.progress} max={100} segments={6} height={6} />
            </View>
          </Box>
        </Pressable>
      </View>

      {/* World select */}
      <SectionTitle>SELECT WORLD</SectionTitle>
      <View style={styles.worlds}>
        {WORLDS.map((w, i) => (
          <Pressable
            key={w.route}
            onPress={() => {
              tap();
              go(w.route);
            }}
            style={({ pressed }) => [styles.world, { backgroundColor: w.color }, pressed && styles.worldPressed]}
            accessibilityRole="button"
            accessibilityLabel={w.label}
          >
            <View style={styles.worldNum}>
              <PText size={6} color={C.white}>
                {Math.floor(i / 4) + 1}-{(i % 4) + 1}
              </PText>
            </View>
            <Sprite name={w.sprite} scale={3} />
            <PText size={8} style={{ marginTop: 10 }} center>
              {w.label}
            </PText>
            <Body size={11} style={{ marginTop: 3 }} center>
              {w.sub}
            </Body>
          </Pressable>
        ))}
      </View>

      {/* Spending breakdown */}
      {topCategories.length > 0 && (
        <>
          <SectionTitle>WHERE COINS WENT</SectionTitle>
          <Box>
            {topCategories.map(([cat, amount]) => (
              <View key={cat} style={{ marginBottom: 12 }}>
                <View style={styles.between}>
                  <PText size={8}>{cat.toUpperCase()}</PText>
                  <PText size={8}>{formatCurrency(amount)}</PText>
                </View>
                <View style={{ marginTop: 6 }}>
                  <SegmentBar value={amount} max={d.spending.this_month || 1} color={C.brick} segments={14} height={8} track={C.paperDark} />
                </View>
              </View>
            ))}
          </Box>
        </>
      )}

      {/* Adventure log */}
      <SectionTitle
        right={
          <Pressable onPress={() => go('/(tabs)/transactions')} accessibilityRole="button">
            <PText size={8} color={C.coin} shadow={C.ink}>
              SEE ALL {'>'}
            </PText>
          </Pressable>
        }
      >
        ADVENTURE LOG
      </SectionTitle>
      <Box padding={10}>
        {d.recent_transactions.length === 0 ? (
          <Body>No transactions yet.</Body>
        ) : (
          d.recent_transactions.slice(0, 5).map((t, i, arr) => <TxnRow key={t.id || i} txn={t} last={i === arr.length - 1} />)
        )}
      </Box>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 18 }}>
        {(profile?.achievements ?? []).map((a) => (
          <View key={a.id} style={[styles.badge, !a.unlocked && { opacity: 0.35 }]}>
            <Sprite name="trophy" scale={2} />
            <PText size={6} center style={{ marginTop: 6 }}>
              {a.name.toUpperCase()}
            </PText>
          </View>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  helpBtn: { width: 42, height: 42, backgroundColor: C.block, borderWidth: BORDER, borderColor: C.ink, alignItems: 'center', justifyContent: 'center' },
  checkin: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.coin,
    borderWidth: BORDER,
    borderColor: C.ink,
    padding: 12,
    marginTop: 14,
  },
  tag: { borderWidth: 2, borderColor: C.ink, paddingHorizontal: 6, paddingVertical: 4 },
  blocks: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 34, marginBottom: 14 },
  quest: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  questDivider: { borderBottomWidth: 2, borderColor: C.paperDark },
  questCheck: { width: 26, height: 26, borderWidth: BORDER, borderColor: C.ink, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center' },
  worlds: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  world: {
    width: '48%',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderWidth: BORDER,
    borderColor: C.ink,
    borderBottomWidth: BORDER + 4,
    borderRightWidth: BORDER + 2,
  },
  worldPressed: { borderBottomWidth: BORDER, borderRightWidth: BORDER, transform: [{ translateY: 4 }] },
  worldNum: { position: 'absolute', top: 6, left: 6, backgroundColor: C.ink, paddingHorizontal: 4, paddingVertical: 3 },
  badge: {
    width: 78,
    alignItems: 'center',
    backgroundColor: C.paper,
    borderWidth: BORDER,
    borderColor: C.ink,
    padding: 8,
    marginRight: 8,
  },
});
