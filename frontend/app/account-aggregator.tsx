import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { confirmAAConsent, errorMessage, getAAConsentStatus, getAggregatedData, initiateAAConsent, revokeAAConsent } from '../src/services/api';
import { useGame } from '../src/game/GameContext';
import { useUserData } from '../src/game/useData';
import { Alert } from '../src/ui/dialog';
import { Amount, Body, Button, Card, Divider, IconMark, IconName, Label, Row, Screen, Section, SkeletonScreen, Small } from '../src/ui/kit';
import { C, R } from '../src/ui/theme';
import { formatCompact } from '../src/utils/format';

const KIND: Record<string, { icon: IconName; label: string }> = {
  bank: { icon: 'credit-card', label: 'Banks' },
  investment: { icon: 'trending-up', label: 'Investments' },
  insurance: { icon: 'shield', label: 'Insurance' },
  pension: { icon: 'clock', label: 'Pension' },
};

export default function LinkAccounts() {
  const { celebrate } = useGame();
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const { data, loading, refreshing, refresh, reload, userId } = useUserData(async (id) => {
    const status = await getAAConsentStatus(id);
    const aggregated = status.status === 'active' ? await getAggregatedData(id).catch(() => null) : null;
    return { status, aggregated };
  });

  if (loading || !data)
    return (
      <Screen title="Link accounts">
        <SkeletonScreen />
      </Screen>
    );

  const { status, aggregated } = data;
  const linked = status.status === 'active';
  const fips: any[] = status.available_fips ?? [];
  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const link = async () => {
    setBusy(true);
    try {
      const consent = await initiateAAConsent(userId, selected);
      // In production the user approves this consent in their AA app (Finvu, CAMS). The demo approves it directly.
      const res = await confirmAAConsent(consent.consent_id, userId);
      celebrate('Accounts linked', res.reward);
      setSelected([]);
      reload();
    } catch (e) {
      Alert.alert("Couldn't link", errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const revoke = () =>
    Alert.alert('Stop sharing?', 'We will delete the data fetched from these accounts.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Stop sharing',
        style: 'destructive',
        onPress: async () => {
          try {
            await revokeAAConsent(userId, status.id);
            reload();
          } catch (e) {
            Alert.alert('Error', errorMessage(e));
          }
        },
      },
    ]);

  if (linked) {
    const nw = aggregated?.net_worth;
    return (
      <Screen title="Linked accounts" refreshing={refreshing} onRefresh={refresh}>
        {nw && (
          <Card dark style={{ marginTop: 14, borderRadius: R.lg, padding: 22 }}>
            <Label color={C.nightMuted}>Across everything you linked</Label>
            <Amount value={nw.net_worth} display size={40} color={nw.net_worth < 0 ? '#E4806D' : C.nightText} style={{ marginTop: 8 }} />
            <Small color={C.nightMuted} style={{ marginTop: 4 }}>
              {formatCompact(nw.total_assets)} assets · {formatCompact(nw.total_liabilities)} loans
            </Small>
          </Card>
        )}
        <Section title="Sharing from">
          <Card padded={false} style={{ paddingHorizontal: 16 }}>
            {(status.linked_accounts ?? []).map((a: any, i: number) => (
              <View key={a.masked_number}>
                {i > 0 && <Divider inset={54} />}
                <Row
                  left={<IconMark icon={a.account_type === 'demat' ? 'trending-up' : 'credit-card'} tint={a.fip_id} />}
                  title={a.fip_id.toUpperCase()}
                  subtitle={`${a.account_type} · ${a.masked_number}`}
                  right={<Amount value={a.balance ?? a.portfolio_value ?? 0} size={15} />}
                />
              </View>
            ))}
          </Card>
        </Section>
        {aggregated && (
          <Section title="Investments">
            <Card padded={false} style={{ paddingHorizontal: 16 }}>
              {(
                [
                  ['Mutual funds', aggregated.investments.mutual_funds.total_value, 'pie-chart'],
                  ['Stocks', aggregated.investments.stocks.total_value, 'trending-up'],
                  ['Fixed deposits', aggregated.investments.fixed_deposits.total_value, 'lock'],
                ] as [string, number, IconName][]
              ).map(([k, v, icon], i) => (
                <View key={k}>
                  {i > 0 && <Divider inset={54} />}
                  <Row left={<IconMark icon={icon} tint={k} />} title={k} right={<Amount value={v} size={15} />} />
                </View>
              ))}
            </Card>
          </Section>
        )}
        <Card style={{ marginTop: 24 }}>
          <Small>Consent via {status.aa_provider ?? 'Finvu'} · {status.data_range ?? 'last 12 months'} · refreshed {String(status.frequency ?? 'monthly').toLowerCase()}</Small>
          <Button label="Stop sharing" kind="danger" small style={{ marginTop: 14, alignSelf: 'flex-start' }} onPress={revoke} />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen
      title="Link accounts"
      footer={<Button label={selected.length ? `Continue with ${selected.length}` : 'Choose at least one'} disabled={!selected.length} loading={busy} onPress={link} testID="link-btn" />}
    >
      <Body style={{ marginTop: 6 }}>See every balance in one place. CoinQuest uses India&apos;s Account Aggregator network, regulated by the RBI.</Body>

      <Card style={{ marginTop: 18 }}>
        {(
          [
            ['eye', 'Read-only. We can never move money.'],
            ['clock', 'Last 12 months, refreshed monthly.'],
            ['x-circle', 'Stop sharing any time from this screen.'],
          ] as [IconName, string][]
        ).map(([icon, t], i) => (
          <View key={t} style={[styles.row, i > 0 && { marginTop: 12 }]}>
            <Feather name={icon} size={16} color={C.green} />
            <Body style={{ marginLeft: 10, flex: 1, fontSize: 14 }}>{t}</Body>
          </View>
        ))}
      </Card>

      {Object.entries(KIND).map(([kind, meta]) => {
        const list = fips.filter((f) => f.type === kind);
        if (!list.length) return null;
        return (
          <Section key={kind} title={meta.label}>
            <Card padded={false} style={{ paddingHorizontal: 16 }}>
              {list.map((f, i) => {
                const on = selected.includes(f.id);
                return (
                  <View key={f.id}>
                    {i > 0 && <Divider inset={54} />}
                    <Row
                      left={<IconMark icon={meta.icon} tint={f.name} />}
                      title={f.name}
                      right={<Feather name={on ? 'check-square' : 'square'} size={22} color={on ? C.ink : C.lineStrong} />}
                      onPress={() => toggle(f.id)}
                      testID={`fip-${f.id}`}
                    />
                  </View>
                );
              })}
            </Card>
          </Section>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
});
