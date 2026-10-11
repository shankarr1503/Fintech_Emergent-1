import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { errorMessage, getBills, payBill } from '../src/services/api';
import { useGame } from '../src/game/GameContext';
import { Coin } from '../src/game/Coin';
import { useUserData } from '../src/game/useData';
import { Alert } from '../src/ui/dialog';
import { Amount, Button, Card, Divider, IconMark, IconName, Label, Pill, Screen, Section, SkeletonScreen, Small, Strong } from '../src/ui/kit';
import { C, R, themed } from '../src/ui/theme';
import { daysUntil, formatDate } from '../src/utils/format';

type Bill = { id: string; type: string; title: string; biller: string; amount: number; due_date: string; status: string; autopay: boolean; coins_earn: number; paid_on?: string };

const ICON: Record<string, IconName> = { rent: 'home', utility: 'zap', recharge: 'smartphone', insurance: 'shield' };

const dueText = (days: number) => (days < 0 ? `Overdue by ${-days} days` : days === 0 ? 'Due today' : days === 1 ? 'Due tomorrow' : `Due in ${days} days`);

export default function Bills() {
  const { celebrate } = useGame();
  const [paying, setPaying] = useState<string | null>(null);
  const { data, loading, refreshing, refresh, reload, userId } = useUserData((id) => getBills(id) as Promise<Bill[]>);

  if (loading || !data)
    return (
      <Screen title="Bills">
        <SkeletonScreen />
      </Screen>
    );

  const pending = data.filter((b) => b.status !== 'paid').sort((a, b) => a.due_date.localeCompare(b.due_date));
  const paid = data.filter((b) => b.status === 'paid');
  const total = pending.reduce((s, b) => s + b.amount, 0);

  const pay = (b: Bill) =>
    Alert.alert(`Pay ${b.biller}?`, `₹${b.amount.toLocaleString('en-IN')} for ${b.title.toLowerCase()}.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: `Pay ₹${b.amount.toLocaleString('en-IN')}`,
        onPress: async () => {
          setPaying(b.id);
          try {
            const res = await payBill(userId, b.id);
            celebrate(`${b.title} paid`, res.reward, res.coins_earned);
            reload();
          } catch (e) {
            Alert.alert('Payment failed', `${errorMessage(e)}\n\nYou haven't been charged.`);
          } finally {
            setPaying(null);
          }
        },
      },
    ]);

  return (
    <Screen title="Bills" refreshing={refreshing} onRefresh={refresh}>
      <Card dark style={{ marginTop: 14, borderRadius: R.lg, padding: 22 }}>
        <Label color={C.nightMuted}>Due this month</Label>
        <Amount value={total} display size={44} color={C.nightText} style={{ marginTop: 8 }} />
        <Small color={C.nightMuted} style={{ marginTop: 4 }}>
          {pending.length ? `${pending.length} bills · next ${dueText(daysUntil(pending[0].due_date)).toLowerCase()}` : 'All paid. Nice.'}
        </Small>
      </Card>

      {pending.length > 0 && (
        <Section title="To pay">
          <View style={{ gap: 10 }}>
            {pending.map((b) => {
              const days = daysUntil(b.due_date);
              return (
                <Card key={b.id}>
                  <View style={styles.row}>
                    <IconMark icon={ICON[b.type] ?? 'file-text'} tint={b.type} size={44} />
                    <View style={{ flex: 1, marginLeft: 14 }}>
                      <Strong>{b.biller}</Strong>
                      <Small style={{ marginTop: 2 }}>{b.title}</Small>
                    </View>
                    <Amount value={b.amount} size={18} />
                  </View>
                  <View style={[styles.row, { marginTop: 14, justifyContent: 'space-between' }]}>
                    <View style={[styles.row, { gap: 6 }]}>
                      <Pill label={dueText(days)} tone={days <= 3 ? 'red' : 'neutral'} />
                      {b.autopay && <Pill label="Autopay" tone="green" icon="repeat" />}
                    </View>
                    <View style={styles.row}>
                      <Coin size={13} />
                      <Small style={{ marginLeft: 4 }}>+{b.coins_earn}</Small>
                    </View>
                  </View>
                  <Button label="Pay now" small style={{ marginTop: 14, alignSelf: 'flex-start' }} loading={paying === b.id} onPress={() => pay(b)} testID={`pay-${b.id}`} />
                </Card>
              );
            })}
          </View>
        </Section>
      )}

      {paid.length > 0 && (
        <Section title="Paid this month">
          <Card padded={false} style={{ paddingHorizontal: 16 }}>
            {paid.map((b, i) => (
              <View key={b.id}>
                {i > 0 && <Divider inset={54} />}
                <View style={[styles.row, { paddingVertical: 13 }]}>
                  <IconMark icon="check" tint="paid" />
                  <View style={{ flex: 1, marginLeft: 14 }}>
                    <Strong>{b.biller}</Strong>
                    <Small>{b.paid_on ? `Paid ${formatDate(b.paid_on)}` : 'Paid'}</Small>
                  </View>
                  <Amount value={b.amount} size={15} color={C.ink3} />
                </View>
              </View>
            ))}
          </Card>
        </Section>
      )}
      <Small style={{ marginTop: 20 }}>You earn 1 coin for every ₹100 of bills you pay here.</Small>
    </Screen>
  );
}

const styles = themed(() => StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
}));
