import React, { useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { Alert } from '../../src/game/dialog';
import * as Haptics from 'expo-haptics';
import {
  errorMessage,
  getRecentPayees,
  getUPIHistory,
  getUPILinkedAccounts,
  requestMoneyUPI,
  sendMoneyUPI,
} from '../../src/services/api';
import { useGame } from '../../src/game/GameContext';
import { useUserData } from '../../src/game/useData';
import { BORDER, C } from '../../src/game/theme';
import { Body, Box, Chip, Loading, PixelButton, PixelInput, PText, Screen, SectionTitle, Sprite, tap } from '../../src/game/ui';
import { formatCurrency, formatDate } from '../../src/utils/format';

type Payee = { id: string; name: string; upi_id: string; avatar: string; last_paid: string };
type Account = { id: string; bank: string; account_number: string; is_primary: boolean; balance: number };

const AVATAR_COLORS = [C.red, C.blue, C.pipe, C.purple, C.orange, C.cyan];
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0', '<'];
const MAX = 100000;
const HOLD_MS = 1100;

/** Press-and-hold "power meter" that only fires once fully charged. */
function HoldToPay({ label, disabled, onComplete }: { label: string; disabled?: boolean; onComplete: () => void }) {
  const charge = useRef(new Animated.Value(0)).current;
  const anim = useRef<Animated.CompositeAnimation | null>(null);

  const start = () => {
    if (disabled) return;
    tap(Haptics.ImpactFeedbackStyle.Light);
    anim.current = Animated.timing(charge, { toValue: 1, duration: HOLD_MS, easing: Easing.linear, useNativeDriver: false });
    anim.current.start(({ finished }) => {
      if (finished) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        charge.setValue(0);
        onComplete();
      }
    });
  };
  const cancel = () => {
    anim.current?.stop();
    Animated.timing(charge, { toValue: 0, duration: 150, useNativeDriver: false }).start();
  };
  const width = charge.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <Pressable
      onPressIn={start}
      onPressOut={cancel}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint="Press and hold to confirm"
      onAccessibilityAction={onComplete}
      testID="hold-to-pay"
      style={[styles.hold, disabled && { backgroundColor: C.gray }]}
    >
      <Animated.View style={[styles.holdFill, { width }]} />
      <View style={styles.holdContent}>
        <Sprite name="star" scale={2.5} />
        <PText size={11} color={disabled ? C.grayDark : C.white} shadow={disabled ? false : C.ink} style={{ marginLeft: 10 }}>
          {label}
        </PText>
      </View>
    </Pressable>
  );
}

export default function PayScreen() {
  const { celebrate } = useGame();
  const { data, loading, refreshing, refresh, userId } = useUserData(async (id) => {
    const [accounts, payees, history] = await Promise.all([getUPILinkedAccounts(id), getRecentPayees(id), getUPIHistory(id)]);
    return { accounts, payees: payees as Payee[], history: history as any[] };
  });

  const [mode, setMode] = useState<'send' | 'request'>('send');
  const [upi, setUpi] = useState('');
  const [payee, setPayee] = useState<Payee | null>(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [source, setSource] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState<any>(null);

  if (loading || !data) return <Loading label="WARMING UP PIPES" />;

  const accounts: Account[] = data.accounts.linked_accounts;
  const sourceId = source ?? accounts.find((a) => a.is_primary)?.id ?? accounts[0]?.id;
  const recipient = payee?.upi_id ?? upi.trim();
  const value = Number(amount || 0);
  const validRecipient = /^[\w.\-]{2,}@[a-zA-Z]{2,}$/.test(recipient);
  const ready = validRecipient && value >= 1 && value <= MAX && !busy;

  const press = (k: string) => {
    tap();
    setAmount((a) => {
      if (k === '<') return a.slice(0, -1);
      const next = (a + k).replace(/^0+/, '');
      return Number(next) > MAX ? a : next;
    });
  };

  const reset = () => {
    setAmount('');
    setNote('');
    setPayee(null);
    setUpi('');
  };

  const submit = async () => {
    if (!ready) return;
    setBusy(true);
    try {
      if (mode === 'send') {
        const res = await sendMoneyUPI(userId, recipient, value, note, sourceId);
        setReceipt({ ...res, to: payee?.name ?? recipient });
        celebrate('COURSE CLEAR!', res.reward, res.coins_earned);
      } else {
        await requestMoneyUPI(userId, recipient, value, note);
        Alert.alert('Request sent!', `${formatCurrency(value)} requested from ${payee?.name ?? recipient}.`);
        setReceipt(null);
      }
      reset();
      refresh();
    } catch (e) {
      Alert.alert('Payment failed', errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen title="WARP PAY" subtitle={`UPI ID: ${data.accounts.upi_id}`} back={false} refreshing={refreshing} onRefresh={refresh}>
      <View style={styles.modeRow}>
        <Chip label="Send" active={mode === 'send'} onPress={() => setMode('send')} />
        <Chip label="Request" active={mode === 'request'} onPress={() => setMode('request')} color={C.cyan} />
      </View>

      {receipt && (
        <Box color="#D7F5B0" style={{ marginTop: 14 }}>
          <View style={styles.between}>
            <PText size={9} color={C.pipeDark}>
              PAID ✓
            </PText>
            <Pressable onPress={() => setReceipt(null)} accessibilityLabel="Dismiss receipt" hitSlop={10}>
              <PText size={9}>X</PText>
            </Pressable>
          </View>
          <PText size={18} style={{ marginTop: 10 }}>
            {formatCurrency(receipt.amount)}
          </PText>
          <Body style={{ marginTop: 6 }}>to {receipt.to}</Body>
          <PText size={7} color={C.textMuted} style={{ marginTop: 8 }}>
            REF {receipt.transaction_id} • +{receipt.coins_earned} COINS
          </PText>
        </Box>
      )}

      <SectionTitle>{mode === 'send' ? 'PAY WHO?' : 'REQUEST FROM?'}</SectionTitle>
      <View style={styles.payees}>
        {data.payees.map((p, i) => {
          const active = payee?.id === p.id;
          return (
            <Pressable
              key={p.id}
              onPress={() => {
                tap();
                setPayee(active ? null : p);
                setUpi('');
              }}
              style={styles.payee}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={p.name}
            >
              <View style={[styles.avatar, { backgroundColor: AVATAR_COLORS[i % AVATAR_COLORS.length] }, active && styles.avatarActive]}>
                <PText size={16} color={C.white} shadow={C.ink}>
                  {p.avatar}
                </PText>
              </View>
              <PText size={6} color={C.white} shadow={C.ink} center numberOfLines={1} style={{ marginTop: 6 }}>
                {p.name.split(' ')[0].toUpperCase()}
              </PText>
            </Pressable>
          );
        })}
      </View>

      <Box style={{ marginTop: 12 }}>
        {payee ? (
          <View style={styles.between}>
            <View>
              <PText size={10}>{payee.name.toUpperCase()}</PText>
              <Body size={13} style={{ marginTop: 4 }}>
                {payee.upi_id} • last {payee.last_paid}
              </Body>
            </View>
            <Pressable onPress={() => setPayee(null)} accessibilityLabel="Clear payee" hitSlop={10}>
              <PText size={9} color={C.red}>
                CHANGE
              </PText>
            </Pressable>
          </View>
        ) : (
          <PixelInput label="or enter UPI ID" placeholder="name@bank" autoCapitalize="none" autoCorrect={false} value={upi} onChangeText={setUpi} testID="upi-input" />
        )}

        <View style={styles.amountBox}>
          <PText size={10} color={C.textMuted}>
            ₹
          </PText>
          <PText size={30} color={value ? C.text : C.gray} style={{ marginLeft: 8 }} testID="amount-display">
            {value ? value.toLocaleString('en-IN') : '0'}
          </PText>
        </View>
        <View style={styles.quick}>
          {[100, 500, 1000, 2000].map((v) => (
            <Chip key={v} label={`+${v}`} onPress={() => setAmount(String(Math.min(MAX, value + v)))} />
          ))}
        </View>
        <View style={styles.keypad}>
          {KEYS.map((k) => (
            <Pressable key={k} onPress={() => press(k)} style={({ pressed }) => [styles.key, pressed && styles.keyPressed]} accessibilityRole="button" accessibilityLabel={k === '<' ? 'Delete' : k}>
              <PText size={14}>{k === '<' ? '←' : k}</PText>
            </Pressable>
          ))}
        </View>

        <PixelInput label="Note (optional)" placeholder="Pizza night" value={note} onChangeText={setNote} maxLength={50} />

        {mode === 'send' && (
          <>
            <PText size={8} style={{ marginBottom: 8 }}>
              PAY FROM
            </PText>
            {accounts.map((a) => {
              const active = a.id === sourceId;
              return (
                <Pressable key={a.id} onPress={() => setSource(a.id)} style={[styles.account, active && styles.accountActive]} accessibilityRole="radio" accessibilityState={{ checked: active }}>
                  <Sprite name="bank" scale={2} />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <PText size={8}>{a.bank.toUpperCase()}</PText>
                    <Body size={12} style={{ marginTop: 3 }}>
                      {a.account_number} • {formatCurrency(a.balance)}
                    </Body>
                  </View>
                  <View style={[styles.radio, active && { backgroundColor: C.pipe }]} />
                </Pressable>
              );
            })}
          </>
        )}

        <View style={{ marginTop: 16 }}>
          {mode === 'send' ? (
            <HoldToPay label={busy ? 'SENDING...' : `HOLD TO PAY ${value ? formatCurrency(value) : ''}`} disabled={!ready} onComplete={submit} />
          ) : (
            <PixelButton label="SEND REQUEST" color={C.blue} disabled={!ready} loading={busy} onPress={submit} />
          )}
          {mode === 'send' && (
            <Body size={12} style={{ marginTop: 8 }} center>
              Earn 1 coin per ₹50 • Daily limit {formatCurrency(data.accounts.daily_limit)}
            </Body>
          )}
        </View>
      </Box>

      <SectionTitle>RECENT WARPS</SectionTitle>
      <Box padding={10}>
        {data.history.slice(0, 8).map((t, i) => {
          const sent = t.type === 'sent' || t.type === 'upi_send';
          return (
            <View key={t.id || i} style={[styles.between, styles.histRow]}>
              <View style={styles.row}>
                <Sprite name={sent ? 'pipe' : 'coin'} scale={2} />
                <View style={{ marginLeft: 10 }}>
                  <Body bold color={C.text}>
                    {sent ? t.to || t.recipient : t.from}
                  </Body>
                  <PText size={6} color={C.textMuted} style={{ marginTop: 3 }}>
                    {formatDate(t.timestamp).toUpperCase()}
                  </PText>
                </View>
              </View>
              <PText size={9} color={sent ? C.red : C.pipe}>
                {sent ? '-' : '+'}
                {formatCurrency(t.amount)}
              </PText>
            </View>
          );
        })}
      </Box>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modeRow: { flexDirection: 'row' },
  payees: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  payee: { width: '15%', minWidth: 50, alignItems: 'center' },
  avatar: { width: 50, height: 50, borderWidth: BORDER, borderColor: C.ink, alignItems: 'center', justifyContent: 'center' },
  avatarActive: { borderColor: C.coin, borderWidth: 5, transform: [{ translateY: -4 }] },
  amountBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderWidth: BORDER, borderColor: C.ink, backgroundColor: C.white, marginBottom: 10 },
  quick: { flexDirection: 'row', marginBottom: 10 },
  keypad: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 8, marginBottom: 16 },
  key: { width: '31.5%', height: 52, backgroundColor: C.paperDark, borderWidth: BORDER, borderColor: C.ink, borderBottomWidth: BORDER + 3, alignItems: 'center', justifyContent: 'center' },
  keyPressed: { borderBottomWidth: BORDER, transform: [{ translateY: 3 }], backgroundColor: C.block },
  account: { flexDirection: 'row', alignItems: 'center', padding: 10, borderWidth: BORDER, borderColor: C.ink, backgroundColor: C.white, marginBottom: 8 },
  accountActive: { backgroundColor: '#E5F8D0' },
  radio: { width: 18, height: 18, borderWidth: BORDER, borderColor: C.ink, backgroundColor: C.white },
  hold: { height: 60, backgroundColor: C.red, borderWidth: BORDER, borderColor: C.ink, overflow: 'hidden', justifyContent: 'center' },
  holdFill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: C.coin },
  holdContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  histRow: { paddingVertical: 10, borderBottomWidth: 2, borderColor: C.paperDark },
});
