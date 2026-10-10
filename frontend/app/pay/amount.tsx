import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { errorMessage, getUPILinkedAccounts, requestMoneyUPI, sendMoneyUPI } from '../../src/services/api';
import { setReceipt } from '../../src/services/receipt';
import { useUserData } from '../../src/game/useData';
import { useGame } from '../../src/game/GameContext';
import { Alert } from '../../src/ui/dialog';
import { Avatar, Button, haptic, IconButton, NATIVE, NO_OUTLINE, Row, Sheet, Small, Strong, useStatusBar } from '../../src/ui/kit';
import { SwipeToPay } from '../../src/ui/SwipeToPay';
import { C, F, GUTTER, R } from '../../src/ui/theme';

const MAX = 100000;
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'del'];

type Account = { id: string; bank: string; account_number: string; is_primary: boolean; balance: number };

export default function AmountScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ to: string; name?: string; am?: string; tn?: string; mode?: string }>();
  const request = params.mode === 'request';
  const fixedAmount = !!params.am; // merchant QR with a set amount
  const [amount, setAmount] = useState(params.am ?? '');
  const [note, setNote] = useState(params.tn ?? '');
  const [editingNote, setEditingNote] = useState(false);
  const [source, setSource] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState(false);
  const shake = useRef(new Animated.Value(0)).current;
  const { refresh } = useGame();
  useStatusBar('dark');
  const { data, userId } = useUserData((id) => getUPILinkedAccounts(id));

  const accounts: Account[] = data?.linked_accounts ?? [];
  const account = accounts.find((a) => a.id === source) ?? accounts.find((a) => a.is_primary) ?? accounts[0];
  const value = Number(amount || 0);
  const name = params.name || params.to?.split('@')[0] || '';
  const valid = value >= 1 && value <= MAX;

  useEffect(() => {
    if (!params.to) router.replace('/pay');
  }, [params.to, router]);

  const nudge = () => {
    haptic('medium');
    Animated.sequence(
      [8, -8, 5, -5, 0].map((v) => Animated.timing(shake, { toValue: v, duration: 50, useNativeDriver: NATIVE })),
    ).start();
  };

  const press = (k: string) => {
    if (fixedAmount) return;
    haptic();
    setAmount((a) => {
      if (k === 'del') return a.slice(0, -1);
      if (k === '.') return a.includes('.') ? a : (a || '0') + '.';
      const [whole, frac] = (a + k).split('.');
      if (frac !== undefined && frac.length > 2) return a;
      const next = (whole.replace(/^0+(?=\d)/, '') || '0') + (frac !== undefined ? `.${frac}` : '');
      if (Number(next) > MAX) {
        nudge();
        return a;
      }
      return next === '0' && k !== '0' ? k : next;
    });
  };

  const submit = useCallback(async () => {
    if (!valid || busy) return;
    setBusy(true);
    try {
      if (request) {
        await requestMoneyUPI(userId, params.to, value, note);
        Alert.alert('Request sent', `We've asked ${name} for ₹${value.toLocaleString('en-IN')}. You'll be notified when they pay.`);
        router.back();
        return;
      }
      const res = await sendMoneyUPI(userId, params.to, value, note, account?.id ?? '');
      setReceipt({
        amount: res.amount,
        name: params.name || params.to,
        upi: params.to,
        ref: res.transaction_id,
        note,
        from: account ? `${account.bank} ··${account.account_number.slice(-4)}` : '',
        at: new Date().toISOString(),
        coins: res.coins_earned,
        reward: res.reward,
      });
      refresh();
      router.replace('/pay/success');
    } catch (e) {
      Alert.alert(request ? 'Request failed' : 'Payment failed', `${errorMessage(e)}\n\nNo money has left your account.`);
    } finally {
      setBusy(false);
    }
  }, [valid, busy, request, userId, params.to, params.name, value, note, name, router, account, refresh]);

  const fontSize = amount.length > 7 ? 52 : amount.length > 5 ? 62 : 72;

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.top}>
        <IconButton icon="x" label="Cancel" onPress={() => router.back()} />
        <Small>{request ? 'Requesting from' : 'Paying'}</Small>
        <View style={{ width: 42 }} />
      </View>

      <View style={styles.payee}>
        <Avatar name={name} size={60} />
        <Strong style={{ marginTop: 10, fontSize: 18 }} numberOfLines={1}>
          {params.name || name}
        </Strong>
        <View style={[styles.row, { marginTop: 3 }]}>
          <Feather name="check-circle" size={12} color={C.green} />
          <Small style={{ marginLeft: 5 }}>{params.to}</Small>
        </View>
      </View>

      <Animated.View style={[styles.amountWrap, { transform: [{ translateX: shake }] }]} accessible accessibilityLabel={`Amount ${value || 0} rupees`} testID="amount-display">
        <Text style={[styles.rupee, { fontSize: fontSize * 0.5 }]}>₹</Text>
        <Text style={[styles.amount, { fontSize, color: amount ? C.ink : C.lineStrong }]}>{amount ? Number(amount.split('.')[0]).toLocaleString('en-IN') + (amount.includes('.') ? '.' + (amount.split('.')[1] ?? '') : '') : '0'}</Text>
      </Animated.View>
      {fixedAmount ? (
        <Small center>Amount set by the merchant</Small>
      ) : null}

      <View style={{ alignItems: 'center', marginTop: 12 }}>
        {editingNote ? (
          <TextInput
            autoFocus
            value={note}
            onChangeText={setNote}
            onBlur={() => setEditingNote(false)}
            placeholder="What's it for?"
            placeholderTextColor={C.ink3}
            maxLength={50}
            style={styles.noteInput}
          />
        ) : (
          <Pressable onPress={() => setEditingNote(true)} style={styles.note} accessibilityRole="button" accessibilityLabel={note ? `Note: ${note}. Edit` : 'Add a note'}>
            <Feather name={note ? 'edit-3' : 'plus'} size={13} color={C.ink2} />
            <Text style={styles.noteText} numberOfLines={1}>
              {note || 'Add a note'}
            </Text>
          </Pressable>
        )}
      </View>

      <View style={{ flex: 1 }} />

      {!fixedAmount && (
        <View style={styles.keypad}>
          {KEYS.map((k) => (
            <Pressable
              key={k}
              onPress={() => press(k)}
              onLongPress={k === 'del' ? () => setAmount('') : undefined}
              style={({ pressed }) => [styles.key, pressed && { backgroundColor: C.paperDeep }]}
              accessibilityRole="button"
              accessibilityLabel={k === 'del' ? 'Delete' : k === '.' ? 'Decimal point' : k}
            >
              {k === 'del' ? <Feather name="delete" size={22} color={C.ink} /> : <Text style={styles.keyText}>{k}</Text>}
            </Pressable>
          ))}
        </View>
      )}

      <View style={styles.bottom}>
        {!request && account && (
          <Pressable onPress={() => setPicking(true)} style={styles.from} accessibilityRole="button" accessibilityLabel={`Pay from ${account.bank}. Change`} testID="pay-from">
            <View style={styles.bankDot}>
              <Feather name="credit-card" size={14} color={C.ink} />
            </View>
            <Text style={styles.fromText} numberOfLines={1}>
              {account.bank} ··{account.account_number.slice(-4)}
            </Text>
            <Text style={styles.change}>Change</Text>
          </Pressable>
        )}
        {request ? (
          <Button label={value ? `Request ₹${value.toLocaleString('en-IN')}` : 'Enter an amount'} disabled={!valid} loading={busy} onPress={submit} testID="request-btn" />
        ) : (
          <SwipeToPay label={value ? `Swipe to pay ₹${value.toLocaleString('en-IN')}` : 'Enter an amount'} disabled={!valid} busy={busy} onComplete={submit} testID="swipe-pay" />
        )}
      </View>

      <Sheet visible={picking} onClose={() => setPicking(false)} title="Pay from">
        {accounts.map((a) => {
          const on = a.id === account?.id;
          return (
            <Row
              key={a.id}
              left={<View style={styles.bankDot}><Feather name="credit-card" size={14} color={C.ink} /></View>}
              title={`${a.bank} ··${a.account_number.slice(-4)}`}
              subtitle={a.is_primary ? 'Primary · balance hidden' : 'Balance hidden'}
              right={<Feather name={on ? 'check-circle' : 'circle'} size={20} color={on ? C.green : C.lineStrong} />}
              onPress={() => {
                setSource(a.id);
                setPicking(false);
              }}
            />
          );
        })}
        <Small style={{ marginTop: 10 }}>Your balance is checked by the bank when you pay. We never store your UPI PIN.</Small>
      </Sheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.paper },
  row: { flexDirection: 'row', alignItems: 'center' },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: GUTTER, paddingTop: 6 },
  payee: { alignItems: 'center', marginTop: 10, paddingHorizontal: GUTTER },
  amountWrap: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center', marginTop: 18 },
  rupee: { fontFamily: F.display, color: C.ink2, marginTop: 10, marginRight: 4 },
  amount: { fontFamily: F.display, letterSpacing: -1, fontVariant: ['tabular-nums'] },
  note: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 34, paddingHorizontal: 14, borderRadius: R.pill, backgroundColor: C.paperDeep, maxWidth: 260 },
  noteText: { fontFamily: F.medium, fontSize: 14, color: C.ink2 },
  noteInput: { minWidth: 200, height: 36, textAlign: 'center', fontFamily: F.medium, fontSize: 15, color: C.ink, borderBottomWidth: 1, borderColor: C.lineStrong, ...NO_OUTLINE },
  keypad: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: GUTTER - 6 },
  key: { width: '33.33%', height: 58, alignItems: 'center', justifyContent: 'center', borderRadius: R.sm },
  keyText: { fontFamily: F.medium, fontSize: 26, color: C.ink, fontVariant: ['tabular-nums'] },
  bottom: { paddingHorizontal: GUTTER, paddingTop: 10, paddingBottom: 8, gap: 12 },
  from: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  bankDot: { width: 30, height: 30, borderRadius: 15, backgroundColor: C.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: C.lineStrong, alignItems: 'center', justifyContent: 'center' },
  fromText: { flex: 1, fontFamily: F.semibold, fontSize: 15, color: C.ink },
  change: { fontFamily: F.semibold, fontSize: 14, color: C.blue },
});
