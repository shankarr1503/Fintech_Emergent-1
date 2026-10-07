import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Alert } from '../src/game/dialog';
import { applyForLoan, checkLoanEligibility, errorMessage, getActiveLoans } from '../src/services/api';
import { useGame } from '../src/game/GameContext';
import { useUserData } from '../src/game/useData';
import { SpriteName } from '../src/game/sprites';
import { BORDER, C } from '../src/game/theme';
import { Body, Box, Chip, Loading, PixelButton, PixelSheet, PText, Screen, SectionTitle, SegmentBar, Sprite, Stat } from '../src/game/ui';
import { formatCompact, formatCurrency } from '../src/utils/format';

type LoanType = {
  type: string; name: string; max_ltv: number; interest_rate: number; processing_fee: number;
  tenure_options: number[]; collateral_value: number; max_loan: number; disbursement_time: string;
};

const LOAN_SPRITE: Record<string, SpriteName> = { loan_against_mf: 'gem', loan_against_shares: 'star', loan_against_fd: 'chest', personal_loan: 'potion' };

const emiFor = (p: number, annualRate: number, months: number) => {
  const r = annualRate / 12 / 100;
  if (!p || !months) return 0;
  if (r === 0) return p / months;
  return (p * r * (1 + r) ** months) / ((1 + r) ** months - 1);
};

export default function LoansScreen() {
  const { celebrate } = useGame();
  const [picked, setPicked] = useState<LoanType | null>(null);
  const [fraction, setFraction] = useState(0.5);
  const [tenure, setTenure] = useState(12);
  const [busy, setBusy] = useState(false);
  const { data, loading, refreshing, refresh, reload, userId } = useUserData(async (id) => {
    const [eligibility, active] = await Promise.all([checkLoanEligibility(id), getActiveLoans(id)]);
    return { eligibility, active: active as any[] };
  });

  if (loading || !data) return <Loading label="BREWING POTIONS" />;
  const { eligibility, active } = data;
  const amount = picked ? Math.round((picked.max_loan * fraction) / 1000) * 1000 : 0;
  const emi = picked ? emiFor(amount, picked.interest_rate, tenure) : 0;
  const totalInterest = emi * tenure - amount;

  const open = (l: LoanType) => {
    setPicked(l);
    setFraction(0.5);
    setTenure(l.tenure_options[1] ?? l.tenure_options[0]);
  };

  const apply = async () => {
    if (!picked || amount <= 0) return;
    setBusy(true);
    try {
      const res = await applyForLoan(userId, picked.type, amount, tenure, []);
      setPicked(null);
      celebrate('POWER-UP GET!', res.reward);
      Alert.alert('Approved!', `${formatCurrency(res.amount)} at ${res.interest_rate}% • EMI ${formatCurrency(res.emi)} for ${res.tenure} months.\n${res.message}`);
      reload();
    } catch (e) {
      Alert.alert('Application failed', errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen title="POWER-UPS" subtitle="LOANS AGAINST YOUR ASSETS" world="underground" refreshing={refreshing} onRefresh={refresh}>
      <Box color={C.pink}>
        <View style={styles.row}>
          <Sprite name="potion" scale={4} />
          <View style={{ marginLeft: 14, flex: 1 }}>
            <PText size={8}>MAX UNLOCKED</PText>
            <PText size={20} style={{ marginTop: 8 }}>
              {formatCompact(eligibility.max_loan_amount)}
            </PText>
            <Body size={12} color={C.text} style={{ marginTop: 4 }}>
              Based on credit score {eligibility.credit_score}
            </Body>
          </View>
        </View>
      </Box>

      {(eligibility.pre_approved_offers ?? []).map((o: any) => (
        <Box key={o.id} color={C.coin} style={{ marginTop: 14 }}>
          <PText size={8}>★ PRE-APPROVED BONUS ★</PText>
          <PText size={14} style={{ marginTop: 8 }}>
            {formatCurrency(o.amount)} @ {o.interest_rate}%
          </PText>
          <Body size={12} color={C.text} style={{ marginTop: 4 }}>
            EMI {formatCurrency(o.emi)} × {o.tenure} months • valid till {o.valid_until}
          </Body>
        </Box>
      ))}

      <SectionTitle>CHOOSE A POWER-UP</SectionTitle>
      {eligibility.eligible_loan_types.map((l: LoanType) => (
        <Pressable key={l.type} onPress={() => open(l)} accessibilityRole="button" accessibilityLabel={l.name}>
          <Box style={{ marginBottom: 12 }}>
            <View style={styles.row}>
              <View style={styles.icon}>
                <Sprite name={LOAN_SPRITE[l.type] ?? 'potion'} scale={3} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <PText size={9}>{l.name.toUpperCase()}</PText>
                <Body size={12} style={{ marginTop: 4 }}>
                  {l.interest_rate}% p.a. • {l.disbursement_time}
                </Body>
              </View>
              <PText size={12}>{'>'}</PText>
            </View>
            <View style={[styles.between, { marginTop: 12 }]}>
              <Stat label="Up to" value={formatCompact(l.max_loan)} color={C.pipeDark} />
              <Stat label="LTV" value={`${l.max_ltv}%`} align="center" />
              <Stat label="Fee" value={`${l.processing_fee}%`} align="right" />
            </View>
          </Box>
        </Pressable>
      ))}

      <SectionTitle>ACTIVE POWER-UPS</SectionTitle>
      {active.map((l) => {
        const paidPct = l.amount ? ((l.amount - (l.outstanding ?? l.amount)) / l.amount) * 100 : 0;
        return (
          <Box key={l.id} style={{ marginBottom: 12 }}>
            <PText size={9}>{(l.name ?? l.type).replace(/_/g, ' ').toUpperCase()}</PText>
            <View style={[styles.between, { marginTop: 10 }]}>
              <Stat label="Outstanding" value={formatCompact(l.outstanding ?? l.amount)} color={C.red} />
              <Stat label="EMI" value={formatCompact(l.emi)} align="center" />
              <Stat label="Next" value={l.next_emi_date ?? l.disbursement_status ?? '-'} align="right" />
            </View>
            <View style={{ marginTop: 10 }}>
              <SegmentBar value={paidPct} max={100} segments={10} height={8} track={C.paperDark} />
            </View>
          </Box>
        );
      })}

      <PixelSheet visible={!!picked} onClose={() => setPicked(null)} title={picked?.name.toUpperCase() ?? ''}>
        <PText size={8}>HOW MUCH?</PText>
        <PText size={22} style={{ marginVertical: 10 }}>
          {formatCurrency(amount)}
        </PText>
        <View style={styles.levels}>
          {[0.25, 0.5, 0.75, 1].map((f) => (
            <Pressable key={f} onPress={() => setFraction(f)} style={[styles.level, fraction >= f && { backgroundColor: C.pipe }]} accessibilityRole="button" accessibilityLabel={`${f * 100}% of max`}>
              <PText size={7} color={fraction >= f ? C.white : C.ink}>
                {f * 100}%
              </PText>
            </Pressable>
          ))}
        </View>
        <PText size={8} style={{ marginTop: 16, marginBottom: 8 }}>
          TENURE (MONTHS)
        </PText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 8 }}>
          {picked?.tenure_options.map((t) => (
            <Chip key={t} label={String(t)} active={tenure === t} onPress={() => setTenure(t)} />
          ))}
        </View>
        <Box style={{ marginTop: 16 }} color={C.white}>
          <View style={styles.between}>
            <Stat label="Monthly EMI" value={formatCurrency(emi)} color={C.blue} />
            <Stat label="Total interest" value={formatCompact(totalInterest)} align="right" />
          </View>
          <Body size={12} style={{ marginTop: 10 }}>
            {picked?.interest_rate}% p.a. • {picked?.processing_fee}% processing fee • collateral {formatCompact(picked?.collateral_value ?? 0)}
          </Body>
        </Box>
        <PixelButton label="ACTIVATE POWER-UP" sprite="potion" color={C.purple} style={{ marginTop: 16 }} loading={busy} onPress={apply} />
        <Body size={11} center style={{ marginTop: 8 }}>
          Borrow only what you need. Missing EMIs hurts your credit score.
        </Body>
      </PixelSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  icon: { width: 52, height: 52, borderWidth: BORDER, borderColor: C.ink, backgroundColor: C.paperDark, alignItems: 'center', justifyContent: 'center' },
  levels: { flexDirection: 'row', gap: 6 },
  level: { flex: 1, height: 40, borderWidth: BORDER, borderColor: C.ink, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center' },
});
