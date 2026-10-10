import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { getAnalyticsSummary, getExpenseReductionTips } from '../src/services/api';
import { useUserData } from '../src/game/useData';
import { Amount, Body, Button, Card, IconMark, IconName, Progress, Screen, Section, SkeletonScreen, Small, Strong, Title } from '../src/ui/kit';
import { C, CATEGORY_ICON, R } from '../src/ui/theme';
import { formatCompact } from '../src/utils/format';

type Tip = { category: string; title: string; description: string; monthly_savings: number; yearly_savings: number };
const name = (c: string) => (c === 'emi' ? 'EMIs' : c.charAt(0).toUpperCase() + c.slice(1));

export default function Spending() {
  const router = useRouter();
  const { data, loading, refreshing, refresh } = useUserData(async (id) => {
    const [summary, tips] = await Promise.all([getAnalyticsSummary(id), getExpenseReductionTips(id)]);
    return { summary, tips: tips as Tip[] };
  });

  if (loading || !data)
    return (
      <Screen title="Spending">
        <SkeletonScreen />
      </Screen>
    );

  const { summary, tips } = data;
  const cats = Object.entries(summary.category_breakdown as Record<string, number>).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const top = cats[0]?.[1] || 1;
  const up = summary.change_percentage > 0;
  const day = new Date().getDate();
  const perDay = summary.this_month_spending / Math.max(1, day);

  return (
    <Screen title="Spending" kicker={new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })} refreshing={refreshing} onRefresh={refresh}>
      <Card style={{ marginTop: 14, borderRadius: R.lg, padding: 22 }}>
        <Amount value={summary.this_month_spending} display size={46} />
        <Body style={{ marginTop: 6 }}>
          <Strong color={up ? C.red : C.green}>{Math.abs(summary.change_percentage)}% {up ? 'more' : 'less'}</Strong> than by this day last month
        </Body>
        <View style={[styles.split, { marginTop: 18 }]}>
          <View style={{ flex: 1 }}>
            <Small>Per day</Small>
            <Strong style={{ marginTop: 2 }}>{formatCompact(perDay)}</Strong>
          </View>
          <View style={{ flex: 1 }}>
            <Small>Income</Small>
            <Strong style={{ marginTop: 2 }}>{formatCompact(summary.total_income)}</Strong>
          </View>
          <View style={{ flex: 1 }}>
            <Small>Left</Small>
            <Strong style={{ marginTop: 2 }} color={summary.remaining_balance < 0 ? C.red : C.ink}>{formatCompact(summary.remaining_balance)}</Strong>
          </View>
        </View>
      </Card>

      {tips.length > 0 && (
        <Section title="Easy wins">
          <View style={{ gap: 10 }}>
            {tips.map((t) => (
              <Card key={t.title}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                  <IconMark icon={(CATEGORY_ICON[t.category] ?? 'circle') as IconName} tint={t.category} />
                  <View style={{ flex: 1, marginLeft: 14 }}>
                    <Title style={{ fontSize: 16 }}>{t.title}</Title>
                    <Body style={{ marginTop: 4, fontSize: 14, lineHeight: 20 }}>{t.description}</Body>
                    <Small color={C.green} style={{ marginTop: 8 }}>
                      Saves about {formatCompact(t.yearly_savings)} a year
                    </Small>
                  </View>
                </View>
              </Card>
            ))}
          </View>
        </Section>
      )}

      <Section title="By category">
        <Card padded={false}>
          {cats.map(([c, v], i) => (
            <View key={c} style={[{ padding: 16 }, i > 0 && styles.line]}>
              <View style={styles.between}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <IconMark icon={(CATEGORY_ICON[c] ?? 'circle') as IconName} tint={c} size={32} />
                  <Strong style={{ marginLeft: 12 }}>{name(c)}</Strong>
                </View>
                <Amount value={Math.round(v)} size={15} />
              </View>
              <View style={{ marginTop: 10, marginLeft: 44 }}>
                <Progress value={v} max={top} color={C.ink} height={4} />
                <Small style={{ marginTop: 4 }}>{Math.round((v / (summary.this_month_spending || 1)) * 100)}% of spending</Small>
              </View>
            </View>
          ))}
        </Card>
      </Section>

      <View style={{ marginTop: 24, gap: 10 }}>
        <Button label="See every transaction" kind="secondary" onPress={() => router.push('/activity')} />
        <Button label="Put the difference in a goal" kind="ghost" onPress={() => router.push('/goals')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  split: { flexDirection: 'row' },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  line: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.line },
});
