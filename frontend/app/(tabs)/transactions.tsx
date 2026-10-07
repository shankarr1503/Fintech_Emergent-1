import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Alert } from '../../src/game/dialog';
import { errorMessage, getTransactions, mockBankSync } from '../../src/services/api';
import { useUserData } from '../../src/game/useData';
import { TxnRow } from '../../src/game/pieces';
import { BORDER, C } from '../../src/game/theme';
import { Body, Box, Chip, EmptyState, Loading, PixelButton, PText, Screen, Sprite, Stat } from '../../src/game/ui';
import { formatCompact, formatDate } from '../../src/utils/format';

const CATEGORIES = ['all', 'food', 'transport', 'shopping', 'utilities', 'entertainment', 'health', 'subscription', 'emi', 'salary'];

export default function LedgerScreen() {
  const [category, setCategory] = useState('all');
  const [syncing, setSyncing] = useState(false);
  const { data, loading, refreshing, refresh, reload, userId } = useUserData(
    (id) => getTransactions(id, 200, category === 'all' ? undefined : category),
    [category],
  );

  const { sections, totalIn, totalOut } = useMemo(() => {
    const groups: Record<string, any[]> = {};
    let inSum = 0;
    let outSum = 0;
    for (const t of (data as any[]) ?? []) {
      const key = formatDate(t.date);
      (groups[key] ||= []).push(t);
      if (t.type === 'credit') inSum += t.amount;
      else outSum += t.amount;
    }
    return { sections: Object.entries(groups), totalIn: inSum, totalOut: outSum };
  }, [data]);

  const sync = async () => {
    setSyncing(true);
    try {
      const res = await mockBankSync(userId);
      Alert.alert('Synced!', `${res.synced?.transactions ?? 0} new transactions pulled from your banks (demo).`);
      reload();
    } catch (e) {
      Alert.alert('Sync failed', errorMessage(e));
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Screen
      title="ADVENTURE LOG"
      subtitle="EVERY COIN IN AND OUT"
      back={false}
      refreshing={refreshing}
      onRefresh={refresh}
      right={
        <Pressable onPress={sync} disabled={syncing} accessibilityRole="button" accessibilityLabel="Sync bank transactions" style={styles.syncBtn}>
          <Sprite name="pipe" scale={2} />
        </Pressable>
      }
    >
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
        {CATEGORIES.map((c) => (
          <Chip key={c} label={c} active={category === c} onPress={() => setCategory(c)} />
        ))}
      </ScrollView>

      {loading ? (
        <View style={{ height: 300 }}>
          <Loading label="READING SCROLLS" />
        </View>
      ) : sections.length === 0 ? (
        <EmptyState
          sprite="scroll"
          title="NOTHING HERE YET"
          body="Pull fresh transactions from your linked banks."
          action={<PixelButton label="SYNC BANKS" sprite="pipe" color={C.pipe} onPress={sync} loading={syncing} />}
        />
      ) : (
        <>
          <Box color={C.paper}>
            <View style={styles.between}>
              <Stat label="Coins in" value={formatCompact(totalIn)} color={C.pipe} />
              <Stat label="Coins out" value={formatCompact(totalOut)} color={C.red} align="center" />
              <Stat label="Entries" value={String((data as any[]).length)} align="right" />
            </View>
          </Box>
          {sections.map(([date, items]) => (
            <View key={date} style={{ marginTop: 16 }}>
              <PText size={8} color={C.white} shadow={C.ink} style={{ marginBottom: 8 }}>
                {date.toUpperCase()}
              </PText>
              <Box padding={10}>
                {items.map((t, i) => (
                  <TxnRow key={t.id || i} txn={t} last={i === items.length - 1} />
                ))}
              </Box>
            </View>
          ))}
          <Body size={12} color={C.white} center style={{ marginTop: 18 }}>
            Tap the pipe to sync new transactions.
          </Body>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  syncBtn: { width: 42, height: 42, backgroundColor: C.paper, borderWidth: BORDER, borderColor: C.ink, alignItems: 'center', justifyContent: 'center' },
});
