import React, { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { errorMessage, getTransactions, mockBankSync } from '../src/services/api';
import { useUserData } from '../src/game/useData';
import { Alert } from '../src/ui/dialog';
import { TxnRow } from '../src/ui/rows';
import { Amount, Card, Chip, Divider, Empty, IconButton, Label, Screen, SkeletonScreen, Small } from '../src/ui/kit';
import { C, GUTTER } from '../src/ui/theme';

const FILTERS = ['all', 'food', 'transport', 'shopping', 'utilities', 'subscription', 'emi', 'health', 'entertainment', 'salary'];
const label = (c: string) => (c === 'all' ? 'All' : c === 'emi' ? 'EMIs' : c.charAt(0).toUpperCase() + c.slice(1));

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
  const [filter, setFilter] = useState('all');
  const [syncing, setSyncing] = useState(false);
  const { data, loading, refreshing, refresh, reload, userId } = useUserData((id) => getTransactions(id, 200, filter === 'all' ? undefined : filter), [filter]);

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
      Alert.alert('Up to date', `${res.synced?.transactions ?? 0} new transactions from your banks.`);
      reload();
    } catch (e) {
      Alert.alert("Couldn't sync", errorMessage(e));
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Screen title="Activity" right={<IconButton icon={syncing ? 'loader' : 'refresh-cw'} label="Sync with banks" onPress={sync} />} refreshing={refreshing} onRefresh={refresh}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -GUTTER, marginTop: 14 }} contentContainerStyle={{ paddingHorizontal: GUTTER }}>
        {FILTERS.map((f) => (
          <Chip key={f} label={label(f)} active={filter === f} onPress={() => setFilter(f)} />
        ))}
      </ScrollView>

      {loading ? (
        <SkeletonScreen />
      ) : groups.length === 0 ? (
        <Empty icon="inbox" title="Nothing here yet" body={filter === 'all' ? 'Link a bank or sync to see your transactions.' : `No ${label(filter).toLowerCase()} spends in this period.`} />
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
                  <TxnRow txn={t} />
                </View>
              ))}
            </Card>
          </View>
        ))
      )}
    </Screen>
  );
}
