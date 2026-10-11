import React, { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, LayoutChangeEvent, PanResponder, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { C, F, R, themed } from './theme';
import { haptic, NATIVE } from './kit';

const THUMB = 52;
const PAD = 4;

/**
 * Drag the thumb to the end to confirm. Deliberate by design: a stray tap can
 * never move money. Screen readers get an "activate" action instead.
 */
export function SwipeToPay({ label, disabled, busy, onComplete, testID }: { label: string; disabled?: boolean; busy?: boolean; onComplete: () => void; testID?: string }) {
  const [width, setWidth] = useState(0);
  const x = useRef(new Animated.Value(0)).current;
  const max = Math.max(0, width - THUMB - PAD * 2);
  const maxRef = useRef(0);
  maxRef.current = max;
  const locked = disabled || busy;
  const lockedRef = useRef(locked);
  lockedRef.current = locked;

  const reset = () => Animated.spring(x, { toValue: 0, friction: 7, useNativeDriver: NATIVE }).start();

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !lockedRef.current,
        onMoveShouldSetPanResponder: () => !lockedRef.current,
        onPanResponderGrant: () => haptic(),
        onPanResponderMove: (_, g) => x.setValue(Math.max(0, Math.min(maxRef.current, g.dx))),
        onPanResponderRelease: (_, g) => {
          if (g.dx >= maxRef.current * 0.88) {
            Animated.timing(x, { toValue: maxRef.current, duration: 90, useNativeDriver: NATIVE }).start(() => {
              haptic('success');
              onComplete();
              setTimeout(reset, 600);
            });
          } else reset();
        },
        onPanResponderTerminate: reset,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onComplete],
  );

  const labelOpacity = x.interpolate({ inputRange: [0, Math.max(1, max * 0.6)], outputRange: [1, 0], extrapolate: 'clamp' });

  return (
    <View
      testID={testID}
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
      style={[styles.track, locked && { opacity: disabled ? 0.35 : 1 }]}
      accessible
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint="Swipe right to confirm"
      accessibilityState={{ disabled: !!locked, busy: !!busy }}
      accessibilityActions={[{ name: 'activate' }]}
      onAccessibilityAction={() => !locked && onComplete()}
    >
      <Animated.Text style={[styles.label, { opacity: labelOpacity }]}>{busy ? 'Paying…' : label}</Animated.Text>
      <Animated.View {...responder.panHandlers} style={[styles.thumb, { transform: [{ translateX: x }] }]} testID={testID ? `${testID}-thumb` : undefined}>
        {busy ? <ActivityIndicator color="#000000" /> : <Feather name="arrow-right" size={22} color="#000000" />}
      </Animated.View>
      {!busy && <Text style={styles.chevrons}>›››</Text>}
    </View>
  );
}

const styles = themed(() => StyleSheet.create({
  track: { height: THUMB + PAD * 2, borderRadius: R.pill, backgroundColor: C.night, justifyContent: 'center', padding: PAD },
  label: { position: 'absolute', alignSelf: 'center', fontFamily: F.semibold, fontSize: 16, color: C.nightText },
  thumb: { width: THUMB, height: THUMB, borderRadius: THUMB / 2, backgroundColor: C.gold, alignItems: 'center', justifyContent: 'center' },
  chevrons: { position: 'absolute', right: 22, fontFamily: F.medium, fontSize: 18, color: C.night3, letterSpacing: 2 },
}));
