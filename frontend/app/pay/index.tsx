import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { getRecentPayees, getUPIHistory } from '../../src/services/api';
import { useUserData } from '../../src/game/useData';
import { Amount, Avatar, Card, Chip, Divider, Field, IconMark, Pill, Row, Screen, Section, SkeletonScreen, Small } from '../../src/ui/kit';
import { C } from '../../src/ui/theme';
import { formatDate } from '../../src/utils/format';

type Payee = { id: string; name: string; upi_id: string; last_paid: string; frequency: string };

const STATUS: Record<string, { label: string; tone: 'gold' | 'red' }> = {
  pending: { label: 'Pending', tone: 'gold' },
  on_hold: { label: 'On hold', tone: 'gold' },
  failed: { label: 'Failed', tone: 'red' },
};

const UPI_RE = /^[\w.\-]{2,}@[a-zA-Z]{2,}$/;
const PHONE_RE = /^[6-9]\d{9}$/;

export default function PayPicker() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [mode, setMode] = useState<'pay' | 'request'>('pay');
  const { data, loading } = useUserData(async (id) => {
    const [payees, history] = await Promise.all([getRecentPayees(id), getUPIHistory(id)]);
    return { payees: payees as Payee[], history: history as any[] };
  });

  const query = q.trim();
  const matches = useMemo(() => {
    const list = data?.payees ?? [];
    if (!query) return list;
    const lower = query.toLowerCase();
    return list.filter((p) => p.name.toLowerCase().includes(lower) || p.upi_id.toLowerCase().includes(lower));
  }, [data, query]);

  const direct = UPI_RE.test(query) ? query : PHONE_RE.test(query) ? `${query}@upi` : null;
  const pay = (to: string, name = '') => router.push({ pathname: '/pay/amount', params: { to, name, mode } });
  const verb = mode === 'pay' ? 'Pay' : 'Request from';

  return (
    <Screen title={mode === 'pay' ? 'Pay' : 'Request'} kicker="UPI" right={mode === 'request' ? <Chip label="Cancel request" onPress={() => setMode('pay')} icon="x" /> : undefined}>
      <View style={{ marginTop: 16 }}>
        <Field
          placeholder="Name, UPI ID or phone number"
          value={q}
          onChangeText={setQ}
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus
          testID="pay-search"
          returnKeyType="go"
          onSubmitEditing={() => direct && pay(direct)}
        />
      </View>

      {direct && (
        <Card padded={false} style={{ paddingHorizontal: 16 }}>
          <Row left={<IconMark icon="at-sign" tint="direct" />} title={`${verb} ${direct}`} subtitle="New payee · we'll verify the name" onPress={() => pay(direct)} chevron testID="pay-direct" />
        </Card>
      )}

      {loading ? (
        <SkeletonScreen />
      ) : (
        <>
          <Section title={query ? 'Matches' : 'Recent'}>
            <Card padded={false} style={{ paddingHorizontal: 16 }}>
              {matches.length === 0 ? (
                <Small style={{ paddingVertical: 16 }}>No one by that name yet. Type their UPI ID instead.</Small>
              ) : (
                matches.map((p, i) => (
                  <View key={p.id}>
                    {i > 0 && <Divider inset={58} />}
                    <Row
                      left={<Avatar name={p.name} />}
                      title={p.name}
                      subtitle={`${p.upi_id} · last ${p.last_paid}`}
                      onPress={() => pay(p.upi_id, p.name)}
                      chevron
                      testID={`payee-${p.id}`}
                    />
                  </View>
                ))
              )}
            </Card>
          </Section>

          {!query && (
            <>
              <Section title="Other ways">
                <Card padded={false} style={{ paddingHorizontal: 16 }}>
                  <Row left={<IconMark icon="maximize" tint="scan" />} title="Scan a QR code" onPress={() => router.replace('/scan')} chevron />
                  <Divider inset={54} />
                  <Row left={<IconMark icon="download" tint="request" />} title="Request money" subtitle="Pick who should pay you" onPress={() => setMode('request')} chevron testID="request-mode" />
                  <Divider inset={54} />
                  <Row left={<IconMark icon="repeat" tint="self" />} title="Between your accounts" subtitle="Self transfer, no fees" onPress={() => router.push('/my-wallet')} chevron />
                </Card>
              </Section>

              <Section title="History">
                <Card padded={false} style={{ paddingHorizontal: 16 }}>
                  {(data?.history ?? []).slice(0, 6).map((t, i) => {
                    const sent = t.type === 'sent' || t.type === 'upi_send';
                    const who = sent ? t.to || t.recipient : t.from;
                    const status = STATUS[t.status];
                    return (
                      <View key={t.id || i}>
                        {i > 0 && <Divider inset={58} />}
                        <Row
                          left={<Avatar name={who} />}
                          title={who}
                          subtitleLines={status ? 2 : 1}
                          subtitle={status ? t.reason || `${formatDate(t.timestamp)}` : `${sent ? 'Paid' : 'Received'} · ${formatDate(t.timestamp)}`}
                          right={
                            <View style={{ alignItems: 'flex-end', gap: 4 }}>
                              <Amount value={t.amount} size={15} sign={sent ? undefined : '+'} color={t.status === 'failed' ? C.ink3 : sent ? C.ink : C.green} />
                              {status && <Pill label={status.label} tone={status.tone} />}
                            </View>
                          }
                        />
                      </View>
                    );
                  })}
                </Card>
              </Section>
            </>
          )}
        </>
      )}
      <View style={{ alignItems: 'center', marginTop: 24, flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
        <Feather name="lock" size={12} color={C.ink3} />
        <Small>Payments are secured by UPI and your bank</Small>
      </View>
    </Screen>
  );
}
