import React, { useMemo, useState } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { getAllAccounts } from '../src/services/api';
import { useUserData } from '../src/game/useData';
import { Amount, Card, Divider, IconMark, IconName, Label, Row, Screen, Section, SkeletonScreen, Small } from '../src/ui/kit';
import { C, F, GUTTER, R } from '../src/ui/theme';
import { formatCompact } from '../src/utils/format';

type Item = { id: string; group: string; title: string; sub: string; value: number; icon: IconName; color?: string; number?: string };

function flatten(d: any): Item[] {
  const out: Item[] = [];
  for (const a of d.bank_accounts ?? []) out.push({ id: a.id, group: 'Bank accounts', title: a.bank, sub: `${a.type}${a.is_salary_account ? ' · Salary' : ''} · ${a.interest_rate}%`, value: a.balance, icon: 'credit-card', color: a.card_color, number: a.account_number });
  for (const a of d.fixed_deposits ?? []) out.push({ id: a.id, group: 'Deposits', title: `${a.bank} FD`, sub: `${a.interest_rate}% · matures ${a.maturity_date}`, value: a.current_value, icon: 'lock' });
  for (const a of d.recurring_deposits ?? []) out.push({ id: a.id, group: 'Deposits', title: `${a.bank} RD`, sub: `${formatCompact(a.monthly_amount)}/month · ${a.installments_paid} paid`, value: a.current_value, icon: 'calendar' });
  for (const a of d.post_office_accounts ?? []) out.push({ id: a.id, group: 'Deposits', title: a.type, sub: `${a.interest_rate}%${a.maturity_date ? ` · matures ${a.maturity_date}` : ''}`, value: a.balance ?? a.current_value, icon: 'mail' });
  if (d.ppf_account) out.push({ id: d.ppf_account.id, group: 'Retirement', title: 'PPF', sub: `${d.ppf_account.bank} · ${d.ppf_account.interest_rate}% · till ${d.ppf_account.maturity_year}`, value: d.ppf_account.balance, icon: 'shield' });
  if (d.nps_account) out.push({ id: d.nps_account.id, group: 'Retirement', title: 'NPS', sub: `${d.nps_account.fund_manager} · ${d.nps_account.returns_ytd}% this year`, value: d.nps_account.total_corpus, icon: 'trending-up' });
  return out;
}

export default function Accounts() {
  const { width } = useWindowDimensions();
  const [page, setPage] = useState(0);
  const { data, loading, refreshing, refresh } = useUserData((id) => getAllAccounts(id));
  const items = useMemo(() => (data ? flatten(data) : []), [data]);

  if (loading || !data)
    return (
      <Screen title="Accounts">
        <SkeletonScreen />
      </Screen>
    );

  const banks = items.filter((i) => i.group === 'Bank accounts');
  const groups = ['Deposits', 'Retirement'];
  const cardW = width - GUTTER * 2;
  const total = items.reduce((s, i) => s + (i.value || 0), 0);
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => setPage(Math.round(e.nativeEvent.contentOffset.x / (cardW + 12)));

  return (
    <Screen title="Accounts" refreshing={refreshing} onRefresh={refresh}>
      <Small style={{ marginTop: 4 }}>
        {formatCompact(total)} across {items.length} accounts
      </Small>

      <ScrollView
        horizontal
        pagingEnabled={false}
        snapToInterval={cardW + 12}
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        onScroll={onScroll}
        scrollEventThrottle={64}
        style={{ marginHorizontal: -GUTTER, marginTop: 18 }}
        contentContainerStyle={{ paddingHorizontal: GUTTER, gap: 12 }}
      >
        {banks.map((b) => (
          <View key={b.id} style={[styles.bankCard, { width: cardW, backgroundColor: b.color ?? C.night }]}>
            <View style={styles.between}>
              <Text style={styles.bankName}>{b.title}</Text>
              <Text style={styles.cardType}>Savings</Text>
            </View>
            <View style={{ flex: 1 }} />
            <Label color="rgba(255,255,255,0.65)">Balance</Label>
            <Amount value={b.value} display size={38} color="#FFFFFF" style={{ marginTop: 2 }} />
            <Text style={styles.number}>•••• {b.number?.slice(-4)}</Text>
          </View>
        ))}
      </ScrollView>
      <View style={styles.dots}>
        {banks.map((b, i) => (
          <View key={b.id} style={[styles.dot, i === page && { backgroundColor: C.ink, width: 16 }]} />
        ))}
      </View>

      {groups.map((g) => {
        const list = items.filter((i) => i.group === g);
        if (!list.length) return null;
        return (
          <Section key={g} title={`${g} · ${formatCompact(list.reduce((s, i) => s + i.value, 0))}`}>
            <Card padded={false} style={{ paddingHorizontal: 16 }}>
              {list.map((it, i) => (
                <View key={it.id}>
                  {i > 0 && <Divider inset={54} />}
                  <Row left={<IconMark icon={it.icon} tint={it.title} />} title={it.title} subtitle={it.sub} right={<Amount value={it.value} size={15} />} />
                </View>
              ))}
            </Card>
          </Section>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bankCard: { height: 200, borderRadius: R.lg, padding: 22 },
  bankName: { fontFamily: F.semibold, fontSize: 17, color: '#FFFFFF' },
  cardType: { fontFamily: F.medium, fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  number: { fontFamily: F.medium, fontSize: 14, color: 'rgba(255,255,255,0.75)', marginTop: 6, letterSpacing: 2 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 14 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.lineStrong },
});
