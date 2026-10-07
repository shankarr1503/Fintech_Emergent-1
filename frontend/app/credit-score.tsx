import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Alert } from '../src/game/dialog';
import { errorMessage, getCreditScore, payCreditCardBill } from '../src/services/api';
import { useGame } from '../src/game/GameContext';
import { useUserData } from '../src/game/useData';
import { BORDER, C } from '../src/game/theme';
import { Body, Box, Loading, PixelButton, PText, Screen, SectionTitle, SegmentBar, Sprite, Stat } from '../src/game/ui';
import { formatCompact, formatCurrency, formatDate } from '../src/utils/format';

const MIN = 300;
const MAX = 900;
const TIERS = [
  { from: 300, to: 550, label: 'POOR', color: C.red },
  { from: 550, to: 650, label: 'FAIR', color: C.orange },
  { from: 650, to: 750, label: 'GOOD', color: C.coin },
  { from: 750, to: 900, label: 'EXCELLENT', color: C.pipe },
];

const FACTORS: Record<string, { label: string; stat: string; good: (v: number) => boolean; unit: string; tip: string }> = {
  payment_history: { label: 'Payment history', stat: 'STR', good: (v) => v >= 90, unit: '%', tip: 'Pay every EMI and card bill on time.' },
  credit_utilization: { label: 'Credit utilisation', stat: 'DEF', good: (v) => v <= 30, unit: '%', tip: 'Keep card usage under 30% of the limit.' },
  credit_age: { label: 'Credit age', stat: 'EXP', good: (v) => v >= 5, unit: ' yrs', tip: 'Keep your oldest cards open.' },
  credit_mix: { label: 'Credit mix', stat: 'MAG', good: (v) => v >= 70, unit: '%', tip: 'A healthy mix of loans and cards helps.' },
  recent_inquiries: { label: 'Recent inquiries', stat: 'LCK', good: (v) => v <= 1, unit: '', tip: 'Avoid many loan applications at once.' },
};

export default function CreditScoreScreen() {
  const { celebrate } = useGame();
  const [paying, setPaying] = useState<string | null>(null);
  const { data, loading, refreshing, refresh, userId } = useUserData((id) => getCreditScore(id));

  if (loading || !data) return <Loading label="CHARGING METER" />;
  const score: number = data.score;
  const tier = TIERS.find((t) => score >= t.from && score < t.to) ?? TIERS[TIERS.length - 1];
  const pct = (score - MIN) / (MAX - MIN);

  const pay = (card: any) =>
    Alert.alert(`Pay ${card.bank} bill?`, `${formatCurrency(card.total_due)} total due.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Pay',
        onPress: async () => {
          setPaying(card.bank);
          try {
            const res = await payCreditCardBill(userId, card.bank, card.total_due);
            celebrate('CARD CLEARED!', res.reward, res.coins_earned);
          } catch (e) {
            Alert.alert('Payment failed', errorMessage(e));
          } finally {
            setPaying(null);
          }
        },
      },
    ]);

  return (
    <Screen title="POWER METER" subtitle="YOUR CREDIT SCORE" world="night" refreshing={refreshing} onRefresh={refresh}>
      <Box color={C.paper}>
        <View style={{ alignItems: 'center' }}>
          <Sprite name="crown" scale={4} />
          <PText size={40} color={tier.color} shadow={C.ink} style={{ marginTop: 12 }}>
            {score}
          </PText>
          <View style={[styles.tierTag, { backgroundColor: tier.color }]}>
            <PText size={10}>{tier.label}</PText>
          </View>
        </View>
        {/* Rainbow power meter with a marker */}
        <View style={styles.meter}>
          {TIERS.map((t) => (
            <View key={t.label} style={{ flex: t.to - t.from, backgroundColor: t.color }} />
          ))}
          <View style={[styles.marker, { left: `${pct * 100}%` }]} />
        </View>
        <View style={styles.between}>
          <PText size={7}>{MIN}</PText>
          <PText size={7}>{MAX}</PText>
        </View>
        <Body size={12} style={{ marginTop: 10 }} center>
          Updated {formatDate(data.last_updated)} • next refresh {formatDate(data.next_update)}
        </Body>
      </Box>

      <SectionTitle>PLAYER STATS</SectionTitle>
      <Box>
        {Object.entries(data.factors as Record<string, number>).map(([key, value]) => {
          const f = FACTORS[key];
          if (!f) return null;
          const good = f.good(value);
          const bar = key === 'credit_utilization' ? 100 - value : key === 'recent_inquiries' ? 100 - value * 25 : key === 'credit_age' ? value * 10 : value;
          return (
            <View key={key} style={{ marginBottom: 14 }}>
              <View style={styles.between}>
                <PText size={8}>
                  {f.stat} • {f.label.toUpperCase()}
                </PText>
                <PText size={8} color={good ? C.pipeDark : C.red}>
                  {value}
                  {f.unit}
                </PText>
              </View>
              <View style={{ marginTop: 6 }}>
                <SegmentBar value={bar} max={100} color={good ? C.pipe : C.orange} segments={10} height={8} track={C.paperDark} />
              </View>
              {!good && (
                <Body size={12} style={{ marginTop: 4 }}>
                  Tip: {f.tip}
                </Body>
              )}
            </View>
          );
        })}
      </Box>

      <SectionTitle>CARDS IN INVENTORY</SectionTitle>
      {(data.credit_cards ?? []).map((card: any) => {
        const used = card.limit ? Math.round((card.used / card.limit) * 100) : 0;
        return (
          <Box key={card.bank} style={{ marginBottom: 12 }}>
            <View style={styles.row}>
              <Sprite name="card" scale={3} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <PText size={9}>{card.bank.toUpperCase()}</PText>
                <Body size={12} style={{ marginTop: 3 }}>
                  {card.card_type} • {card.reward_points.toLocaleString('en-IN')} pts
                </Body>
              </View>
            </View>
            <View style={[styles.between, { marginTop: 12 }]}>
              <Stat label="Total due" value={formatCompact(card.total_due)} color={C.red} />
              <Stat label="Min due" value={formatCompact(card.min_due)} align="center" />
              <Stat label="Due" value={formatDate(card.due_date).slice(0, 6).toUpperCase()} align="right" />
            </View>
            <View style={{ marginTop: 12 }}>
              <PText size={7} style={{ marginBottom: 6 }}>
                LIMIT USED {used}%
              </PText>
              <SegmentBar value={used} max={100} color={used > 30 ? C.orange : C.pipe} segments={10} height={8} track={C.paperDark} />
            </View>
            <PixelButton label="PAY BILL" sprite="coin" small style={{ marginTop: 12 }} loading={paying === card.bank} onPress={() => pay(card)} />
          </Box>
        );
      })}

      <SectionTitle>SCORE HISTORY</SectionTitle>
      <Box>
        <View style={styles.history}>
          {[...(data.history ?? [])].reverse().map((h: any) => {
            const height = Math.max(8, ((h.score - MIN) / (MAX - MIN)) * 110);
            return (
              <View key={h.month} style={{ alignItems: 'center', flex: 1 }}>
                <PText size={7}>{h.score}</PText>
                <View style={[styles.historyBar, { height }]} />
                <PText size={6} color={C.textMuted} style={{ marginTop: 6 }}>
                  {h.month.slice(0, 3).toUpperCase()}
                </PText>
              </View>
            );
          })}
          <View style={{ alignItems: 'center', flex: 1 }}>
            <PText size={7}>{score}</PText>
            <View style={[styles.historyBar, { height: Math.max(8, pct * 110), backgroundColor: tier.color }]} />
            <PText size={6} style={{ marginTop: 6 }}>
              NOW
            </PText>
          </View>
        </View>
      </Box>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tierTag: { borderWidth: BORDER, borderColor: C.ink, paddingHorizontal: 12, paddingVertical: 6, marginTop: 10 },
  meter: { flexDirection: 'row', height: 20, borderWidth: BORDER, borderColor: C.ink, marginTop: 18, marginBottom: 6 },
  marker: { position: 'absolute', top: -10, width: 6, marginLeft: -3, height: 34, backgroundColor: C.ink, borderWidth: 1, borderColor: C.white },
  history: { flexDirection: 'row', alignItems: 'flex-end', height: 160, gap: 6 },
  historyBar: { width: 22, backgroundColor: C.cyan, borderWidth: 2, borderColor: C.ink, marginTop: 4 },
});
