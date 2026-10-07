import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Alert } from '../src/game/dialog';
import { confirmAAConsent, errorMessage, getAAConsentStatus, getAggregatedData, initiateAAConsent, revokeAAConsent } from '../src/services/api';
import { useGame } from '../src/game/GameContext';
import { useUserData } from '../src/game/useData';
import { SpriteName } from '../src/game/sprites';
import { BORDER, C } from '../src/game/theme';
import { Body, Box, Loading, PixelButton, PText, Screen, SectionTitle, Sprite, Stat } from '../src/game/ui';
import { formatCompact, formatCurrency } from '../src/utils/format';

const FIP_SPRITE: Record<string, SpriteName> = { bank: 'bank', investment: 'gem', insurance: 'shield', pension: 'piggy' };

export default function WarpZoneScreen() {
  const { celebrate } = useGame();
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const { data, loading, refreshing, refresh, reload, userId } = useUserData(async (id) => {
    const status = await getAAConsentStatus(id);
    const aggregated = status.status === 'active' ? await getAggregatedData(id).catch(() => null) : null;
    return { status, aggregated };
  });

  if (loading || !data) return <Loading label="ENTERING WARP ZONE" world="underground" />;
  const { status, aggregated } = data;
  const linked = status.status === 'active';

  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const link = async () => {
    if (!selected.length) return Alert.alert('Pick some pipes', 'Select at least one institution to link.');
    setBusy(true);
    try {
      const consent = await initiateAAConsent(userId, selected);
      // In production the user approves on their AA app (Finvu/CAMS); demo auto-approves.
      const res = await confirmAAConsent(consent.consent_id, userId);
      celebrate('WARP COMPLETE!', res.reward);
      setSelected([]);
      reload();
    } catch (e) {
      Alert.alert('Linking failed', errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const revoke = () =>
    Alert.alert('Close all pipes?', 'This revokes consent and removes linked data.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Revoke',
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

  return (
    <Screen title="WARP ZONE" subtitle="ACCOUNT AGGREGATOR (RBI)" world="underground" refreshing={refreshing} onRefresh={refresh}>
      {!linked ? (
        <>
          <Box color={C.pipeLight}>
            <View style={styles.row}>
              <Sprite name="pipe" scale={4} />
              <View style={{ flex: 1, marginLeft: 14 }}>
                <PText size={9}>ONE PIPE TO EVERY BANK</PText>
                <Body size={13} color={C.text} style={{ marginTop: 6 }}>
                  Securely pull balances, deposits and investments through an RBI-licensed Account Aggregator. Read-only, revocable anytime.
                </Body>
              </View>
            </View>
          </Box>
          <SectionTitle>CHOOSE YOUR PIPES</SectionTitle>
          <View style={styles.grid}>
            {(status.available_fips ?? []).map((f: any) => {
              const on = selected.includes(f.id);
              return (
                <Pressable key={f.id} onPress={() => toggle(f.id)} style={[styles.fip, on && styles.fipOn]} accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={f.name}>
                  <Sprite name={FIP_SPRITE[f.type] ?? 'bank'} scale={3} />
                  <PText size={7} center style={{ marginTop: 8 }} numberOfLines={2}>
                    {f.name.toUpperCase()}
                  </PText>
                  {on && (
                    <View style={styles.tick}>
                      <PText size={8} color={C.white}>
                        ✓
                      </PText>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
          <PixelButton label={`WARP ${selected.length || ''} ACCOUNTS`} sprite="pipe" color={C.pipe} style={{ marginTop: 16 }} loading={busy} disabled={!selected.length} onPress={link} />
          <Body size={12} color={C.gray} center style={{ marginTop: 10 }}>
            Data: last 12 months • refreshed monthly • consent until revoked
          </Body>
        </>
      ) : (
        <>
          {aggregated && (
            <Box color={aggregated.net_worth.net_worth >= 0 ? C.pipeLight : C.paper}>
              <PText size={8} color={C.textMuted}>
                NET WORTH
              </PText>
              <PText size={20} color={aggregated.net_worth.net_worth >= 0 ? C.pipeDark : C.red} style={{ marginTop: 8 }}>
                {formatCurrency(aggregated.net_worth.net_worth)}
              </PText>
              <View style={[styles.between, { marginTop: 12 }]}>
                <Stat label="Assets" value={formatCompact(aggregated.net_worth.total_assets)} color={C.pipeDark} />
                <Stat label="Liabilities" value={formatCompact(aggregated.net_worth.total_liabilities)} color={C.red} align="right" />
              </View>
            </Box>
          )}

          <SectionTitle>LINKED PIPES</SectionTitle>
          <Box padding={10}>
            {(status.linked_accounts ?? []).map((a: any) => (
              <View key={a.masked_number} style={[styles.between, styles.line]}>
                <View style={styles.row}>
                  <Sprite name={a.account_type === 'demat' ? 'gem' : 'bank'} scale={2} />
                  <View style={{ marginLeft: 10 }}>
                    <PText size={8}>{a.fip_id.toUpperCase()}</PText>
                    <Body size={12}>
                      {a.account_type} • {a.masked_number}
                    </Body>
                  </View>
                </View>
                <PText size={9}>{formatCompact(a.balance ?? a.portfolio_value ?? 0)}</PText>
              </View>
            ))}
          </Box>

          {aggregated && (
            <>
              <SectionTitle>INVESTMENTS</SectionTitle>
              <Box>
                {[
                  ['Mutual funds', aggregated.investments.mutual_funds.total_value, 'gem'],
                  ['Stocks', aggregated.investments.stocks.total_value, 'star'],
                  ['Fixed deposits', aggregated.investments.fixed_deposits.total_value, 'chest'],
                ].map(([label, value, sprite]) => (
                  <View key={label as string} style={[styles.between, styles.line]}>
                    <View style={styles.row}>
                      <Sprite name={sprite as SpriteName} scale={2} />
                      <PText size={8} style={{ marginLeft: 10 }}>
                        {(label as string).toUpperCase()}
                      </PText>
                    </View>
                    <PText size={9}>{formatCompact(value as number)}</PText>
                  </View>
                ))}
              </Box>
              <SectionTitle>LOANS & COVER</SectionTitle>
              <Box>
                {aggregated.loans.map((l: any) => (
                  <View key={l.type} style={[styles.between, styles.line]}>
                    <PText size={8}>{l.type.toUpperCase()}</PText>
                    <PText size={8} color={C.red}>
                      {formatCompact(l.outstanding)} @ {l.rate}%
                    </PText>
                  </View>
                ))}
                {aggregated.insurance.map((p: any) => (
                  <View key={p.type} style={[styles.between, styles.line]}>
                    <PText size={8}>{p.type.toUpperCase()} COVER</PText>
                    <PText size={8} color={C.pipeDark}>
                      {formatCompact(p.sum_assured)}
                    </PText>
                  </View>
                ))}
              </Box>
            </>
          )}
          <PixelButton label="REVOKE CONSENT" color={C.red} style={{ marginTop: 18 }} onPress={revoke} />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 },
  fip: { width: '31%', alignItems: 'center', padding: 10, backgroundColor: C.paper, borderWidth: BORDER, borderColor: C.ink, minHeight: 96 },
  fipOn: { backgroundColor: C.pipeLight, transform: [{ translateY: -3 }] },
  tick: { position: 'absolute', top: -8, right: -8, width: 22, height: 22, backgroundColor: C.pipe, borderWidth: 2, borderColor: C.ink, alignItems: 'center', justifyContent: 'center' },
  line: { paddingVertical: 10, borderBottomWidth: 2, borderColor: C.paperDark },
});
