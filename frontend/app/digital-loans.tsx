import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { applyForLoan, checkLoanEligibility, errorMessage, getActiveLoans } from '../src/services/api';
import { useGame } from '../src/game/GameContext';
import { useUserData } from '../src/game/useData';
import { Alert } from '../src/ui/dialog';
import { Amount, Body, Button, Card, Chip, Divider, IconMark, IconName, Label, Pill, Progress, Row, Screen, Section, Segmented, Sheet, SkeletonScreen, Small, Strong } from '../src/ui/kit';
import { C, R } from '../src/ui/theme';
import { formatCompact, formatCurrency } from '../src/utils/format';

type LoanType = { type: string; name: string; max_ltv: number; interest_rate: number; processing_fee: number; tenure_options: number[]; collateral_value: number; max_loan: number; disbursement_time: string };

const ICON: Record<string, IconName> = { loan_against_mf: 'pie-chart', loan_against_shares: 'trending-up', loan_against_fd: 'lock', personal_loan: 'user' };

const emiFor = (p: number, annual: number, n: number) => {
  const r = annual / 1200;
  if (!p || !n) return 0;
  return r === 0 ? p / n : (p * r * (1 + r) ** n) / ((1 + r) ** n - 1);
};

export default function Loans() {
  const { celebrate } = useGame();
  const [picked, setPicked] = useState<LoanType | null>(null);
  const [share, setShare] = useState<'25' | '50' | '75' | '100'>('50');
  const [tenure, setTenure] = useState(24);
  const [busy, setBusy] = useState(false);
  const { data, loading, refreshing, refresh, reload, userId } = useUserData(async (id) => {
    const [eligibility, active] = await Promise.all([checkLoanEligibility(id), getActiveLoans(id)]);
    return { eligibility, active: active as any[] };
  });

  if (loading || !data)
    return (
      <Screen title="Loans">
        <SkeletonScreen />
      </Screen>
    );

  const { eligibility, active } = data;
  const amount = picked ? Math.round((picked.max_loan * Number(share)) / 100 / 1000) * 1000 : 0;
  const emi = picked ? emiFor(amount, picked.interest_rate, tenure) : 0;
  const interest = Math.max(0, emi * tenure - amount);
  const fee = picked ? (amount * picked.processing_fee) / 100 : 0;
  const offer = eligibility.pre_approved_offers?.[0];

  const open = (l: LoanType) => {
    setPicked(l);
    setShare('50');
    setTenure(l.tenure_options.includes(24) ? 24 : l.tenure_options[0]);
  };

  const apply = async () => {
    if (!picked || !amount) return;
    setBusy(true);
    try {
      const res = await applyForLoan(userId, picked.type, amount, tenure, []);
      setPicked(null);
      celebrate('Loan approved', res.reward);
      Alert.alert('Approved', `${formatCurrency(res.amount)} at ${res.interest_rate}% for ${res.tenure} months. EMI ${formatCurrency(res.emi)}.\n\n${res.message}`);
      reload();
    } catch (e) {
      Alert.alert("Couldn't apply", errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen title="Loans" kicker="Against what you already own" refreshing={refreshing} onRefresh={refresh}>
      <Body style={{ marginTop: 6 }}>
        Borrow against mutual funds, shares or FDs without selling them. Lower rates than a personal loan, money in minutes.
      </Body>

      {offer && (
        <Card dark style={{ marginTop: 18, borderRadius: R.lg, padding: 22 }}>
          <Pill label="Pre-approved" tone="dark" icon="check" />
          <Amount value={offer.amount} display size={42} color={C.nightText} style={{ marginTop: 14 }} />
          <Small color={C.nightMuted} style={{ marginTop: 2 }}>
            at {offer.interest_rate}% · {formatCurrency(offer.emi)}/month for {offer.tenure} months
          </Small>
          <Small color={C.nightMuted} style={{ marginTop: 10 }}>Valid till {offer.valid_until}</Small>
        </Card>
      )}

      <Section title={`Up to ${formatCompact(eligibility.max_loan_amount)} available`}>
        <Card padded={false} style={{ paddingHorizontal: 16 }}>
          {eligibility.eligible_loan_types.map((l: LoanType, i: number) => (
            <View key={l.type}>
              {i > 0 && <Divider inset={54} />}
              <Row
                left={<IconMark icon={ICON[l.type] ?? 'layers'} tint={l.type} />}
                title={l.name}
                subtitle={`${l.interest_rate}% · up to ${formatCompact(l.max_loan)} · ${l.disbursement_time.toLowerCase()}`}
                onPress={() => open(l)}
                chevron
                testID={`loan-${l.type}`}
              />
            </View>
          ))}
        </Card>
      </Section>

      {active.length > 0 && (
        <Section title="Your loans">
          {active.map((l) => {
            const outstanding = l.outstanding ?? l.amount;
            return (
              <Card key={l.id} style={{ marginBottom: 10 }}>
                <View style={styles.between}>
                  <Strong>{l.name ?? String(l.type).replace(/_/g, ' ')}</Strong>
                  <Pill label={l.status === 'active' ? 'Active' : 'Processing'} tone={l.status === 'active' ? 'green' : 'gold'} />
                </View>
                <Amount value={outstanding} size={24} style={{ marginTop: 10 }} />
                <Small>left of {formatCompact(l.amount)} · {formatCurrency(l.emi)}/month{l.next_emi_date ? ` · next ${l.next_emi_date}` : ''}</Small>
                <View style={{ marginTop: 12 }}>
                  <Progress value={l.amount - outstanding} max={l.amount} color={C.green} height={4} />
                </View>
              </Card>
            );
          })}
        </Section>
      )}

      <Sheet visible={!!picked} onClose={() => setPicked(null)} title={picked?.name ?? ''}>
        <Label>You get</Label>
        <Amount value={amount} display size={44} style={{ marginTop: 4 }} />
        <Small style={{ marginTop: 2 }}>of {formatCompact(picked?.max_loan ?? 0)} available</Small>
        <View style={{ marginTop: 16 }}>
          <Segmented
            value={share}
            onChange={setShare}
            options={[
              { value: '25', label: '25%' },
              { value: '50', label: '50%' },
              { value: '75', label: '75%' },
              { value: '100', label: 'Max' },
            ]}
          />
        </View>
        <Small style={{ marginTop: 18, marginBottom: 8 }}>Repay over</Small>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 8 }}>
          {picked?.tenure_options.map((t) => (
            <Chip key={t} label={`${t} months`} active={tenure === t} onPress={() => setTenure(t)} />
          ))}
        </View>
        <Card style={{ marginTop: 18 }} padded={false}>
          {[
            ['Monthly EMI', formatCurrency(Math.round(emi))],
            ['Total interest', formatCurrency(Math.round(interest))],
            [`Processing fee (${picked?.processing_fee}%)`, formatCurrency(Math.round(fee))],
            ['Interest rate', `${picked?.interest_rate}% a year`],
          ].map(([k, v], i) => (
            <View key={k} style={[styles.between, { padding: 14 }, i > 0 && styles.line]}>
              <Small>{k}</Small>
              <Strong>{v}</Strong>
            </View>
          ))}
        </Card>
        <Button label={`Get ${formatCompact(amount)}`} style={{ marginTop: 18 }} loading={busy} onPress={apply} testID="apply-loan" />
        <Small center style={{ marginTop: 10 }}>Missing an EMI can lower your credit score.</Small>
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  line: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.line },
});
