import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { errorMessage, sendOTP, verifyOTP } from '../../src/services/api';
import { useAuth } from '../../src/context/AuthContext';
import { Feather } from '@expo/vector-icons';
import { Body, Button, Pill, Screen, Small, Strong } from '../../src/ui/kit';
import { C, F, R, themed } from '../../src/ui/theme';

const LENGTH = 6;

export default function Verify() {
  const router = useRouter();
  const params = useLocalSearchParams<{ phone: string; demoOtp?: string }>();
  const { login } = useAuth();
  const [otp, setOtp] = useState('');
  const [demo, setDemo] = useState(params.demoOtp || '');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // New users: after the code checks out, an explicit (unticked by default) 18+ and Terms confirmation.
  const [needsConsent, setNeedsConsent] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [timer, setTimer] = useState(30);
  const input = useRef<TextInput>(null);

  useEffect(() => {
    if (timer <= 0) return;
    const id = setTimeout(() => setTimer((t) => t - 1), 1000);
    return () => clearTimeout(id);
  }, [timer]);

  const verify = async (code = otp, consent = false) => {
    if (code.length !== LENGTH || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await verifyOTP(params.phone, code, consent);
      if (res.mfa_required) {
        router.replace({ pathname: '/(auth)/pin', params: { mode: 'login', mfa: res.mfa_token } });
        return;
      }
      await login(res.user, res.token);
      router.replace(res.pin_required ? { pathname: '/(auth)/pin', params: { mode: 'set' } } : '/(tabs)');
    } catch (e: any) {
      if (e?.response?.status === 428) {
        // The code is right and still valid; we only need the user's consent.
        setNeedsConsent(true);
        return;
      }
      setOtp('');
      setError(errorMessage(e, "That code didn't work"));
      input.current?.focus();
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    try {
      const res = await sendOTP(params.phone);
      setDemo(res.demo_otp || '');
      setError(null);
      setTimer(30);
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  const pretty = `${params.phone?.slice(0, 5)} ${params.phone?.slice(5)}`;

  return (
    <Screen title="Enter the code">
      <Body style={{ marginTop: 4 }}>
        Sent to +91 {pretty}.{' '}
        <Text style={{ color: C.blue, fontFamily: F.semibold }} onPress={() => router.back()} accessibilityRole="link">
          Change
        </Text>
      </Body>

      <Pressable onPress={() => input.current?.focus()} style={styles.cells} accessibilityLabel={`Code, ${otp.length} of ${LENGTH} digits entered`}>
        {Array.from({ length: LENGTH }).map((_, i) => {
          const active = i === otp.length && !loading;
          return (
            <View key={i} style={[styles.cell, active && styles.cellActive, error ? styles.cellError : null]}>
              <Text style={styles.digit}>{otp[i] ?? ''}</Text>
            </View>
          );
        })}
      </Pressable>
      {/* One hidden input drives the cells: handles paste and SMS autofill. */}
      <TextInput selectionColor={C.ink} cursorColor={C.ink}
        ref={input}
        value={otp}
        onChangeText={(t) => {
          const code = t.replace(/\D/g, '').slice(0, LENGTH);
          setOtp(code);
          setError(null);
          if (code.length === LENGTH) verify(code);
        }}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        autoFocus
        maxLength={LENGTH}
        style={styles.hidden}
        testID="otp-input"
      />

      {error ? <Small color={C.red} style={{ marginTop: 12 }}>{error}</Small> : null}

      {demo ? (
        <View style={{ marginTop: 20 }}>
          <Pill tone="gold" icon="info" label={`Demo mode · code ${demo}`} />
        </View>
      ) : null}

      {needsConsent ? (
        <View style={styles.consent} testID="consent-step">
          <Strong>One last thing</Strong>
          <Pressable onPress={() => setAgreed((a) => !a)} style={styles.consentRow} accessibilityRole="checkbox" accessibilityState={{ checked: agreed }} aria-checked={agreed} testID="consent-check">
            <Feather name={agreed ? 'check-square' : 'square'} size={22} color={agreed ? C.primary : C.ink3} />
            <Text style={styles.consentText}>
              I’m 18 or older, and I agree to the{' '}
              <Text style={styles.link} onPress={() => router.push('/legal/terms')} accessibilityRole="link">
                Terms of Service
              </Text>{' '}
              and{' '}
              <Text style={styles.link} onPress={() => router.push('/legal/privacy')} accessibilityRole="link">
                Privacy Policy
              </Text>
              .
            </Text>
          </Pressable>
          <Small style={{ marginTop: 8 }}>CoinQuest is for adults only. We ask once, and record when you agreed.</Small>
          <Button label="Agree and continue" onPress={() => verify(otp, true)} disabled={!agreed} loading={loading} style={{ marginTop: 16 }} testID="consent-continue" />
        </View>
      ) : (
        <Button label="Verify" onPress={() => verify()} disabled={otp.length !== LENGTH} loading={loading} style={{ marginTop: 28 }} testID="verify-btn" />
      )}
      <Pressable onPress={resend} disabled={timer > 0} style={{ alignSelf: 'center', marginTop: 18 }} accessibilityRole="button">
        <Small color={timer > 0 ? C.ink3 : C.blue} style={{ fontFamily: F.semibold }}>
          {timer > 0 ? `Resend code in 0:${String(timer).padStart(2, '0')}` : 'Resend code'}
        </Small>
      </Pressable>
    </Screen>
  );
}

const styles = themed(() => StyleSheet.create({
  consent: { marginTop: 24, padding: 16, borderRadius: R.md, backgroundColor: C.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: C.lineStrong },
  consentRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 12 },
  consentText: { flex: 1, marginLeft: 10, fontFamily: F.regular, fontSize: 15, lineHeight: 22, color: C.ink2 },
  link: { color: C.ink, fontFamily: F.semibold, textDecorationLine: 'underline' },
  cells: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 30 },
  cell: { width: 48, height: 60, borderRadius: R.sm, borderWidth: 1, borderColor: C.line, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' },
  cellActive: { borderColor: C.ink, borderWidth: 1.5 },
  cellError: { borderColor: C.red },
  digit: { fontFamily: F.semibold, fontSize: 24, color: C.ink },
  hidden: { position: 'absolute', opacity: 0, height: 1, width: 1 },
}));
