import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { errorMessage, getKycStatus, submitKyc } from '../src/services/api';
import { useAuth } from '../src/context/AuthContext';
import { useUserData } from '../src/game/useData';
import { Body, Button, Card, Field, Label, Pill, Progress, Screen, Section, SkeletonScreen, Small, Strong } from '../src/ui/kit';
import { C, R, themed } from '../src/ui/theme';
import { formatCompact } from '../src/utils/format';

const PAN_RE = /^[A-Z]{3}P[A-Z]\d{4}[A-Z]$/;
const DOB_RE = /^(\d{2})\/(\d{2})\/(\d{4})$/;

export default function Kyc() {
  const { updateUser } = useAuth();
  const [pan, setPan] = useState('');
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { data, loading, reload, userId } = useUserData((id) => getKycStatus(id));

  if (loading || !data)
    return (
      <Screen title="Verify identity">
        <SkeletonScreen />
      </Screen>
    );

  const verified = data.status === 'verified';
  const m = dob.match(DOB_RE);
  const valid = PAN_RE.test(pan) && name.trim().length >= 2 && !!m && consent;

  const submit = async () => {
    if (!m) return;
    setBusy(true);
    setError(null);
    try {
      const res = await submitKyc(userId, { pan, full_name: name, dob: `${m[3]}-${m[2]}-${m[1]}`, consent });
      updateUser({ kyc_status: res.status });
      if (res.status === 'failed') setError(res.reason);
      reload();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const limitRow = (label: string, used: number, limit: number) => (
    <View style={{ marginTop: 14 }}>
      <View style={styles.between}>
        <Small>{label}</Small>
        <Small color={C.ink}>
          {formatCompact(used)} of {formatCompact(limit)}
        </Small>
      </View>
      <View style={{ marginTop: 6 }}>
        <Progress value={used} max={limit} color={used / limit > 0.85 ? C.red : C.green} height={4} />
      </View>
    </View>
  );

  return (
    <Screen title={verified ? 'Identity verified' : 'Verify identity'} kicker="KYC">
      <Card style={{ marginTop: 14, borderRadius: R.lg }}>
        <View style={styles.between}>
          <Strong>Your payment limits</Strong>
          <Pill label={verified ? 'Full KYC' : data.status === 'review' ? 'Under review' : 'Basic'} tone={verified ? 'green' : 'neutral'} icon={verified ? 'check' : undefined} />
        </View>
        {limitRow('Today', data.used.today, data.limits.per_day)}
        {limitRow('This month', data.used.this_month, data.limits.per_month)}
        <Small style={{ marginTop: 12 }}>Up to {formatCompact(data.limits.per_txn)} per payment</Small>
        {!verified && (
          <Body style={{ marginTop: 12, fontSize: 14 }}>
            Verify once to pay up to {formatCompact(data.full_limits.per_day)} a day. Indian law (RBI rules) requires identity checks for larger payments.
          </Body>
        )}
      </Card>

      {verified ? (
        <Section title="On file">
          <Card>
            <Small>Name</Small>
            <Strong style={{ marginTop: 2 }}>{data.name}</Strong>
            <Small style={{ marginTop: 12 }}>PAN</Small>
            <Strong style={{ marginTop: 2, letterSpacing: 1 }}>{data.masked_pan}</Strong>
            <Small style={{ marginTop: 12 }}>Your full PAN is encrypted and only shown masked, even to our support team.</Small>
          </Card>
        </Section>
      ) : data.status === 'review' ? (
        <Card style={{ marginTop: 16, backgroundColor: C.amberSoft, borderColor: 'transparent' }}>
          <Strong>We&apos;re checking a few details</Strong>
          <Body style={{ marginTop: 4, fontSize: 14 }}>This usually takes less than a day. You can keep using basic limits meanwhile.</Body>
        </Card>
      ) : (
        <Section title="Your details">
          <Card>
            <Field label="PAN" placeholder="ABCPE1234F" value={pan} onChangeText={(t) => setPan(t.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10))} autoCapitalize="characters" error={pan.length === 10 && !PAN_RE.test(pan) ? 'Check your PAN: 5 letters, 4 digits, 1 letter' : undefined} testID="kyc-pan" />
            <Field label="Name as on PAN" placeholder="Asha Rao" value={name} onChangeText={setName} autoCapitalize="words" testID="kyc-name" />
            <Field label="Date of birth" placeholder="DD/MM/YYYY" keyboardType="number-pad" value={dob} onChangeText={(t) => setDob(formatDob(t))} maxLength={10} testID="kyc-dob" />
            <Pressable onPress={() => setConsent((c) => !c)} style={styles.consent} accessibilityRole="checkbox" accessibilityState={{ checked: consent }} testID="kyc-consent">
              <Feather name={consent ? 'check-square' : 'square'} size={20} color={consent ? C.primary : C.ink3} />
              <Small color={C.ink2} style={{ flex: 1, marginLeft: 10 }}>
                I agree to CoinQuest verifying my PAN with an authorised KYC agency. My data is used only for verification and kept encrypted.
              </Small>
            </Pressable>
            {error ? <Small color={C.red} style={{ marginTop: 10 }}>{error}</Small> : null}
            <Button label="Verify" disabled={!valid} loading={busy} onPress={submit} style={{ marginTop: 16 }} testID="kyc-submit" />
          </Card>
          <Label style={{ marginTop: 14 }}>We never ask for your Aadhaar number in full, OTPs from your bank, or your UPI PIN.</Label>
        </Section>
      )}
    </Screen>
  );
}

function formatDob(t: string) {
  const d = t.replace(/\D/g, '').slice(0, 8);
  return [d.slice(0, 2), d.slice(2, 4), d.slice(4)].filter(Boolean).join('/');
}

const styles = themed(() =>
  StyleSheet.create({
    between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    consent: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 4 },
  }),
);
