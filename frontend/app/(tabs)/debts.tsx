import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Alert } from '../../src/game/dialog';
import { analyzeDebts, createDebt, deleteDebt, errorMessage, getDebts, payDebt } from '../../src/services/api';
import { useGame } from '../../src/game/GameContext';
import { useUserData } from '../../src/game/useData';
import { BORDER, C } from '../../src/game/theme';
import { Body, Box, Chip, EmptyState, Loading, PixelButton, PixelInput, PixelSheet, PText, Screen, SectionTitle, SegmentBar, Sprite, Stat } from '../../src/game/ui';
import { formatCompact, formatCurrency } from '../../src/utils/format';

type Debt = { id: string; name: string; type: string; principal: number; outstanding: number; interest_rate: number; emi_amount: number; remaining_tenure: number };

const TYPES = [
  { value: 'credit_card', label: 'Card' },
  { value: 'personal_loan', label: 'Loan' },
  { value: 'emi', label: 'EMI' },
  { value: 'other', label: 'Other' },
];
const EMPTY_FORM = { name: '', type: 'credit_card', outstanding: '', principal: '', interest_rate: '', emi_amount: '', remaining_tenure: '' };

const threat = (rate: number) => (rate >= 24 ? { label: 'DRAGON', color: C.lava } : rate >= 12 ? { label: 'KNIGHT', color: C.orange } : { label: 'SLIME', color: C.pipeLight });

export default function BossScreen() {
  const { celebrate } = useGame();
  const [extra, setExtra] = useState(0);
  const [plan, setPlan] = useState<'avalanche' | 'snowball'>('avalanche');
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [target, setTarget] = useState<Debt | null>(null);
  const [hit, setHit] = useState('');
  const [busy, setBusy] = useState(false);

  const { data, loading, refreshing, refresh, reload, userId } = useUserData(
    async (id) => {
      const [debts, analysis] = await Promise.all([getDebts(id), analyzeDebts(id, extra)]);
      return { debts: debts as Debt[], analysis };
    },
    [extra],
  );

  if (loading || !data) return <Loading label="ENTERING CASTLE" world="castle" />;
  const { debts, analysis } = data;
  const active = plan === 'snowball' ? analysis.snowball_analysis : analysis.avalanche_analysis;
  const order: string[] = (active?.payoff_order ?? []).map((p: any) => p.name);
  const sorted = [...debts].sort((a, b) => {
    const ia = order.indexOf(a.name);
    const ib = order.indexOf(b.name);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });

  const add = async () => {
    const outstanding = parseFloat(form.outstanding);
    const emi = parseFloat(form.emi_amount);
    if (!form.name.trim() || !(outstanding > 0) || !(emi > 0)) {
      return Alert.alert('Missing info', 'Name, outstanding amount and EMI are required.');
    }
    setBusy(true);
    try {
      const res = await createDebt({
        user_id: userId,
        name: form.name.trim(),
        type: form.type,
        principal: parseFloat(form.principal) || outstanding,
        outstanding,
        interest_rate: parseFloat(form.interest_rate) || 0,
        emi_amount: emi,
        remaining_tenure: parseInt(form.remaining_tenure, 10) || 12,
      });
      setAdding(false);
      setForm(EMPTY_FORM);
      celebrate('BOSS SPOTTED!', res.reward);
      reload();
    } catch (e) {
      Alert.alert('Could not add', errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const attack = async () => {
    if (!target) return;
    const amount = parseFloat(hit);
    if (!(amount > 0)) return Alert.alert('Enter an amount', 'How much did you pay?');
    setBusy(true);
    try {
      const res = await payDebt(target.id, amount);
      setTarget(null);
      setHit('');
      celebrate(res.defeated ? 'BOSS DEFEATED!' : `-${formatCompact(res.paid)} HP!`, res.reward);
      reload();
    } catch (e) {
      Alert.alert('Attack failed', errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const remove = (debt: Debt) =>
    Alert.alert('Remove boss?', `Delete "${debt.name}" from your tracker?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDebt(debt.id);
            reload();
          } catch (e) {
            Alert.alert('Error', errorMessage(e));
          }
        },
      },
    ]);

  return (
    <Screen
      title="BOSS BATTLES"
      subtitle="DEFEAT YOUR DEBTS"
      world="castle"
      back={false}
      refreshing={refreshing}
      onRefresh={refresh}
      right={<PixelButton label="+" small color={C.red} onPress={() => setAdding(true)} testID="add-debt" />}
    >
      <Box color="#2A1A3A">
        <View style={styles.between}>
          <Stat label="Total HP" value={formatCompact(analysis.total_debt)} color={C.lava} />
          <Stat label="Monthly EMI" value={formatCompact(analysis.total_emi)} color={C.white} align="center" />
          <Stat label="Avg rate" value={`${(analysis.average_interest_rate ?? 0).toFixed(1)}%`} color={C.coin} align="right" />
        </View>
      </Box>

      {analysis.total_debt > 0 && (
        <>
          <SectionTitle>BATTLE PLAN</SectionTitle>
          <View style={styles.plans}>
            {(['avalanche', 'snowball'] as const).map((p) => {
              const a = p === 'avalanche' ? analysis.avalanche_analysis : analysis.snowball_analysis;
              const on = plan === p;
              return (
                <Pressable key={p} style={{ flex: 1 }} onPress={() => setPlan(p)} accessibilityRole="radio" accessibilityState={{ checked: on }}>
                  <Box color={on ? C.coin : C.paper} padding={12}>
                    <Sprite name={p === 'avalanche' ? 'sword' : 'star'} scale={2.5} />
                    <PText size={9} style={{ marginTop: 8 }}>
                      {p.toUpperCase()}
                    </PText>
                    <Body size={12} style={{ marginTop: 4 }}>
                      {p === 'avalanche' ? 'Hit highest interest first' : 'Smallest boss first'}
                    </Body>
                    <PText size={8} style={{ marginTop: 8 }}>
                      {a?.total_months ?? 0} MONTHS
                    </PText>
                    <PText size={7} color={C.textMuted} style={{ marginTop: 4 }}>
                      {formatCompact(a?.total_interest ?? 0)} INTEREST
                    </PText>
                  </Box>
                </Pressable>
              );
            })}
          </View>
          {analysis.interest_saved_with_avalanche > 0 && (
            <Body size={12} color={C.coin} style={{ marginTop: 4 }}>
              Avalanche saves {formatCurrency(analysis.interest_saved_with_avalanche)} in interest.
            </Body>
          )}

          <PText size={8} color={C.white} style={{ marginTop: 16, marginBottom: 8 }}>
            EXTRA POWER PER MONTH
          </PText>
          <View style={{ flexDirection: 'row' }}>
            {[0, 2000, 5000, 10000].map((v) => (
              <Chip key={v} label={v ? `+${formatCompact(v)}` : 'none'} active={extra === v} onPress={() => setExtra(v)} color={C.lava} />
            ))}
          </View>

          <Box color={C.pipeLight} style={{ marginTop: 14 }}>
            <View style={styles.row}>
              <Sprite name="flag" scale={3} />
              <View style={{ marginLeft: 12 }}>
                <PText size={8} color={C.pipeDark}>
                  VICTORY DATE
                </PText>
                <PText size={13} style={{ marginTop: 6 }}>
                  {(active?.debt_free_date ?? '-').toUpperCase()}
                </PText>
              </View>
            </View>
          </Box>
        </>
      )}

      <SectionTitle>BOSS QUEUE</SectionTitle>
      {sorted.length === 0 ? (
        <EmptyState sprite="trophy" title="NO BOSSES!" body="You're debt free. Add a loan or card to track it here." />
      ) : (
        sorted.map((d, i) => {
          const hpPct = d.principal > 0 ? (d.outstanding / d.principal) * 100 : 0;
          const t = threat(d.interest_rate);
          const defeated = d.outstanding <= 0;
          return (
            <Box key={d.id} color={defeated ? '#D7F5B0' : C.paper} style={{ marginBottom: 12 }}>
              <View style={styles.row}>
                <View style={[styles.bossFrame, { backgroundColor: t.color }]}>
                  <Sprite name={defeated ? 'trophy' : 'boss'} scale={3} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <View style={styles.between}>
                    <PText size={7} color={C.textMuted}>
                      #{i + 1} • {defeated ? 'DEFEATED' : t.label}
                    </PText>
                    <Pressable onPress={() => remove(d)} hitSlop={10} accessibilityLabel={`Delete ${d.name}`}>
                      <PText size={8} color={C.grayDark}>
                        X
                      </PText>
                    </Pressable>
                  </View>
                  <PText size={10} style={{ marginTop: 6 }} numberOfLines={1}>
                    {d.name.toUpperCase()}
                  </PText>
                  <View style={{ marginTop: 8 }}>
                    <SegmentBar value={hpPct} max={100} color={C.red} segments={10} height={10} />
                  </View>
                  <PText size={7} style={{ marginTop: 5 }}>
                    HP {formatCurrency(d.outstanding)} / {formatCurrency(d.principal)}
                  </PText>
                </View>
              </View>
              <View style={[styles.between, { marginTop: 12 }]}>
                <Stat label="Rate" value={`${d.interest_rate}%`} />
                <Stat label="EMI" value={formatCompact(d.emi_amount)} align="center" />
                <Stat label="Left" value={`${d.remaining_tenure} MO`} align="right" />
              </View>
              {!defeated && (
                <PixelButton
                  label="ATTACK!"
                  sprite="sword"
                  small
                  style={{ marginTop: 12 }}
                  onPress={() => {
                    setTarget(d);
                    setHit(String(Math.min(d.emi_amount, d.outstanding)));
                  }}
                />
              )}
            </Box>
          );
        })
      )}

      <PixelSheet visible={!!target} onClose={() => setTarget(null)} title="ATTACK BOSS">
        <Body style={{ marginBottom: 12 }}>Log a payment you made toward {target?.name}. It lowers the outstanding balance.</Body>
        <PixelInput label="Amount paid" prefix="₹" keyboardType="numeric" value={hit} onChangeText={setHit} />
        <PixelButton label="STRIKE!" sprite="sword" loading={busy} onPress={attack} />
      </PixelSheet>

      <PixelSheet visible={adding} onClose={() => setAdding(false)} title="NEW BOSS">
        <PixelInput label="Name *" placeholder="HDFC Credit Card" value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} />
        <PText size={8} style={{ marginBottom: 8 }}>
          TYPE
        </PText>
        <View style={{ flexDirection: 'row', marginBottom: 14 }}>
          {TYPES.map((t) => (
            <Chip key={t.value} label={t.label} active={form.type === t.value} onPress={() => setForm({ ...form, type: t.value })} />
          ))}
        </View>
        <PixelInput label="Outstanding *" prefix="₹" keyboardType="numeric" value={form.outstanding} onChangeText={(v) => setForm({ ...form, outstanding: v })} />
        <PixelInput label="Original amount" prefix="₹" keyboardType="numeric" value={form.principal} onChangeText={(v) => setForm({ ...form, principal: v })} />
        <PixelInput label="Interest rate (% per year)" keyboardType="numeric" value={form.interest_rate} onChangeText={(v) => setForm({ ...form, interest_rate: v })} />
        <PixelInput label="Monthly EMI *" prefix="₹" keyboardType="numeric" value={form.emi_amount} onChangeText={(v) => setForm({ ...form, emi_amount: v })} />
        <PixelInput label="Months left" keyboardType="numeric" value={form.remaining_tenure} onChangeText={(v) => setForm({ ...form, remaining_tenure: v })} />
        <PixelButton label="SPAWN BOSS" loading={busy} onPress={add} />
      </PixelSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  plans: { flexDirection: 'row', gap: 10 },
  bossFrame: { width: 56, height: 56, borderWidth: BORDER, borderColor: C.ink, alignItems: 'center', justifyContent: 'center' },
});
