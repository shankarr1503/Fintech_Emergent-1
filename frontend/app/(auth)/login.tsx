import React, { useEffect, useRef, useState } from 'react';
import { Animated, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Alert } from '../../src/game/dialog';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { errorMessage, sendOTP } from '../../src/services/api';
import { C } from '../../src/game/theme';
import { Body, Box, GroundStrip, NATIVE_DRIVER, PixelButton, PixelInput, PText, SkyBackground, Sprite, SpinningCoin } from '../../src/game/ui';

function Blink({ children }: { children: React.ReactNode }) {
  const v = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 0, duration: 0, delay: 600, useNativeDriver: NATIVE_DRIVER }),
        Animated.timing(v, { toValue: 1, duration: 0, delay: 400, useNativeDriver: NATIVE_DRIVER }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [v]);
  return <Animated.View style={{ opacity: v }}>{children}</Animated.View>;
}

export default function LoginScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const valid = /^[6-9]\d{9}$/.test(phone);

  const start = async () => {
    if (!valid) return Alert.alert('Invalid number', 'Enter a valid 10-digit Indian mobile number.');
    setLoading(true);
    try {
      const result = await sendOTP(phone);
      router.push({ pathname: '/(auth)/verify', params: { phone, demoOtp: result.demo_otp ?? '' } });
    } catch (e) {
      Alert.alert('Could not send OTP', errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.sky }}>
      <SkyBackground />
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View style={styles.logo}>
              <View style={styles.row}>
                <SpinningCoin scale={4} />
                <PText size={26} color={C.coin} shadow={C.ink} style={{ marginHorizontal: 10 }}>
                  COIN
                </PText>
                <SpinningCoin scale={4} />
              </View>
              <PText size={26} color={C.white} shadow={C.ink} style={{ marginTop: 6 }}>
                QUEST
              </PText>
              <PText size={8} color={C.paper} shadow={C.ink} style={{ marginTop: 14 }} center>
                PAY • SAVE • LEVEL UP
              </PText>
            </View>

            <View style={styles.heroRow}>
              <Sprite name="hero" scale={6} />
            </View>

            <Box>
              <PText size={10}>PLAYER 1 — ENTER MOBILE</PText>
              <View style={{ height: 14 }} />
              <PixelInput
                prefix="+91"
                placeholder="98765 43210"
                keyboardType="phone-pad"
                maxLength={10}
                value={phone}
                onChangeText={(t) => setPhone(t.replace(/\D/g, ''))}
                testID="phone-input"
                returnKeyType="go"
                onSubmitEditing={start}
              />
              <PixelButton label="PRESS START" onPress={start} disabled={!valid} loading={loading} testID="start-btn" />
              <Body size={12} style={{ marginTop: 10 }}>
                We will send a one-time code. Your bank logins are never stored.
              </Body>
            </Box>

            <View style={styles.features}>
              {[
                ['shield', 'Bank-grade security'],
                ['coin', 'Earn coins on every payment'],
                ['star', 'Level up your money skills'],
              ].map(([sprite, text]) => (
                <View key={text} style={[styles.row, { marginBottom: 10 }]}>
                  <Sprite name={sprite as any} scale={2} />
                  <PText size={8} color={C.white} shadow={C.ink} style={{ marginLeft: 10 }}>
                    {text.toUpperCase()}
                  </PText>
                </View>
              ))}
            </View>

            {!valid && (
              <Blink>
                <PText size={9} color={C.white} shadow={C.ink} center style={{ marginTop: 6 }}>
                  INSERT PHONE NUMBER
                </PText>
              </Blink>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
      <GroundStrip height={36} />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingTop: 30, paddingBottom: 40 },
  logo: { alignItems: 'center', marginBottom: 18 },
  row: { flexDirection: 'row', alignItems: 'center' },
  heroRow: { alignItems: 'center', marginBottom: 10 },
  features: { marginTop: 22, paddingHorizontal: 6 },
});
