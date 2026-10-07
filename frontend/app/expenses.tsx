import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { getAnalyticsSummary, getExpenseReductionTips } from '../src/services/api';
import { useUserData } from '../src/game/useData';
import { SpriteName } from '../src/game/sprites';
import { C, categoryMeta } from '../src/game/theme';
import { Body, Box, EmptyState, Loading, PixelButton, PText, Screen, SectionTitle, SegmentBar, SpriteBadge, Stat } from '../src/game/ui';
import { formatCompact, formatCurrency } from '../src/utils/format';

type Tip = { category: string; title: string; description: string; monthly_savings: number; yearly_savings: number };

export default function SpendRadarScreen() {
  const router = useRouter();
  const { data, loading, refreshing, refresh } = useUserData(async (id) => {
    const [summary, tips] = await Promise.all([getAnalyticsSummary(id), getExpenseReductionTips(id)]);
    return { summary, tips: tips as Tip[] };
  });

  if (loading || !data) return <Loading label="SCANNING SPENDS" />;
  const { summary, tips } = data;
  const categories = Object.entries(summary.category_breakdown as Record<string, number>)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);
  const total = summary.this_month_spending || 1;
  const up = summary.change_percentage > 0;
  const yearly = tips.reduce((s, t) => s + t.yearly_savings, 0);

  return (
    <Screen title="SPEND RADAR" subtitle="FIND COIN LEAKS" refreshing={refreshing} onRefresh={refresh}>
      <Box>
        <PText size={8} color={C.textMuted}>
          SPENT THIS MONTH
        </PText>
        <PText size={22} style={{ marginTop: 10 }}>
          {formatCurrency(summary.this_month_spending)}
        </PText>
        <Body style={{ marginTop: 6 }} color={up ? C.red : C.pipeDark} bold>
          {up ? '▲' : '▼'} {Math.abs(summary.change_percentage)}% vs same point last month
        </Body>
        <View style={[styles.between, { marginTop: 14 }]}>
          <Stat label="Income" value={formatCompact(summary.total_income)} color={C.pipe} />
          <Stat label="Left" value={formatCompact(summary.remaining_balance)} align="center" />
          <Stat label="Txns" value={String(summary.transaction_count)} align="right" />
        </View>
      </Box>

      <SectionTitle>POWER-UPS TO SAVE</SectionTitle>
      {tips.length === 0 ? (
        <EmptyState sprite="trophy" title="NO LEAKS FOUND" body="Your spending looks tight this month. Nice!" />
      ) : (
        <>
          <Box color={C.coin} padding={12} style={{ marginBottom: 12 }}>
            <PText size={9} center>
              SAVE UP TO {formatCompact(yearly)} / YEAR
            </PText>
          </Box>
          {tips.map((t) => (
            <Box key={t.title} style={{ marginBottom: 12 }}>
              <View style={styles.row}>
                <SpriteBadge sprite={categoryMeta(t.category).sprite as SpriteName} color={categoryMeta(t.category).color} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <PText size={9}>{t.title.toUpperCase()}</PText>
                  <Body size={13} style={{ marginTop: 4 }}>
                    {t.description}
                  </Body>
                </View>
              </View>
              <View style={[styles.between, { marginTop: 12 }]}>
                <Stat label="Per month" value={formatCompact(t.monthly_savings)} color={C.pipeDark} />
                <Stat label="Per year" value={formatCompact(t.yearly_savings)} color={C.pipeDark} align="right" />
              </View>
            </Box>
          ))}
        </>
      )}

      <SectionTitle>BY CATEGORY</SectionTitle>
      <Box>
        {categories.map(([cat, amount]) => {
          const meta = categoryMeta(cat);
          return (
            <View key={cat} style={{ marginBottom: 14 }}>
              <View style={styles.between}>
                <PText size={8}>{cat.toUpperCase()}</PText>
                <PText size={8}>
                  {formatCurrency(amount)} • {Math.round((amount / total) * 100)}%
                </PText>
              </View>
              <View style={{ marginTop: 6 }}>
                <SegmentBar value={amount} max={total} color={meta.color} segments={14} height={8} track={C.paperDark} />
              </View>
            </View>
          );
        })}
      </Box>

      <View style={{ marginTop: 16, gap: 4 }}>
        <PixelButton label="VIEW ALL TRANSACTIONS" sprite="scroll" color={C.blue} onPress={() => router.push('/(tabs)/transactions')} />
        <PixelButton label="START A SAVINGS GOAL" sprite="castle" color={C.pipe} onPress={() => router.push('/(tabs)/savings')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
