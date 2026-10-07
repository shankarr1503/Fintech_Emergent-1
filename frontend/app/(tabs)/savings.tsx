import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Alert } from '../../src/game/dialog';
import { contributeSavings, createSavingsGoal, deleteSavingsGoal, errorMessage, getSavingsGoals, getSavingsSuggestions } from '../../src/services/api';
import { useGame } from '../../src/game/GameContext';
import { useUserData } from '../../src/game/useData';
import { C } from '../../src/game/theme';
import { Body, Box, Chip, EmptyState, Loading, PixelButton, PixelInput, PixelSheet, PText, Screen, SectionTitle, Sprite } from '../../src/game/ui';
import { formatCompact, formatCurrency, formatDate } from '../../src/utils/format';

type Goal = { id: string; name: string; target_amount: number; current_amount: number; monthly_contribution: number; target_date?: string };

const DIFFICULTY: Record<string, { label: string; color: string }> = {
  safe: { label: 'EASY', color: C.pipeLight },
  moderate: { label: 'NORMAL', color: C.coin },
  aggressive: { label: 'HARD', color: C.orange },
};

/** A level-end flagpole: the flag climbs as the goal fills up. */
function Flagpole({ pct }: { pct: number }) {
  const h = 96;
  const clamped = Math.max(0, Math.min(1, pct));
  return (
    <View style={{ width: 40, height: h + 16, alignItems: 'center' }}>
      <View style={styles.poleBall} />
      <View style={[styles.pole, { height: h }]} />
      <View style={[styles.flag, { bottom: 12 + clamped * (h - 24) }]}>
        <Sprite name="star" scale={1.5} />
      </View>
      <View style={styles.poleBase} />
    </View>
  );
}

export default function GoalsScreen() {
  const { celebrate } = useGame();
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', target: '', monthly: '' });
  const [target, setTarget] = useState<Goal | null>(null);
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);

  const { data, loading, refreshing, refresh, reload, userId } = useUserData(async (id) => {
    const [goals, suggestions] = await Promise.all([getSavingsGoals(id), getSavingsSuggestions(id)]);
    return { goals: goals as Goal[], suggestions: suggestions as { type: string; amount: number; description: string }[] };
  });

  if (loading || !data) return <Loading label="BUILDING CASTLES" />;
  const saved = data.goals.reduce((s, g) => s + g.current_amount, 0);
  const goalTotal = data.goals.reduce((s, g) => s + g.target_amount, 0);

  const create = async () => {
    const t = parseFloat(form.target);
    if (!form.name.trim() || !(t > 0)) return Alert.alert('Missing info', 'Give your castle a name and a target amount.');
    setBusy(true);
    try {
      const res = await createSavingsGoal({ user_id: userId, name: form.name.trim(), target_amount: t, monthly_contribution: parseFloat(form.monthly) || 0 });
      setCreating(false);
      setForm({ name: '', target: '', monthly: '' });
      celebrate('NEW CASTLE!', res.reward);
      reload();
    } catch (e) {
      Alert.alert('Could not create', errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const contribute = async () => {
    if (!target) return;
    const a = parseFloat(amount);
    if (!(a > 0)) return Alert.alert('Enter an amount');
    setBusy(true);
    try {
      const res = await contributeSavings(target.id, a);
      setTarget(null);
      setAmount('');
      celebrate(res.completed ? 'CASTLE CLEAR!' : `+${formatCompact(a)} SAVED!`, res.reward);
      reload();
    } catch (e) {
      Alert.alert('Could not save', errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const remove = (g: Goal) =>
    Alert.alert('Demolish castle?', `Delete "${g.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteSavingsGoal(g.id);
            reload();
          } catch (e) {
            Alert.alert('Error', errorMessage(e));
          }
        },
      },
    ]);

  return (
    <Screen
      title="GOAL CASTLES"
      subtitle="SAVE TO RAISE THE FLAG"
      back={false}
      ground
      refreshing={refreshing}
      onRefresh={refresh}
      right={<PixelButton label="+" small color={C.pipe} onPress={() => setCreating(true)} testID="add-goal" />}
    >
      <Box>
        <View style={styles.row}>
          <Sprite name="piggy" scale={4} />
          <View style={{ marginLeft: 14, flex: 1 }}>
            <PText size={8} color={C.textMuted}>
              TOTAL SAVED
            </PText>
            <PText size={18} color={C.pipeDark} style={{ marginTop: 8 }}>
              {formatCurrency(saved)}
            </PText>
            <Body size={12} style={{ marginTop: 4 }}>
              of {formatCurrency(goalTotal)} across {data.goals.length} castles
            </Body>
          </View>
        </View>
      </Box>

      <SectionTitle>YOUR CASTLES</SectionTitle>
      {data.goals.length === 0 ? (
        <EmptyState sprite="castle" title="NO CASTLES YET" body="Create a savings goal and watch the flag rise." action={<PixelButton label="BUILD ONE" color={C.pipe} onPress={() => setCreating(true)} />} />
      ) : (
        data.goals.map((g) => {
          const pct = g.target_amount > 0 ? g.current_amount / g.target_amount : 0;
          const done = pct >= 1;
          const remaining = Math.max(0, g.target_amount - g.current_amount);
          const months = g.monthly_contribution > 0 ? Math.ceil(remaining / g.monthly_contribution) : null;
          return (
            <Box key={g.id} color={done ? '#D7F5B0' : C.paper} style={{ marginBottom: 12 }}>
              <View style={styles.row}>
                <Flagpole pct={pct} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <View style={styles.between}>
                    <PText size={10} numberOfLines={1} style={{ flex: 1 }}>
                      {g.name.toUpperCase()}
                    </PText>
                    <Pressable onPress={() => remove(g)} hitSlop={10} accessibilityLabel={`Delete ${g.name}`}>
                      <PText size={8} color={C.grayDark}>
                        X
                      </PText>
                    </Pressable>
                  </View>
                  <PText size={16} color={C.pipeDark} style={{ marginTop: 10 }}>
                    {Math.min(100, Math.round(pct * 100))}%
                  </PText>
                  <Body size={13} style={{ marginTop: 4 }}>
                    {formatCurrency(g.current_amount)} / {formatCurrency(g.target_amount)}
                  </Body>
                  <PText size={7} color={C.textMuted} style={{ marginTop: 6 }}>
                    {done
                      ? 'CASTLE CLEARED!'
                      : months
                        ? `${months} MO AT ${formatCompact(g.monthly_contribution)}/MO`
                        : g.target_date
                          ? `BY ${formatDate(g.target_date).toUpperCase()}`
                          : `${formatCompact(remaining)} TO GO`}
                  </PText>
                </View>
                <Sprite name="castle" scale={3} />
              </View>
              {!done && (
                <PixelButton
                  label="ADD COINS"
                  sprite="coin"
                  small
                  color={C.pipe}
                  style={{ marginTop: 12 }}
                  onPress={() => {
                    setTarget(g);
                    setAmount(g.monthly_contribution ? String(g.monthly_contribution) : '');
                  }}
                />
              )}
            </Box>
          );
        })
      )}

      {data.suggestions.length > 0 && (
        <>
          <SectionTitle>HOW MUCH TO SAVE?</SectionTitle>
          {data.suggestions.map((s) => {
            const d = DIFFICULTY[s.type] ?? DIFFICULTY.safe;
            return (
              <Box key={s.type} style={{ marginBottom: 10 }} padding={12}>
                <View style={styles.between}>
                  <View style={[styles.diff, { backgroundColor: d.color }]}>
                    <PText size={7}>{d.label}</PText>
                  </View>
                  <PText size={12}>{formatCurrency(s.amount)}/MO</PText>
                </View>
                <Body size={12} style={{ marginTop: 8 }}>
                  {s.description}
                </Body>
              </Box>
            );
          })}
        </>
      )}

      <PixelSheet visible={!!target} onClose={() => setTarget(null)} title="ADD COINS">
        <Body style={{ marginBottom: 12 }}>Move money into {target?.name}.</Body>
        <View style={{ flexDirection: 'row', marginBottom: 12 }}>
          {[500, 1000, 5000].map((v) => (
            <Chip key={v} label={`₹${v}`} active={amount === String(v)} onPress={() => setAmount(String(v))} />
          ))}
        </View>
        <PixelInput label="Amount" prefix="₹" keyboardType="numeric" value={amount} onChangeText={setAmount} />
        <PixelButton label="SAVE IT" sprite="coin" color={C.pipe} loading={busy} onPress={contribute} />
      </PixelSheet>

      <PixelSheet visible={creating} onClose={() => setCreating(false)} title="NEW CASTLE">
        <PixelInput label="Goal name" placeholder="Goa trip" value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} />
        <PixelInput label="Target amount" prefix="₹" keyboardType="numeric" value={form.target} onChangeText={(v) => setForm({ ...form, target: v })} />
        <PixelInput label="Monthly saving (optional)" prefix="₹" keyboardType="numeric" value={form.monthly} onChangeText={(v) => setForm({ ...form, monthly: v })} />
        <PixelButton label="BUILD CASTLE" color={C.pipe} loading={busy} onPress={create} />
      </PixelSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pole: { width: 4, backgroundColor: C.pipeDark },
  poleBall: { width: 10, height: 10, backgroundColor: C.pipe, borderWidth: 2, borderColor: C.ink },
  poleBase: { width: 18, height: 8, backgroundColor: C.brick, borderWidth: 2, borderColor: C.ink },
  flag: { position: 'absolute', left: 22, width: 22, height: 18, backgroundColor: C.white, borderWidth: 2, borderColor: C.ink, alignItems: 'center', justifyContent: 'center' },
  diff: { borderWidth: 2, borderColor: C.ink, paddingHorizontal: 8, paddingVertical: 5 },
});
