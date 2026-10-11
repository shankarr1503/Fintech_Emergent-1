import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { applyForLoan, checkLoanEligibility, errorMessage, getActiveLoans, getLoanQuote, KeyFacts } from '../src/services/api';
import { useUserData } from '../src/game/useData';
import { Alert } from '../src/ui/dialog';
import { Amount, Body, Button, Card, Chip, Divider, ErrorState, IconMark, IconName, Label, Pill, Progress, Row, Screen, Section, Segmented, Sheet, SkeletonScreen, Small, Strong } from '../src/ui/kit';
import { C, themed } from '../src/ui/theme';
import { formatCompact, formatCurrency } from '../src/utils/format';

type LoanType = { type: string; name: string; max_ltv: number; interest_rate: number; processing_fee: number; tenure_options: number[]; collateral_value: number; max_loan: number };

const ICON: Record<string, IconName> = { loan_against_mf: 'pie-chart', loan_against_shares: 'trending-up', loan_against_fd: 'lock', personal_loan: 'user' };

export default function Loans() {
  const [picked, setPicked] = useState<LoanType | null>(null);
  const [share, setShare] = useState<'25' | '50' | '75' | '100'>('50');
  const [tenure, setTenure] = useState(24);
  const [facts, setFacts] = useState<KeyFacts | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const { data, loading, refreshing, refresh, reload, error, userId } = useUserData(async (id) => {
    const [eligibility, active] = await Promise.all([checkLoanEligibility(id), getActiveLoans(id)]);
    return { eligibility, active: active as any[] };
  });

  if (loading || !data)
    return (
      <Screen title="Loans">
        {error ? <ErrorState onRetry={reload} /> : <SkeletonScreen />}
      </Screen>
    );

  const { eligibility, active } = data;
  const types: LoanType[] = eligibility.eligible_loan_types;
  const maxLoan = Math.max(0, ...types.map((t) => t.max_loan));
  const amount = picked ? Math.max(10000, Math.round((picked.max_loan * Number(share)) / 100 / 1000) * 1000) : 0;

  const open = (l: LoanType) => {
    setPicked(l);
    setShare('50');
    setTenure(l.tenure_options.includes(24) ? 24 : l.tenure_options[0]);
    setFacts(null);
    setAccepted(false);
  };

  const close = () => {
    setPicked(null);
    setFacts(null);
    setAccepted(false);
  };

  const review = async () => {
    if (!picked) return;
    setBusy(true);
    try {
      setFacts(await getLoanQuote(picked.type, amount, tenure));
    } catch (e) {
      Alert.alert("Couldn't get the terms", errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const apply = async () => {
    if (!picked || !facts || !accepted) return;
    setBusy(true);
    try {
      const res = await applyForLoan(userId, picked.type, amount, tenure);
      close();
      Alert.alert('Application saved', res.message);
      reload();
    } catch (e) {
      Alert.alert("Couldn't apply", errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const rows: [string, string][] = facts
    ? [
        ['Loan amount', formatCurrency(facts.amount)],
        [`Processing fee`, formatCurrency(facts.processing_fee)],
        ['GST on fee (18%)', formatCurrency(facts.gst_on_fee)],
        ['You receive', formatCurrency(facts.net_disbursal)],
        ['Interest rate', `${facts.interest_rate}% a year`],
        ['APR (all costs, yearly)', `${facts.apr}%`],
        ['Monthly EMI', `${formatCurrency(facts.emi)} × ${facts.tenure_months}`],
        ['Total interest', formatCurrency(facts.total_interest)],
        ['Total you repay', formatCurrency(facts.total_repayable)],
      ]
    : [];

  return (
    <Screen title="Loans" kicker="Against what you already own" refreshing={refreshing} onRefresh={refresh}>
      <Body style={{ marginTop: 6 }}>
        Borrow against mutual funds, shares or FDs without selling them. Secured loans usually cost less than personal loans. Rates below are indicative; the lender confirms the final terms.
      </Body>

      <Section title={`Up to ${formatCompact(maxLoan)} indicative`}>
        <Card padded={false} style={{ paddingHorizontal: 16 }}>
          {types.map((l, i) => (
            <View key={l.type}>
              {i > 0 && <Divider inset={54} />}
              <Row
                left={<IconMark icon={ICON[l.type] ?? 'layers'} tint={l.type} />}
                title={l.name}
                subtitle={`From ${l.interest_rate}% a year · fee ${l.processing_fee}% + GST · up to ${formatCompact(l.max_loan)}`}
                subtitleLines={2}
                onPress={() => open(l)}
                chevron
                testID={`loan-${l.type}`}
              />
            </View>
          ))}
        </Card>
        {!eligibility.lender && (
          <Small style={{ marginTop: 10 }}>No lending partner is connected yet, so applications aren’t sent to a lender and nothing is disbursed.</Small>
        )}
      </Section>

      {active.length > 0 && (
        <Section title="Your loans">
          {active.map((l) => {
            const outstanding = l.outstanding ?? l.amount;
            const submitted = l.status === 'submitted';
            return (
              <Card key={l.id} style={{ marginBottom: 10 }}>
                <View style={styles.between}>
                  <Strong>{l.name ?? String(l.type).replace(/_/g, ' ')}</Strong>
                  <Pill label={submitted ? 'Application saved' : l.status === 'active' ? 'Active' : 'Processing'} tone={l.status === 'active' ? 'green' : 'gold'} />
                </View>
                <Amount value={outstanding} size={24} style={{ marginTop: 10 }} />
                <Small>
                  {submitted ? 'applied for' : `left of ${formatCompact(l.amount)}`} · {formatCurrency(l.emi)}/month{l.next_emi_date ? ` · next ${l.next_emi_date}` : ''}
                </Small>
                {!submitted && (
                  <View style={{ marginTop: 12 }}>
                    <Progress value={l.amount - outstanding} max={l.amount} color={C.green} height={4} />
                  </View>
                )}
              </Card>
            );
          })}
        </Section>
      )}

      <Sheet visible={!!picked} onClose={close} title={facts ? 'Key facts' : picked?.name ?? ''}>
        {!facts ? (
          <>
            <Label>Borrow</Label>
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
            <Button label="See all costs" style={{ marginTop: 22 }} loading={busy} onPress={review} testID="loan-review" />
          </>
        ) : (
          <>
            <Card padded={false}>
              {rows.map(([k, v], i) => (
                <View key={k} style={[styles.between, { padding: 14 }, i > 0 && styles.line]}>
                  <Small color={C.ink2} style={{ flex: 1, marginRight: 12 }}>{k}</Small>
                  <Strong>{v}</Strong>
                </View>
              ))}
            </Card>
            <Small style={{ marginTop: 12 }}>
              Late payment: {facts.late_payment.charAt(0).toLowerCase() + facts.late_payment.slice(1)}. You can cancel within {facts.cooling_off_days} days of disbursal by repaying the principal and the proportionate APR, with no penalty. Missing an EMI can lower your credit score.
            </Small>
            <Pressable onPress={() => setAccepted((a) => !a)} style={styles.accept} accessibilityRole="checkbox" accessibilityState={{ checked: accepted }} aria-checked={accepted} testID="loan-accept">
              <Feather name={accepted ? 'check-square' : 'square'} size={20} color={accepted ? C.primary : C.ink3} />
              <Small color={C.ink2} style={{ flex: 1, marginLeft: 10 }}>
                I’ve read these key facts and want to apply. I understand the lender will check my credit history.
              </Small>
            </Pressable>
            <Button label="Submit application" style={{ marginTop: 16 }} disabled={!accepted} loading={busy} onPress={apply} testID="apply-loan" />
            <Button label="Change amount" kind="ghost" style={{ marginTop: 6 }} onPress={() => setFacts(null)} />
          </>
        )}
      </Sheet>
    </Screen>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    line: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.line },
    accept: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 16 },
  }),
);
