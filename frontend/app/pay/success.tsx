import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Share, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getReceipt, Receipt } from '../../src/services/receipt';
import { getPaymentStatus } from '../../src/services/api';
import { Coin } from '../../src/game/Coin';
import { Amount, Button, Divider, Label, NATIVE, Small, useStatusBar } from '../../src/ui/kit';
import { C, F, GUTTER, R, themed } from '../../src/ui/theme';

// Each state gets its own colour, icon and plain-language explanation.
const STATE = {
  success: { bg: '#0F5A40', icon: 'check', title: 'Paid' },
  pending: { bg: '#7A4F06', icon: 'clock', title: 'Waiting for the bank' },
  on_hold: { bg: '#7A4F06', icon: 'pause', title: 'On hold' },
  failed: { bg: '#8C2E24', icon: 'x', title: 'Payment failed' },
} as const;

const EXPLAIN: Record<string, string> = {
  pending: "Your bank hasn't confirmed yet. Most payments complete within a minute. We'll notify you either way; please don't pay again.",
  on_hold: 'Held for a routine security check. No money has moved. We will update you within 24 hours.',
  failed: "No money left your account. If your bank shows a debit, it is reversed automatically, usually within 48 hours.",
};

export default function PaymentSuccess() {
  const router = useRouter();
  const [r, setR] = useState<Receipt | null>(getReceipt());
  const pop = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(0)).current;
  useStatusBar('light');

  useEffect(() => {
    if (!r) {
      router.replace('/(tabs)');
      return;
    }
    Animated.sequence([
      Animated.spring(pop, { toValue: 1, friction: 5, tension: 90, useNativeDriver: NATIVE }),
      Animated.timing(rise, { toValue: 1, duration: 380, easing: Easing.out(Easing.cubic), useNativeDriver: NATIVE }),
    ]).start();
  }, [r, router, pop, rise]);

  // Pending: keep asking for the final answer for about a minute.
  useEffect(() => {
    if (!r || r.status !== 'pending' || !r.txnId) return;
    let tries = 0;
    const id = setInterval(async () => {
      tries++;
      try {
        const latest = await getPaymentStatus(r.txnId);
        if (latest.status !== 'pending') {
          setR({ ...r, status: latest.status, reason: latest.reason, coins: latest.coins_earned ?? r.coins, ref: latest.rail_ref || r.ref });
          clearInterval(id);
        }
      } catch {
        // offline or server busy: try again on the next tick
      }
      if (tries >= 20) clearInterval(id);
    }, 3000);
    return () => clearInterval(id);
  }, [r]);

  if (!r) return null;
  const state = STATE[r.status] ?? STATE.success;
  const ok = r.status === 'success';
  const when = new Date(r.at);
  const reward = r.reward;
  const quests = reward?.quests_completed ?? [];
  const badges = reward?.new_achievements ?? [];
  const totalCoins = r.coins + (reward?.coins_earned ?? 0);

  const share = () =>
    Share.share({
      message: `${state.title}: ₹${r.amount.toLocaleString('en-IN')} to ${r.name} (${r.upi}) on ${when.toLocaleString('en-IN')}. Ref ${r.ref}.`,
    }).catch(() => {});

  const rest = { opacity: rise, transform: [{ translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] };

  return (
    <View style={[styles.root, { backgroundColor: state.bg }]} testID={`receipt-${r.status}`}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.top}>
          <Animated.View style={[styles.check, { transform: [{ scale: pop }] }]}>
            <Feather name={state.icon} size={40} color={state.bg} />
          </Animated.View>
          <Text style={styles.paid} accessibilityRole="header">
            {state.title}
          </Text>
          <Amount value={r.amount} display size={60} color="#FFFFFF" testID="paid-amount" />
          <Text style={styles.to}>to {r.name}</Text>
          <Text style={styles.meta}>
            {when.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}, {when.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}
          </Text>
          {!ok && (
            <Text style={styles.explain} accessibilityLiveRegion="polite">
              {r.reason && r.status === 'failed' ? `${r.reason}. ` : ''}
              {EXPLAIN[r.status]}
            </Text>
          )}
        </View>

        <Animated.View style={[styles.sheet, rest]}>
          {ok && (totalCoins > 0 || quests.length || badges.length) ? (
            <>
              <View style={styles.rewardRow}>
                <Coin size={26} />
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={styles.rewardTitle}>
                    +{totalCoins} coins{reward?.xp_earned ? `  ·  +${reward.xp_earned} XP` : ''}
                  </Text>
                  {[...quests.map((q) => `Quest done: ${q.title}`), ...badges.map((b) => `New badge: ${b.name}`)].map((t) => (
                    <Small key={t} style={{ marginTop: 2 }}>
                      {t}
                    </Small>
                  ))}
                  {reward?.leveled_up ? <Small color={C.goldDeep}>You reached level {reward.level}</Small> : null}
                </View>
              </View>
              <Divider />
            </>
          ) : null}
          <View style={styles.detail}>
            <Label>To</Label>
            <Text style={styles.detailVal} numberOfLines={1}>{r.upi}</Text>
          </View>
          {r.from ? (
            <View style={styles.detail}>
              <Label>From</Label>
              <Text style={styles.detailVal}>{r.from}</Text>
            </View>
          ) : null}
          {r.note ? (
            <View style={styles.detail}>
              <Label>Note</Label>
              <Text style={styles.detailVal}>{r.note}</Text>
            </View>
          ) : null}
          <View style={styles.detail}>
            <Label>{r.status === 'success' ? 'UPI ref' : 'Reference'}</Label>
            <Text style={styles.detailVal} selectable>
              {r.ref}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
            {r.status === 'failed' ? (
              <Button
                label="Try again"
                kind="secondary"
                icon="rotate-ccw"
                style={{ flex: 1 }}
                onPress={() => router.replace({ pathname: '/pay/amount', params: { to: r.upi, name: r.name } })}
              />
            ) : (
              <Button label="Share" kind="secondary" icon="share" style={{ flex: 1 }} onPress={share} />
            )}
            <Button label="Done" style={{ flex: 1 }} onPress={() => router.replace('/(tabs)')} testID="done-btn" />
          </View>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = themed(() => StyleSheet.create({
  root: { flex: 1 },
  top: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: GUTTER },
  check: { width: 84, height: 84, borderRadius: 42, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  paid: { fontFamily: F.medium, fontSize: 16, color: '#BFE3D2' },
  to: { fontFamily: F.semibold, fontSize: 18, color: '#FFFFFF', marginTop: 4 },
  explain: { fontFamily: F.regular, fontSize: 14, lineHeight: 20, color: '#FFFFFF', opacity: 0.85, textAlign: 'center', marginTop: 14, maxWidth: 320 },
  meta: { fontFamily: F.regular, fontSize: 14, color: '#BFE3D2', marginTop: 6 },
  sheet: { backgroundColor: C.paper, marginHorizontal: 12, marginBottom: 12, borderRadius: R.lg, padding: 20 },
  rewardRow: { flexDirection: 'row', alignItems: 'center', paddingBottom: 14 },
  rewardTitle: { fontFamily: F.semibold, fontSize: 16, color: C.ink, fontVariant: ['tabular-nums'] },
  detail: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, gap: 16 },
  detailVal: { fontFamily: F.medium, fontSize: 14, color: C.ink, flexShrink: 1, textAlign: 'right' },
}));
