import React, { ReactNode, useCallback, useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import Svg, { Circle } from 'react-native-svg';
import { C, F, getScheme, GUTTER, R, tintFor, themed } from './theme';

export const NATIVE = Platform.OS !== 'web';

// Browsers draw their own focus ring inside our styled fields; the field border already shows focus.
export const NO_OUTLINE = (Platform.OS === 'web' ? { outlineStyle: 'none' } : {}) as object;

/** Light status-bar text on dark screens, dark text on paper. Applied whenever the screen gains focus. */
export function useStatusBar(style: 'light' | 'dark') {
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle(getScheme() === 'dark' ? 'light' : style);
    }, [style]),
  );
}
export type IconName = React.ComponentProps<typeof Feather>['name'];

export const haptic = (kind: 'light' | 'medium' | 'success' = 'light') => {
  if (Platform.OS === 'web') return;
  if (kind === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  else Haptics.impactAsync(kind === 'medium' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light).catch(() => {});
};

// ---------------------------------------------------------------- type

type TProps = {
  children: ReactNode;
  color?: string;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  center?: boolean;
  testID?: string;
  selectable?: boolean;
};

// The base style is a factory so colours are read from the current theme on every render.
function make(base: () => TextStyle, displayName: string) {
  const Styled = ({ children, color, style, numberOfLines, center, testID, selectable }: TProps) => (
    <Text
      testID={testID}
      selectable={selectable}
      numberOfLines={numberOfLines}
      style={[base(), color ? { color } : null, center ? { textAlign: 'center' } : null, style]}
    >
      {children}
    </Text>
  );
  Styled.displayName = displayName;
  return Styled;
}

export const Display = make(() => ({ fontFamily: F.display, fontSize: 40, lineHeight: 44, color: C.ink, letterSpacing: -0.5 }), 'Display');
export const Heading = make(() => ({ fontFamily: F.display, fontSize: 30, lineHeight: 34, color: C.ink, letterSpacing: -0.3 }), 'Heading');
export const Title = make(() => ({ fontFamily: F.semibold, fontSize: 17, lineHeight: 22, color: C.ink, letterSpacing: -0.2 }), 'Title');
export const Body = make(() => ({ fontFamily: F.regular, fontSize: 15, lineHeight: 21, color: C.ink2 }), 'Body');
export const Small = make(() => ({ fontFamily: F.regular, fontSize: 13, lineHeight: 18, color: C.ink3 }), 'Small');
export const Strong = make(() => ({ fontFamily: F.semibold, fontSize: 15, lineHeight: 20, color: C.ink }), 'Strong');
export const Label = make(() => ({ fontFamily: F.semibold, fontSize: 11, lineHeight: 14, color: C.ink3, letterSpacing: 0.9, textTransform: 'uppercase' }), 'Label');

/**
 * Money, formatted the way people read it: smaller ₹, grouped Indian digits,
 * muted paise (only when there are paise), tabular figures.
 */
export function Amount({
  value,
  size = 17,
  color = C.ink,
  display,
  sign,
  style,
  testID,
}: {
  value: number;
  size?: number;
  color?: string;
  display?: boolean;
  sign?: '+' | '-';
  style?: StyleProp<TextStyle>;
  testID?: string;
}) {
  const abs = Math.abs(value);
  const rupees = Math.floor(abs).toLocaleString('en-IN');
  const paise = Math.round((abs % 1) * 100);
  const family = display ? F.display : F.semibold;
  const negative = value < 0 && !sign;
  return (
    <Text testID={testID} style={[{ fontFamily: family, fontSize: size, color, fontVariant: ['tabular-nums'], letterSpacing: display ? -0.5 : -0.2 }, style]}>
      {sign || (negative ? '−' : '')}
      <Text style={{ fontSize: size * 0.62, fontFamily: display ? F.display : F.medium }}>₹</Text>
      {rupees}
      {paise ? <Text style={{ color: display ? color : C.ink3, fontSize: size * 0.7 }}>.{String(paise).padStart(2, '0')}</Text> : null}
    </Text>
  );
}

// ---------------------------------------------------------------- surfaces

export function Card({
  children,
  style,
  dark,
  padded = true,
  onPress,
  testID,
  accessibilityLabel,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  dark?: boolean;
  padded?: boolean;
  onPress?: () => void;
  testID?: string;
  accessibilityLabel?: string;
}) {
  const base = [s.card, dark && s.cardDark, padded && { padding: 18 }, style];
  if (!onPress) return <View style={base}>{children}</View>;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={() => {
        haptic();
        onPress();
      }}
      style={({ pressed }) => [...base, pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] }]}
    >
      {children}
    </Pressable>
  );
}

export function Divider({ inset = 0, dark }: { inset?: number; dark?: boolean }) {
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: dark ? C.night3 : C.line, marginLeft: inset }} />;
}

// ---------------------------------------------------------------- buttons

type ButtonProps = {
  label: string;
  onPress?: () => void;
  kind?: 'primary' | 'secondary' | 'ghost' | 'gold' | 'danger';
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function Button({ label, onPress, kind = 'primary', icon, loading, disabled, small, style, testID }: ButtonProps) {
  const palette = {
    primary: { bg: C.primary, fg: C.onPrimary, border: C.primary },
    secondary: { bg: 'transparent', fg: C.ink, border: C.lineStrong },
    ghost: { bg: 'transparent', fg: C.ink, border: 'transparent' },
    gold: { bg: C.gold, fg: '#0F1E2B', border: C.gold },
    danger: { bg: 'transparent', fg: C.red, border: C.redSoft },
  }[kind];
  const off = disabled || loading;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      disabled={off}
      onPress={() => {
        haptic(kind === 'primary' || kind === 'gold' ? 'medium' : 'light');
        onPress?.();
      }}
      style={({ pressed }) => [
        s.button,
        small && s.buttonSmall,
        { backgroundColor: palette.bg, borderColor: palette.border },
        off && kind !== 'ghost' && { opacity: 0.35 },
        pressed && { transform: [{ scale: 0.98 }], opacity: 0.9 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <>
          {icon && <Feather name={icon} size={small ? 15 : 17} color={palette.fg} style={{ marginRight: 8 }} />}
          <Text style={{ fontFamily: F.semibold, fontSize: small ? 14 : 16, color: palette.fg, letterSpacing: -0.1 }}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

export function IconButton({
  icon,
  onPress,
  label,
  dark,
  badge,
  testID,
}: {
  icon: IconName;
  onPress?: () => void;
  label: string;
  dark?: boolean;
  badge?: boolean;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      onPress={() => {
        haptic();
        onPress?.();
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      style={({ pressed }) => [s.iconBtn, dark && { backgroundColor: C.night2, borderColor: C.night3 }, pressed && { opacity: 0.6 }]}
    >
      <Feather name={icon} size={19} color={dark ? C.nightText : C.ink} />
      {badge && <View style={s.dot} />}
    </Pressable>
  );
}

/** Round icon tile with a label underneath (quick actions, services). */
export function ActionTile({
  icon,
  label,
  onPress,
  tone = 'light',
  testID,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  tone?: 'light' | 'dark' | 'gold';
  testID?: string;
}) {
  const bg = tone === 'dark' ? C.primary : tone === 'gold' ? C.gold : C.surface;
  const fg = tone === 'dark' ? C.onPrimary : tone === 'gold' ? '#0F1E2B' : C.ink;
  return (
    <Pressable
      testID={testID}
      onPress={() => {
        haptic();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [{ alignItems: 'center', width: 76 }, pressed && { transform: [{ scale: 0.95 }] }]}
    >
      <View style={[s.tile, { backgroundColor: bg }, tone === 'light' && { borderWidth: StyleSheet.hairlineWidth, borderColor: C.lineStrong }]}>
        <Feather name={icon} size={22} color={fg} />
      </View>
      <Text numberOfLines={2} style={s.tileLabel}>
        {label}
      </Text>
    </Pressable>
  );
}

// ---------------------------------------------------------------- people & rows

export function Avatar({ name, size = 44, dark }: { name: string; size?: number; dark?: boolean }) {
  const t = tintFor(name);
  const initials = name
    .replace(/[^A-Za-z ]/g, '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: dark ? C.night3 : t.bg, alignItems: 'center', justifyContent: 'center' }}>
      {initials ? (
        <Text style={{ fontFamily: F.semibold, fontSize: size * 0.36, color: dark ? C.nightText : t.fg }}>{initials}</Text>
      ) : (
        <Feather name="user" size={size * 0.44} color={dark ? C.nightText : t.fg} />
      )}
    </View>
  );
}

export function IconMark({ icon, size = 40, tint, dark }: { icon: IconName; size?: number; tint?: string; dark?: boolean }) {
  const t = tintFor(tint ?? icon);
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.32, backgroundColor: dark ? C.night3 : t.bg, alignItems: 'center', justifyContent: 'center' }}>
      <Feather name={icon} size={size * 0.45} color={dark ? C.nightText : t.fg} />
    </View>
  );
}

export function Row({
  left,
  title,
  subtitle,
  right,
  onPress,
  chevron,
  dark,
  testID,
  subtitleLines = 1,
}: {
  left?: ReactNode;
  title: string;
  subtitle?: string;
  subtitleLines?: number;
  right?: ReactNode;
  onPress?: () => void;
  chevron?: boolean;
  dark?: boolean;
  testID?: string;
}) {
  const content = (
    <>
      {left && <View style={{ marginRight: 14 }}>{left}</View>}
      <View style={{ flex: 1 }}>
        <Strong color={dark ? C.nightText : C.ink} numberOfLines={1}>
          {title}
        </Strong>
        {subtitle ? (
          <Small color={dark ? C.nightMuted : C.ink3} numberOfLines={subtitleLines} style={{ marginTop: 2 }}>
            {subtitle}
          </Small>
        ) : null}
      </View>
      {right}
      {chevron && <Feather name="chevron-right" size={18} color={dark ? C.nightMuted : C.ink3} style={{ marginLeft: 8 }} />}
    </>
  );
  if (!onPress) return <View style={s.row}>{content}</View>;
  return (
    <Pressable
      testID={testID}
      onPress={() => {
        haptic();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={({ pressed }) => [s.row, pressed && { opacity: 0.6 }]}
    >
      {content}
    </Pressable>
  );
}

export function Section({ title, action, onAction, children, style, dark }: { title: string; action?: string; onAction?: () => void; children: ReactNode; style?: StyleProp<ViewStyle>; dark?: boolean }) {
  return (
    <View style={[{ marginTop: 28 }, style]}>
      <View style={s.sectionHead}>
        <Label color={dark ? C.nightMuted : C.ink3}>{title}</Label>
        {action && (
          <Pressable onPress={onAction} hitSlop={10} accessibilityRole="button" accessibilityLabel={action}>
            <Text style={{ fontFamily: F.semibold, fontSize: 13, color: dark ? C.gold : C.ink }}>{action}</Text>
          </Pressable>
        )}
      </View>
      {children}
    </View>
  );
}

// ---------------------------------------------------------------- inputs

export function Field({ label, prefix, hint, error, style, ...rest }: TextInputProps & { label?: string; prefix?: string; hint?: string; error?: string }) {
  return (
    <View style={{ marginBottom: 16 }}>
      {label ? <Small color={C.ink2} style={{ marginBottom: 6, fontFamily: F.medium }}>{label}</Small> : null}
      <View style={[s.field, error ? { borderColor: C.red } : null]}>
        {prefix ? <Text style={s.fieldPrefix}>{prefix}</Text> : null}
        <TextInput placeholderTextColor={C.ink3} style={[s.fieldInput, style]} {...rest} />
      </View>
      {error ? <Small color={C.red} style={{ marginTop: 6 }}>{error}</Small> : hint ? <Small style={{ marginTop: 6 }}>{hint}</Small> : null}
    </View>
  );
}

export function Segmented<T extends string>({ options, value, onChange, dark }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void; dark?: boolean }) {
  return (
    <View style={[s.segment, dark && { backgroundColor: C.night2 }]}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => {
              haptic();
              onChange(o.value);
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            style={[s.segmentItem, on && { backgroundColor: dark ? C.night3 : C.surface }]}
          >
            <Text style={{ fontFamily: F.semibold, fontSize: 14, color: on ? (dark ? C.nightText : C.ink) : dark ? C.nightMuted : C.ink3 }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Chip({ label, active, onPress, icon }: { label: string; active?: boolean; onPress?: () => void; icon?: IconName }) {
  return (
    <Pressable
      onPress={() => {
        haptic();
        onPress?.();
      }}
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
      style={[s.chip, active && { backgroundColor: C.primary, borderColor: C.primary }]}
    >
      {icon && <Feather name={icon} size={13} color={active ? C.onPrimary : C.ink2} style={{ marginRight: 6 }} />}
      <Text style={{ fontFamily: F.medium, fontSize: 14, color: active ? C.onPrimary : C.ink2 }}>{label}</Text>
    </Pressable>
  );
}

export function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  const x = useRef(new Animated.Value(value ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(x, { toValue: value ? 1 : 0, duration: 160, easing: Easing.out(Easing.quad), useNativeDriver: NATIVE }).start();
  }, [value, x]);
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      onPress={() => {
        haptic();
        onChange(!value);
      }}
      style={[s.toggle, { backgroundColor: value ? C.green : C.lineStrong }]}
    >
      <Animated.View style={[s.knob, { transform: [{ translateX: x.interpolate({ inputRange: [0, 1], outputRange: [0, 18] }) }] }]} />
    </Pressable>
  );
}

// ---------------------------------------------------------------- progress

export function Progress({ value, max = 100, color = C.ink, track = C.paperDeep, height = 6 }: { value: number; max?: number; color?: string; track?: string; height?: number }) {
  const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  return (
    <View style={{ height, borderRadius: height, backgroundColor: track, overflow: 'hidden' }} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(pct * 100) }}>
      <View style={{ width: `${pct * 100}%`, height: '100%', borderRadius: height, backgroundColor: color }} />
    </View>
  );
}

export function Ring({ value, size = 56, stroke = 6, color = C.ink, track = C.paperDeep, children }: { value: number; size?: number; stroke?: number; color?: string; track?: string; children?: ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={c * (1 - pct)}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {children}
    </View>
  );
}

// ---------------------------------------------------------------- loading & empty

/** Pulsing placeholder block: layout stays put while data loads. */
export function Skeleton({ width = '100%', height = 16, radius = 8, style, dark }: { width?: number | `${number}%`; height?: number; radius?: number; style?: StyleProp<ViewStyle>; dark?: boolean }) {
  const o = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(o, { toValue: 1, duration: 700, useNativeDriver: NATIVE }),
        Animated.timing(o, { toValue: 0.5, duration: 700, useNativeDriver: NATIVE }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [o]);
  return <Animated.View style={[{ width, height, borderRadius: radius, backgroundColor: dark ? C.night2 : C.paperDeep, opacity: o }, style]} />;
}

export function SkeletonScreen({ dark }: { dark?: boolean }) {
  return (
    <View style={{ paddingHorizontal: GUTTER, paddingTop: 8 }} accessibilityLabel="Loading">
      <Skeleton width={180} height={34} dark={dark} />
      <Skeleton height={150} radius={R.lg} style={{ marginTop: 22 }} dark={dark} />
      {[0, 1, 2, 3].map((i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginTop: 22 }}>
          <Skeleton width={40} height={40} radius={20} dark={dark} />
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Skeleton width="60%" height={14} dark={dark} />
            <Skeleton width="35%" height={12} style={{ marginTop: 8 }} dark={dark} />
          </View>
        </View>
      ))}
    </View>
  );
}

export function Empty({ icon, title, body, action }: { icon: IconName; title: string; body?: string; action?: ReactNode }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 36, paddingHorizontal: 24 }}>
      <View style={[s.tile, { backgroundColor: C.paperDeep, width: 56, height: 56 }]}>
        <Feather name={icon} size={24} color={C.ink2} />
      </View>
      <Title center style={{ marginTop: 16 }}>
        {title}
      </Title>
      {body ? (
        <Body center style={{ marginTop: 6 }}>
          {body}
        </Body>
      ) : null}
      {action ? <View style={{ marginTop: 18 }}>{action}</View> : null}
    </View>
  );
}

export function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <Empty
      icon="wifi-off"
      title="Couldn't load this"
      body="Check your connection. Nothing was charged."
      action={<Button label="Try again" kind="secondary" small onPress={onRetry} />}
    />
  );
}

// ---------------------------------------------------------------- screen shell

type ScreenProps = {
  title?: string;
  kicker?: string;
  back?: boolean;
  right?: ReactNode;
  children: ReactNode;
  dark?: boolean;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  footer?: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
};

export function Screen({ title, kicker, back = true, right, children, dark, scroll = true, refreshing, onRefresh, footer, contentStyle }: ScreenProps) {
  const router = useRouter();
  useStatusBar(dark ? 'light' : 'dark');
  const bg = dark ? C.night : C.paper;
  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {(back || right) && (
          <View style={s.topBar}>
            {back ? (
              <IconButton icon="arrow-left" label="Back" dark={dark} onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))} />
            ) : (
              <View />
            )}
            <View style={{ flexDirection: 'row', gap: 8 }}>{right}</View>
          </View>
        )}
        {scroll ? (
          <ScrollView
            contentContainerStyle={[s.content, contentStyle]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={dark ? C.nightText : C.ink} /> : undefined}
          >
            {title ? <ScreenTitle title={title} kicker={kicker} dark={dark} /> : null}
            {children}
          </ScrollView>
        ) : (
          <View style={[{ flex: 1 }, contentStyle]}>
            {title ? (
              <View style={{ paddingHorizontal: GUTTER }}>
                <ScreenTitle title={title} kicker={kicker} dark={dark} />
              </View>
            ) : null}
            {children}
          </View>
        )}
        {footer ? <View style={[s.footer, { backgroundColor: bg, borderTopColor: dark ? C.night3 : C.line }]}>{footer}</View> : null}
      </SafeAreaView>
    </View>
  );
}

export function ScreenTitle({ title, kicker, dark }: { title: string; kicker?: string; dark?: boolean }) {
  return (
    <View style={{ marginTop: 6, marginBottom: 6 }}>
      {kicker ? <Label color={dark ? C.nightMuted : C.ink3} style={{ marginBottom: 6 }}>{kicker}</Label> : null}
      <Display color={dark ? C.nightText : C.ink}>{title}</Display>
    </View>
  );
}

// ---------------------------------------------------------------- sheet

export function Sheet({ visible, onClose, title, children }: { visible: boolean; onClose: () => void; title: string; children: ReactNode }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
        <View style={s.sheet}>
          <View style={s.grabber} />
          <View style={[s.sectionHead, { marginBottom: 14 }]}>
            <Heading style={{ fontSize: 26, lineHeight: 30 }}>{title}</Heading>
            <IconButton icon="x" label="Close" onPress={onClose} />
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ---------------------------------------------------------------- tiny bits

export function Pill({ label, tone = 'neutral', icon }: { label: string; tone?: 'neutral' | 'green' | 'red' | 'gold' | 'dark'; icon?: IconName }) {
  const t = {
    neutral: { bg: C.paperDeep, fg: C.ink2 },
    green: { bg: C.greenSoft, fg: C.green },
    red: { bg: C.redSoft, fg: C.red },
    gold: { bg: C.goldSoft, fg: C.goldDeep },
    dark: { bg: C.night3, fg: C.nightText },
  }[tone];
  return (
    <View style={[s.pill, { backgroundColor: t.bg }]}>
      {icon && <Feather name={icon} size={11} color={t.fg} style={{ marginRight: 4 }} />}
      <Text style={{ fontFamily: F.semibold, fontSize: 12, color: t.fg }}>{label}</Text>
    </View>
  );
}

export const s = themed(() => StyleSheet.create({
  card: { backgroundColor: C.surface, borderRadius: R.md, borderWidth: StyleSheet.hairlineWidth, borderColor: C.line },
  cardDark: { backgroundColor: C.night, borderColor: C.night },
  button: { height: 54, borderRadius: R.pill, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 22 },
  buttonSmall: { height: 40, paddingHorizontal: 16 },
  iconBtn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: C.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: C.line },
  dot: { position: 'absolute', top: 9, right: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: C.red, borderWidth: 1.5, borderColor: C.surface },
  tile: { width: 58, height: 58, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  tileLabel: { fontFamily: F.medium, fontSize: 12.5, lineHeight: 16, color: C.ink, marginTop: 8, textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  field: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, borderRadius: R.sm, borderWidth: 1, borderColor: C.line, paddingHorizontal: 14, minHeight: 52 },
  fieldPrefix: { fontFamily: F.medium, fontSize: 16, color: C.ink3, marginRight: 8 },
  fieldInput: { flex: 1, fontFamily: F.medium, fontSize: 16, color: C.ink, paddingVertical: 14, ...NO_OUTLINE },
  segment: { flexDirection: 'row', backgroundColor: C.paperDeep, borderRadius: R.pill, padding: 4 },
  segmentItem: { flex: 1, height: 38, borderRadius: R.pill, alignItems: 'center', justifyContent: 'center' },
  chip: { flexDirection: 'row', alignItems: 'center', height: 36, paddingHorizontal: 14, borderRadius: R.pill, borderWidth: 1, borderColor: C.lineStrong, marginRight: 8 },
  toggle: { width: 46, height: 28, borderRadius: 14, padding: 3, justifyContent: 'center' },
  knob: { width: 22, height: 22, borderRadius: 11, backgroundColor: C.surface },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: GUTTER, paddingTop: 6, paddingBottom: 4 },
  content: { paddingHorizontal: GUTTER, paddingBottom: 130 },
  footer: { paddingHorizontal: GUTTER, paddingTop: 12, paddingBottom: 22, borderTopWidth: StyleSheet.hairlineWidth },
  backdrop: { flex: 1, backgroundColor: 'rgba(22,19,15,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: C.paper, borderTopLeftRadius: R.lg, borderTopRightRadius: R.lg, paddingHorizontal: GUTTER, paddingTop: 10, paddingBottom: 34, maxHeight: '90%' },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: C.lineStrong, marginBottom: 14 },
  pill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, height: 24, borderRadius: R.pill, alignSelf: 'flex-start' },
}));
