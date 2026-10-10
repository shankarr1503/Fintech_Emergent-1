import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { errorMessage, sendOTP, verifyOTP } from '../../src/services/api';
import { useAuth } from '../../src/context/AuthContext';
import { Body, Button, Pill, Screen, Small } from '../../src/ui/kit';
import { C, F, R } from '../../src/ui/theme';

const LENGTH = 6;

export default function Verify() {
  const router = useRouter();
  const params = useLocalSearchParams<{ phone: string; demoOtp?: string }>();
  const { login } = useAuth();
  const [otp, setOtp] = useState('');
  const [demo, setDemo] = useState(params.demoOtp || '');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(30);
  const input = useRef<TextInput>(null);

  useEffect(() => {
    if (timer <= 0) return;
    const id = setTimeout(() => setTimer((t) => t - 1), 1000);
    return () => clearTimeout(id);
  }, [timer]);

  const verify = async (code = otp) => {
    if (code.length !== LENGTH || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await verifyOTP(params.phone, code);
      await login(res.user, res.token);
      router.replace('/(tabs)');
    } catch (e) {
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
      <TextInput
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

      <Button label="Verify" onPress={() => verify()} disabled={otp.length !== LENGTH} loading={loading} style={{ marginTop: 28 }} testID="verify-btn" />
      <Pressable onPress={resend} disabled={timer > 0} style={{ alignSelf: 'center', marginTop: 18 }} accessibilityRole="button">
        <Small color={timer > 0 ? C.ink3 : C.blue} style={{ fontFamily: F.semibold }}>
          {timer > 0 ? `Resend code in 0:${String(timer).padStart(2, '0')}` : 'Resend code'}
        </Small>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  cells: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 30 },
  cell: { width: 48, height: 60, borderRadius: R.sm, borderWidth: 1, borderColor: C.line, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' },
  cellActive: { borderColor: C.ink, borderWidth: 1.5 },
  cellError: { borderColor: C.red },
  digit: { fontFamily: F.semibold, fontSize: 24, color: C.ink },
  hidden: { position: 'absolute', opacity: 0, height: 1, width: 1 },
});
