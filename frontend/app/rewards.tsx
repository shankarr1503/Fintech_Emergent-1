import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Alert } from '../src/game/dialog';
import { errorMessage, getRewards, redeemReward } from '../src/services/api';
import { useGame } from '../src/game/GameContext';
import { useUserData } from '../src/game/useData';
import { BORDER, C } from '../src/game/theme';
import { Body, Box, Chip, CoinCount, Loading, PixelButton, PixelSheet, PText, Screen, SectionTitle, SegmentBar, SpinningCoin, Sprite } from '../src/game/ui';

type Deal = { id: string; brand: string; title: string; coins_required: number; category: string; discount: string };

const TIER_NEXT: Record<string, number> = { Bronze: 1000, Silver: 5000, Gold: 10000, Platinum: 10000 };
const BRAND_COLORS = ['#FFD0A8', '#B9D3FF', '#FFC2F2', '#B8F28A', '#FFE08A', '#E3E3E3'];

export default function ShopScreen() {
  const { celebrate } = useGame();
  const [category, setCategory] = useState('all');
  const [busy, setBusy] = useState<string | null>(null);
  const [voucher, setVoucher] = useState<{ code: string; deal: Deal; until: string } | null>(null);
  const { data, loading, refreshing, refresh, reload, userId } = useUserData((id) => getRewards(id));

  if (loading || !data) return <Loading label="OPENING SHOP" />;
  const deals: Deal[] = data.deals;
  const categories = ['all', ...Array.from(new Set(deals.map((d) => d.category)))];
  const shown = category === 'all' ? deals : deals.filter((d) => d.category === category);
  const coins: number = data.total_coins;
  const next = TIER_NEXT[data.tier] ?? 1000;

  const buy = (deal: Deal) => {
    if (coins < deal.coins_required) {
      return Alert.alert('Not enough coins', `You need ${(deal.coins_required - coins).toLocaleString('en-IN')} more coins. Pay bills and send money to earn more!`);
    }
    Alert.alert(`Buy ${deal.title}?`, `Spend ${deal.coins_required.toLocaleString('en-IN')} coins.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Buy',
        onPress: async () => {
          setBusy(deal.id);
          try {
            const res = await redeemReward(userId, deal.id);
            setVoucher({ code: res.voucher_code, deal, until: res.valid_until });
            celebrate('ITEM GET!', res.reward);
            reload();
          } catch (e) {
            Alert.alert('Could not redeem', errorMessage(e));
          } finally {
            setBusy(null);
          }
        },
      },
    ]);
  };

  return (
    <Screen title="ITEM SHOP" subtitle="TRADE COINS FOR REWARDS" world="underground" refreshing={refreshing} onRefresh={refresh}>
      <Box color={C.coin}>
        <View style={styles.row}>
          <SpinningCoin scale={5} />
          <View style={{ marginLeft: 16, flex: 1 }}>
            <PText size={8}>YOUR COINS</PText>
            <PText size={22} style={{ marginTop: 8 }}>
              {coins.toLocaleString('en-IN')}
            </PText>
            <Body size={12} color={C.text} style={{ marginTop: 4 }}>
              worth ₹{data.coins_value} • {data.tier} rank
            </Body>
          </View>
        </View>
        {data.tier !== 'Platinum' && (
          <View style={{ marginTop: 12 }}>
            <PText size={7} style={{ marginBottom: 6 }}>
              NEXT RANK AT {next.toLocaleString('en-IN')}
            </PText>
            <SegmentBar value={coins} max={next} color={C.blockDark} segments={12} height={8} track={C.paper} />
          </View>
        )}
      </Box>

      <Box style={{ marginTop: 14 }} color={C.paper} padding={12}>
        <PText size={8}>HOW TO EARN</PText>
        {[
          ['coin', 'UPI payments: 1 coin / ₹50'],
          ['bolt', 'Bills & cards: 1 coin / ₹100'],
          ['star', 'Daily quests & streaks'],
        ].map(([s, t]) => (
          <View key={t} style={[styles.row, { marginTop: 8 }]}>
            <Sprite name={s as any} scale={2} />
            <Body size={13} style={{ marginLeft: 10 }}>
              {t}
            </Body>
          </View>
        ))}
      </Box>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 16 }}>
        {categories.map((c) => (
          <Chip key={c} label={c} active={category === c} onPress={() => setCategory(c)} />
        ))}
      </ScrollView>

      <SectionTitle>FOR SALE</SectionTitle>
      <View style={styles.grid}>
        {shown.map((d, i) => {
          const affordable = coins >= d.coins_required;
          return (
            <Box key={d.id} style={styles.cell} padding={10} color={affordable ? C.paper : '#E4DCC4'}>
              <View style={[styles.logo, { backgroundColor: BRAND_COLORS[i % BRAND_COLORS.length] }]}>
                <PText size={16}>{d.brand.charAt(0)}</PText>
              </View>
              <PText size={7} color={C.textMuted} style={{ marginTop: 8 }}>
                {d.brand.toUpperCase()}
              </PText>
              <Body bold color={C.text} size={13} numberOfLines={2} style={{ marginTop: 4, minHeight: 36 }}>
                {d.title}
              </Body>
              <Body size={11} numberOfLines={1}>
                {d.discount}
              </Body>
              <View style={{ marginTop: 8 }}>
                <CoinCount value={d.coins_required} size={8} />
              </View>
              <PixelButton label={affordable ? 'BUY' : 'LOCKED'} small color={affordable ? C.pipe : C.gray} style={{ marginTop: 8 }} loading={busy === d.id} onPress={() => buy(d)} />
            </Box>
          );
        })}
      </View>

      <PixelSheet visible={!!voucher} onClose={() => setVoucher(null)} title="ITEM GET!">
        <View style={{ alignItems: 'center' }}>
          <Sprite name="chest" scale={6} />
          <PText size={10} style={{ marginTop: 14 }} center>
            {voucher?.deal.title.toUpperCase()}
          </PText>
          <View style={styles.code}>
            <PText size={16} selectable>
              {voucher?.code}
            </PText>
          </View>
          <Body center>Use this code at {voucher?.deal.brand}. Valid until {voucher?.until}.</Body>
        </View>
      </PixelSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  cell: { width: '47%', marginBottom: 12 },
  logo: { width: 44, height: 44, borderWidth: BORDER, borderColor: C.ink, alignItems: 'center', justifyContent: 'center' },
  code: { borderWidth: BORDER, borderColor: C.ink, borderStyle: 'dashed', backgroundColor: C.white, padding: 14, marginVertical: 14 },
});
