import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Alert } from '../../src/game/dialog';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { errorMessage, sendOTP, verifyOTP } from '../../src/services/api';
import { useAuth } from '../../src/context/AuthContext';
import { BORDER, C, F } from '../../src/game/theme';
import { Box, Body, PixelButton, PText, Screen, Sprite } from '../../src/game/ui';

const LENGTH = 6;

export default function VerifyScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ phone: string; demoOtp?: string }>();
  const { login } = useAuth();
  const [otp, setOtp] = useState('');
  const [demoOtp, setDemoOtp] = useState(params.demoOtp || '');
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(30);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (timer <= 0) return;
    const id = setTimeout(() => setTimer((t) => t - 1), 1000);
    return () => clearTimeout(id);
  }, [timer]);

  const verify = async (code = otp) => {
    if (code.length !== LENGTH) return;
    setLoading(true);
    try {
      const result = await verifyOTP(params.phone, code);
      await login(result.user);
      router.replace('/(tabs)');
    } catch (e) {
      setOtp('');
      Alert.alert('Wrong code', errorMessage(e, 'Invalid OTP'));
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    try {
      const result = await sendOTP(params.phone);
      setDemoOtp(result.demo_otp || '');
      setTimer(30);
    } catch (e) {
      Alert.alert('Error', errorMessage(e, 'Failed to resend OTP'));
    }
  };

  return (
    <Screen title="SECRET CODE" subtitle={`SENT TO +91 ${params.phone}`} ground>
      <View style={{ alignItems: 'center', marginVertical: 18 }}>
        <Sprite name="lock" scale={6} />
      </View>

      {demoOtp ? (
        <Box color={C.coin} padding={10}>
          <PText size={9} center>
            DEMO MODE • CODE: {demoOtp}
          </PText>
        </Box>
      ) : null}

      <Box style={{ marginTop: 14 }}>
        <PText size={9} style={{ marginBottom: 14 }}>
          ENTER 6-DIGIT CODE
        </PText>
        <Pressable onPress={() => inputRef.current?.focus()} style={styles.cells} accessibilityLabel="OTP input">
          {Array.from({ length: LENGTH }).map((_, i) => {
            const filled = i < otp.length;
            const active = i === otp.length;
            return (
              <View key={i} style={[styles.cell, filled && styles.cellFilled, active && styles.cellActive]}>
                <PText size={16} color={filled ? C.white : C.ink}>
                  {otp[i] ?? ''}
                </PText>
              </View>
            );
          })}
        </Pressable>
        {/* One hidden input drives all cells: handles paste & SMS autofill. */}
        <TextInput
          ref={inputRef}
          value={otp}
          onChangeText={(t) => {
            const code = t.replace(/\D/g, '').slice(0, LENGTH);
            setOtp(code);
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
        <PixelButton label="CONTINUE" sprite="star" color={C.pipe} onPress={() => verify()} disabled={otp.length !== LENGTH} loading={loading} style={{ marginTop: 18 }} testID="verify-btn" />
        <Pressable onPress={resend} disabled={timer > 0} style={{ marginTop: 12, alignSelf: 'center' }} accessibilityRole="button">
          <PText size={8} color={timer > 0 ? C.grayDark : C.blue}>
            {timer > 0 ? `RESEND IN ${timer}S` : 'RESEND CODE'}
          </PText>
        </Pressable>
      </Box>
      <Body size={12} color={C.white} style={{ marginTop: 16 }} center>
        New players get a starter world with demo transactions, debts and goals.
      </Body>
    </Screen>
  );
}

const styles = StyleSheet.create({
  cells: { flexDirection: 'row', justifyContent: 'space-between' },
  cell: { width: 44, height: 54, borderWidth: BORDER, borderColor: C.ink, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center' },
  cellFilled: { backgroundColor: C.brick },
  cellActive: { borderColor: C.blue, backgroundColor: '#E8F0FF' },
  hidden: { position: 'absolute', opacity: 0, height: 1, width: 1, fontFamily: F.pixel },
});
