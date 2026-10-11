import React, { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { addCategory, errorMessage, getCategories, getTransactions, mockBankSync, recategorize } from '../src/services/api';
import { useUserData } from '../src/game/useData';
import { useDemo } from '../src/services/appConfig';
import { Alert } from '../src/ui/dialog';
import { categoryLabel, TxnRow } from '../src/ui/rows';
import { Amount, Button, Card, Chip, Divider, Empty, Field, IconButton, Label, Screen, Sheet, SkeletonScreen, Small, Strong, Toggle } from '../src/ui/kit';
import { C, GUTTER } from '../src/ui/theme';

const FILTERS = ['all', 'food', 'transport', 'shopping', 'utilities', 'subscription', 'emi', 'health', 'entertainment', 'salary'];
type Cat = { id: string; name: string };

function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const y = new Date();
  y.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === y.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

export default function Activity() {
  const demo = useDemo();
  const [filter, setFilter] = useState('all');
  const [syncing, setSyncing] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [allFromMerchant, setAllFromMerchant] = useState(false);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);
  const { data, loading, refreshing, refresh, reload, userId } = useUserData((id) => getTransactions(id, 200, filter === 'all' ? undefined : filter), [filter]);
  const cats = useUserData((id) => getCategories(id));
  const custom: Cat[] = cats.data?.custom ?? [];
  const nameOf = (c: string) => (c === 'all' ? 'All' : custom.find((x) => x.id === c)?.name ?? (c === 'emi' ? 'EMIs' : categoryLabel(c)));
  const choices: Cat[] = [...(cats.data?.default ?? []).map((id: string) => ({ id, name: nameOf(id) })), ...custom];

  const choose = async (category: string) => {
    if (!editing || category === editing.category) return setEditing(null);
    setSaving(true);
    try {
      await recategorize(editing.id, category, allFromMerchant);
      setEditing(null);
      reload();
    } catch (e) {
      Alert.alert("Couldn't change category", errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const create = async () => {
    setSaving(true);
    try {
      const c = await addCategory(userId, newName);
      setNewName('');
      cats.reload();
      await choose(c.id);
    } catch (e) {
      Alert.alert("Couldn't add category", errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const groups = useMemo(() => {
    const out: { day: string; items: any[]; out: number }[] = [];
    for (const t of (data as any[]) ?? []) {
      const day = dayLabel(t.date);
      let g = out[out.length - 1];
      if (!g || g.day !== day) out.push((g = { day, items: [], out: 0 }));
      g.items.push(t);
      if (t.type === 'debit') g.out += t.amount;
    }
    return out;
  }, [data]);

  const sync = async () => {
    setSyncing(true);
    try {
      const res = await mockBankSync(userId);
      Alert.alert('Sample data added', `${res.synced?.transactions ?? 0} sample transactions were added so you can try things out.`);
      reload();
    } catch (e) {
      Alert.alert("Couldn't sync", errorMessage(e));
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Screen title="Activity" right={demo ? <IconButton icon={syncing ? 'loader' : 'plus'} label="Add sample transactions" onPress={sync} /> : undefined} refreshing={refreshing} onRefresh={refresh}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -GUTTER, marginTop: 14 }} contentContainerStyle={{ paddingHorizontal: GUTTER }}>
        {[...FILTERS, ...custom.map((c) => c.id)].map((f) => (
          <Chip key={f} label={nameOf(f)} active={filter === f} onPress={() => setFilter(f)} />
        ))}
      </ScrollView>

      {loading ? (
        <SkeletonScreen />
      ) : groups.length === 0 ? (
        <Empty icon="inbox" title="Nothing here yet" body={filter === 'all' ? 'Link a bank or sync to see your transactions.' : `No ${nameOf(filter).toLowerCase()} spends in this period.`} />
      ) : (
        groups.map((g) => (
          <View key={g.day} style={{ marginTop: 24 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <Label>{g.day}</Label>
              {g.out > 0 ? <Small>Spent <Amount value={Math.round(g.out)} size={13} color={C.ink3} /></Small> : null}
            </View>
            <Card padded={false} style={{ paddingHorizontal: 16 }}>
              {g.items.map((t, i) => (
                <View key={t.id || i}>
                  {i > 0 && <Divider inset={54} />}
                  <TxnRow txn={t} categoryName={nameOf(t.category)} onPress={t.id ? () => setEditing(t) : undefined} />
                </View>
              ))}
            </Card>
          </View>
        ))
      )}
      {!loading && groups.length > 0 && <Small style={{ marginTop: 18 }}>Tap a transaction to change its category.</Small>}

      <Sheet visible={!!editing} onClose={() => setEditing(null)} title="Category">
        {editing && (
          <>
            <Strong>{editing.merchant}</Strong>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 12, rowGap: 8 }}>
              {choices.map((c) => (
                <Chip key={c.id} label={c.name} active={editing.category === c.id} onPress={() => !saving && choose(c.id)} />
              ))}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18 }}>
              <Small color={C.ink2} style={{ flex: 1, marginRight: 12 }}>
                Use this for every payment to {editing.merchant}
              </Small>
              <Toggle value={allFromMerchant} onChange={setAllFromMerchant} label={`Use this for every payment to ${editing.merchant}`} />
            </View>
            <View style={{ marginVertical: 18 }}>
              <Divider />
            </View>
            <Field label="Or make your own" placeholder="e.g. Pet care" value={newName} onChangeText={setNewName} maxLength={24} testID="new-category" />
            <Button label="Add and use" kind="secondary" disabled={newName.trim().length < 2} loading={saving} onPress={create} />
          </>
        )}
      </Sheet>
    </Screen>
  );
}
