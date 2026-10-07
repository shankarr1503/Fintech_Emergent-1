import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Alert } from '../src/game/dialog';
import { errorMessage, getBills, payBill } from '../src/services/api';
import { useGame } from '../src/game/GameContext';
import { useUserData } from '../src/game/useData';
import { SpriteName } from '../src/game/sprites';
import { BORDER, C } from '../src/game/theme';
import { Body, Box, CoinCount, Loading, PixelButton, PText, Screen, SectionTitle, SpriteBadge, Stat } from '../src/game/ui';
import { daysUntil, formatCurrency } from '../src/utils/format';

type Bill = { id: string; type: string; title: string; biller: string; amount: number; due_date: string; status: string; autopay: boolean; coins_earn: number; paid_on?: string };

const BILL_SPRITE: Record<string, SpriteName> = { rent: 'house', utility: 'bolt', recharge: 'bubble', insurance: 'shield' };

export default function BillsScreen() {
  const { celebrate } = useGame();
  const [paying, setPaying] = useState<string | null>(null);
  const { data, loading, refreshing, refresh, reload, userId } = useUserData((id) => getBills(id) as Promise<Bill[]>);

  if (loading || !data) return <Loading label="COUNTING BRICKS" />;
  const pending = data.filter((b) => b.status !== 'paid').sort((a, b) => a.due_date.localeCompare(b.due_date));
  const paid = data.filter((b) => b.status === 'paid');
  const totalDue = pending.reduce((s, b) => s + b.amount, 0);
  const coins = pending.reduce((s, b) => s + b.coins_earn, 0);

  const pay = (bill: Bill) =>
    Alert.alert(`Pay ${bill.title}?`, `${formatCurrency(bill.amount)} to ${bill.biller}. You'll earn ${bill.coins_earn} coins.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Pay',
        onPress: async () => {
          setPaying(bill.id);
          try {
            const res = await payBill(userId, bill.id);
            celebrate('BRICK SMASHED!', res.reward, res.coins_earned);
            reload();
          } catch (e) {
            Alert.alert('Payment failed', errorMessage(e));
          } finally {
            setPaying(null);
          }
        },
      },
    ]);

  return (
    <Screen title="BILL CASTLE" subtitle="SMASH BILLS, EARN COINS" refreshing={refreshing} onRefresh={refresh} ground>
      <Box color={C.brick}>
        <View style={styles.between}>
          <View>
            <PText size={8} color={C.paper}>
              DUE THIS MONTH
            </PText>
            <PText size={20} color={C.white} shadow={C.ink} style={{ marginTop: 10 }}>
              {formatCurrency(totalDue)}
            </PText>
          </View>
          <View style={styles.coinPill}>
            <CoinCount value={`+${coins}`} size={9} />
          </View>
        </View>
        <Body color={C.paper} size={12} style={{ marginTop: 8 }}>
          {pending.length} bills waiting • earn 1 coin per ₹100 paid
        </Body>
      </Box>

      <SectionTitle>BRICKS TO SMASH</SectionTitle>
      {pending.length === 0 && (
        <Box color="#D7F5B0">
          <PText size={10} center>
            ALL BILLS PAID! ★
          </PText>
        </Box>
      )}
      {pending.map((b) => {
        const days = daysUntil(b.due_date);
        const urgent = days <= 3;
        return (
          <Box key={b.id} style={{ marginBottom: 12 }}>
            <View style={styles.row}>
              <SpriteBadge sprite={BILL_SPRITE[b.type] ?? 'bolt'} color={C.block} size={50} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <PText size={10}>{b.title.toUpperCase()}</PText>
                <Body size={13} style={{ marginTop: 4 }}>
                  {b.biller}
                  {b.autopay ? ' • Autopay on' : ''}
                </Body>
              </View>
              <View style={[styles.timer, urgent && { backgroundColor: C.red }]}>
                <PText size={6} color={C.white}>
                  TIME
                </PText>
                <PText size={10} color={C.white} style={{ marginTop: 4 }}>
                  {String(Math.max(0, days)).padStart(3, '0')}
                </PText>
              </View>
            </View>
            <View style={[styles.between, { marginTop: 12 }]}>
              <Stat label="Amount" value={formatCurrency(b.amount)} />
              <Stat label="Reward" value={`+${b.coins_earn}`} color={C.coinDark} align="right" />
            </View>
            <PixelButton label="PAY NOW" sprite="coin" small style={{ marginTop: 12 }} loading={paying === b.id} onPress={() => pay(b)} testID={`pay-${b.id}`} />
          </Box>
        );
      })}

      {paid.length > 0 && (
        <>
          <SectionTitle>SMASHED THIS MONTH</SectionTitle>
          <Box padding={10}>
            {paid.map((b) => (
              <View key={b.id} style={[styles.between, { paddingVertical: 8 }]}>
                <PText size={8}>✓ {b.title.toUpperCase()}</PText>
                <PText size={8} color={C.pipeDark}>
                  {formatCurrency(b.amount)}
                </PText>
              </View>
            ))}
          </Box>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  coinPill: { backgroundColor: C.coin, borderWidth: BORDER, borderColor: C.ink, padding: 8 },
  timer: { backgroundColor: C.ink, borderWidth: 2, borderColor: C.ink, padding: 6, alignItems: 'center' },
});
