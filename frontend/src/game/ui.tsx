import React, { ReactNode, useEffect, useRef, useState } from 'react';
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
  useWindowDimensions,
} from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { BORDER, C, F, SHADOW, World, WORLD_BG } from './theme';
import { PALETTE, SPRITES, SpriteName } from './sprites';

// Keeps pixel edges sharp on web; harmless on native.
const CRISP = { shapeRendering: 'crispEdges' } as object;

export const NATIVE_DRIVER = Platform.OS !== 'web';

export const tap = (style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) => {
  if (Platform.OS !== 'web') Haptics.impactAsync(style).catch(() => {});
};

// ---------------------------------------------------------------- Sprite

export const Sprite = React.memo(function Sprite({
  name,
  scale = 3,
  style,
}: {
  name: SpriteName;
  scale?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const rows = SPRITES[name];
  const w = rows[0].length;
  const h = rows.length;
  const rects: React.ReactElement[] = [];
  rows.forEach((row, y) => {
    // Merge horizontal runs of the same colour to keep the SVG light.
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      let run = 1;
      while (x + run < row.length && row[x + run] === ch) run++;
      if (ch !== '.') {
        rects.push(<Rect key={`${x}-${y}`} x={x} y={y} width={run} height={1} fill={PALETTE[ch]} />);
      }
      x += run;
    }
  });
  return (
    <View style={style} pointerEvents="none">
      <Svg width={w * scale} height={h * scale} viewBox={`0 0 ${w} ${h}`} {...CRISP}>
        {rects}
      </Svg>
    </View>
  );
});

// ---------------------------------------------------------------- Text

type PTextProps = {
  children: ReactNode;
  size?: number;
  color?: string;
  shadow?: string | false;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  center?: boolean;
  testID?: string;
  selectable?: boolean;
};

/** Pixel-font text. Use for titles, numbers and short labels only. */
export function PText({ children, size = 10, color = C.text, shadow = false, style, numberOfLines, center, testID, selectable }: PTextProps) {
  return (
    <Text
      testID={testID}
      selectable={selectable}
      numberOfLines={numberOfLines}
      style={[
        {
          fontFamily: F.pixel,
          fontSize: size,
          lineHeight: Math.round(size * 1.6),
          color,
          textAlign: center ? 'center' : undefined,
        },
        shadow ? { textShadowColor: shadow, textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 0.1 } : null,
        style,
      ]}
    >
      {children}
    </Text>
  );
}

/** Readable body text for descriptions. */
export function Body({ children, size = 14, color = C.textMuted, style, numberOfLines, bold, center }: PTextProps & { bold?: boolean }) {
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[{ fontSize: size, lineHeight: size * 1.4, color, fontWeight: bold ? '700' : '500', textAlign: center ? 'center' : undefined }, style]}
    >
      {children}
    </Text>
  );
}

// ---------------------------------------------------------------- Box

type BoxProps = {
  children?: ReactNode;
  color?: string;
  style?: StyleProp<ViewStyle>;
  padding?: number;
  shadow?: boolean;
};

/** The core surface: thick ink border, flat fill, hard offset shadow. */
export function Box({ children, color = C.paper, style, padding = 14, shadow = true }: BoxProps) {
  return (
    <View style={[styles.boxWrap, shadow && { marginRight: SHADOW, marginBottom: SHADOW }, style]}>
      {shadow && <View style={styles.boxShadow} />}
      <View style={[styles.box, { backgroundColor: color, padding }]}>
        <View style={styles.boxHighlight} pointerEvents="none" />
        {children}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------- Button

type ButtonProps = {
  label: string;
  onPress?: () => void;
  color?: string;
  textColor?: string;
  sprite?: SpriteName;
  disabled?: boolean;
  loading?: boolean;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function PixelButton({ label, onPress, color = C.red, textColor = C.white, sprite, disabled, loading, small, style, testID }: ButtonProps) {
  const inactive = disabled || loading;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={inactive}
      onPress={() => {
        tap(Haptics.ImpactFeedbackStyle.Medium);
        onPress?.();
      }}
      style={[{ marginRight: SHADOW, marginBottom: SHADOW }, style]}
    >
      {({ pressed }) => (
        <View>
          <View style={[styles.boxShadow, { opacity: pressed ? 0 : 1 }]} />
          <View
            style={[
              styles.button,
              small && styles.buttonSmall,
              { backgroundColor: inactive ? C.gray : color },
              pressed && { transform: [{ translateX: SHADOW }, { translateY: SHADOW }] },
            ]}
          >
            <View style={styles.buttonHighlight} pointerEvents="none" />
            {loading ? (
              <ActivityIndicator color={textColor} />
            ) : (
              <>
                {sprite && <Sprite name={sprite} scale={small ? 2 : 2.5} style={{ marginRight: 8 }} />}
                <PText size={small ? 9 : 11} color={inactive ? C.grayDark : textColor}>
                  {label}
                </PText>
              </>
            )}
          </View>
        </View>
      )}
    </Pressable>
  );
}

// ---------------------------------------------------------------- Coin

/** A coin that spins like the classic pickup. */
export function SpinningCoin({ scale = 3, speed = 900 }: { scale?: number; speed?: number }) {
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: speed, easing: Easing.linear, useNativeDriver: NATIVE_DRIVER }),
    );
    loop.start();
    return () => loop.stop();
  }, [spin, speed]);
  const scaleX = spin.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [1, 0.15, 1, 0.15, 1] });
  return (
    <Animated.View style={{ transform: [{ scaleX }] }}>
      <Sprite name="coin" scale={scale} />
    </Animated.View>
  );
}

/** Inline "coin × 1,234" counter. */
export function CoinCount({ value, size = 10, color = C.text, scale = 2 }: { value: number | string; size?: number; color?: string; scale?: number }) {
  return (
    <View style={styles.row}>
      <Sprite name="coin" scale={scale} />
      <PText size={size} color={color} style={{ marginLeft: 6 }}>
        ×{typeof value === 'number' ? value.toLocaleString('en-IN') : value}
      </PText>
    </View>
  );
}

// ---------------------------------------------------------------- Mystery block

/** A bumpable "?" block. Tapping bounces it and pops a coin before running onPress. */
export function MysteryBlock({
  label,
  sprite,
  onPress,
  size = 64,
  color = C.block,
  testID,
}: {
  label: string;
  sprite?: SpriteName;
  onPress?: () => void;
  size?: number;
  color?: string;
  testID?: string;
}) {
  const bump = useRef(new Animated.Value(0)).current;
  const coin = useRef(new Animated.Value(0)).current;

  const hit = () => {
    tap(Haptics.ImpactFeedbackStyle.Heavy);
    bump.setValue(0);
    coin.setValue(0);
    Animated.parallel([
      Animated.sequence([
        Animated.timing(bump, { toValue: 1, duration: 90, useNativeDriver: NATIVE_DRIVER }),
        Animated.timing(bump, { toValue: 0, duration: 120, easing: Easing.bounce, useNativeDriver: NATIVE_DRIVER }),
      ]),
      Animated.timing(coin, { toValue: 1, duration: 380, easing: Easing.out(Easing.quad), useNativeDriver: NATIVE_DRIVER }),
    ]).start(() => onPress?.());
  };

  const translateY = bump.interpolate({ inputRange: [0, 1], outputRange: [0, -10] });
  const coinY = coin.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, -size * 0.9, -size * 0.6] });
  const coinOpacity = coin.interpolate({ inputRange: [0, 0.1, 0.85, 1], outputRange: [0, 1, 1, 0] });

  return (
    <Pressable onPress={hit} accessibilityRole="button" accessibilityLabel={label} testID={testID} style={{ alignItems: 'center', width: size + 18 }}>
      <Animated.View style={{ position: 'absolute', top: 6, opacity: coinOpacity, transform: [{ translateY: coinY }] }}>
        <Sprite name="coin" scale={3} />
      </Animated.View>
      <Animated.View style={[styles.block, { width: size, height: size, backgroundColor: color, transform: [{ translateY }] }]}>
        <View style={styles.blockLight} />
        <View style={styles.blockDark} />
        {[styles.rivetTL, styles.rivetTR, styles.rivetBL, styles.rivetBR].map((r, i) => (
          <View key={i} style={[styles.rivet, r]} />
        ))}
        {sprite ? <Sprite name={sprite} scale={Math.max(2, Math.floor(size / 22))} /> : <PText size={size * 0.4} color={C.white} shadow={C.blockDark}>?</PText>}
      </Animated.View>
      <PText size={8} color={C.white} shadow={C.ink} center style={{ marginTop: 8 }} numberOfLines={2}>
        {label}
      </PText>
    </Pressable>
  );
}

// ---------------------------------------------------------------- Bars

/** Segmented progress bar, like a health/power meter. */
export function SegmentBar({
  value,
  max = 100,
  color = C.pipe,
  segments = 10,
  height = 14,
  track = '#2b2b2b',
}: {
  value: number;
  max?: number;
  color?: string;
  segments?: number;
  height?: number;
  track?: string;
}) {
  const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  const filled = pct * segments;
  return (
    <View style={[styles.barTrack, { height: height + BORDER * 2, backgroundColor: track }]}>
      {Array.from({ length: segments }).map((_, i) => {
        const fill = Math.max(0, Math.min(1, filled - i));
        return (
          <View key={i} style={[styles.barSeg, { height }]}>
            {fill > 0 && <View style={{ width: `${fill * 100}%`, height: '100%', backgroundColor: color }} />}
            {fill > 0 && <View style={styles.barShine} />}
          </View>
        );
      })}
    </View>
  );
}

// ---------------------------------------------------------------- Background

function DriftingCloud({ top, delay, width, scale }: { top: number; delay: number; width: number; scale: number }) {
  const x = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(x, { toValue: 1, duration: 38000, delay, easing: Easing.linear, useNativeDriver: NATIVE_DRIVER }),
    );
    loop.start();
    return () => loop.stop();
  }, [x, delay]);
  const translateX = x.interpolate({ inputRange: [0, 1], outputRange: [width + 20, -16 * scale - 20] });
  return (
    <Animated.View style={{ position: 'absolute', top, opacity: 0.95, transform: [{ translateX }] }}>
      <Sprite name="cloud" scale={scale} />
    </Animated.View>
  );
}

export function GroundStrip({ height = 28 }: { height?: number }) {
  const { width } = useWindowDimensions();
  const tiles = Math.ceil(width / height) + 1;
  return (
    <View style={{ height, flexDirection: 'row', overflow: 'hidden', borderTopWidth: BORDER, borderColor: C.ink }}>
      {Array.from({ length: tiles }).map((_, i) => (
        <View key={i} style={[styles.groundTile, { width: height, height }]}>
          <View style={styles.groundLine} />
          <View style={[styles.groundJoint, { left: i % 2 ? '25%' : '70%' }]} />
        </View>
      ))}
    </View>
  );
}

function Hills() {
  return (
    <View style={styles.hills} pointerEvents="none">
      <View style={[styles.hill, { width: 220, height: 110, left: -40 }]}>
        <View style={[styles.hillEye, { left: 90, top: 30 }]} />
        <View style={[styles.hillEye, { left: 120, top: 30 }]} />
      </View>
      <View style={[styles.hill, { width: 150, height: 70, right: -20, backgroundColor: C.pipeLight }]} />
    </View>
  );
}

export function SkyBackground({ world = 'overworld' }: { world?: World }) {
  const { width } = useWindowDimensions();
  if (world === 'overworld') {
    return (
      <View style={[StyleSheet.absoluteFill, { backgroundColor: WORLD_BG.overworld }]} pointerEvents="none">
        <DriftingCloud top={70} delay={0} width={width} scale={4} />
        <DriftingCloud top={190} delay={14000} width={width} scale={3} />
        <DriftingCloud top={330} delay={26000} width={width} scale={5} />
        <Hills />
      </View>
    );
  }
  // Underground / castle / night: dark with a faint brick pattern and twinkles.
  const accent = world === 'castle' ? C.lava : world === 'underground' ? C.cyan : C.coin;
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: WORLD_BG[world] }]} pointerEvents="none">
      {Array.from({ length: 18 }).map((_, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            width: 4,
            height: 4,
            backgroundColor: accent,
            opacity: 0.35,
            left: ((i * 97) % 100) + '%' as any,
            top: ((i * 53) % 90) + '%' as any,
          }}
        />
      ))}
      {world === 'castle' && <View style={styles.lava} />}
    </View>
  );
}

// ---------------------------------------------------------------- Screen shell

export function BackPipe({ onPress, light }: { onPress: () => void; light?: boolean }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel="Back" hitSlop={10} style={styles.backBtn}>
      <View style={[styles.backInner, light && { backgroundColor: C.paper }]}>
        <PText size={12} color={C.ink}>
          {'<'}
        </PText>
      </View>
    </Pressable>
  );
}

type ScreenProps = {
  title: string;
  subtitle?: string;
  world?: World;
  back?: boolean;
  right?: ReactNode;
  children: ReactNode;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  ground?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
};

export function Screen({
  title,
  subtitle,
  world = 'overworld',
  back = true,
  right,
  children,
  scroll = true,
  refreshing,
  onRefresh,
  ground = false,
  contentStyle,
}: ScreenProps) {
  const router = useRouter();
  const dark = world !== 'overworld';
  const header = (
    <View style={styles.header}>
      {back && <BackPipe onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))} />}
      <View style={{ flex: 1, marginLeft: back ? 12 : 0 }}>
        <PText size={14} color={C.white} shadow={C.ink} numberOfLines={1}>
          {title}
        </PText>
        {subtitle ? (
          <PText size={8} color={dark ? C.coin : C.paper} style={{ marginTop: 4 }} numberOfLines={1}>
            {subtitle}
          </PText>
        ) : null}
      </View>
      {right}
    </View>
  );
  return (
    <View style={{ flex: 1, backgroundColor: WORLD_BG[world] }}>
      <SkyBackground world={world} />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {header}
        {scroll ? (
          <ScrollView
            contentContainerStyle={[styles.content, contentStyle]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={C.coin} /> : undefined}
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[{ flex: 1 }, contentStyle]}>{children}</View>
        )}
      </SafeAreaView>
      {ground && <GroundStrip />}
    </View>
  );
}

// ---------------------------------------------------------------- Misc pieces

export function SectionTitle({ children, light = true, right }: { children: ReactNode; light?: boolean; right?: ReactNode }) {
  return (
    <View style={[styles.row, { justifyContent: 'space-between', marginTop: 22, marginBottom: 10 }]}>
      <PText size={11} color={light ? C.white : C.text} shadow={light ? C.ink : false}>
        {children}
      </PText>
      {right}
    </View>
  );
}

export function Chip({ label, active, onPress, color = C.coin }: { label: string; active?: boolean; onPress?: () => void; color?: string }) {
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress?.();
      }}
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
      style={[styles.chip, { backgroundColor: active ? color : C.paper }, active && { transform: [{ translateY: 2 }] }]}
    >
      <PText size={8} color={C.ink}>
        {label.toUpperCase()}
      </PText>
    </Pressable>
  );
}

export function PixelInput(props: TextInputProps & { label?: string; prefix?: string }) {
  const { label, prefix, style, ...rest } = props;
  return (
    <View style={{ marginBottom: 14 }}>
      {label ? (
        <PText size={8} color={C.text} style={{ marginBottom: 6 }}>
          {label.toUpperCase()}
        </PText>
      ) : null}
      <View style={styles.input}>
        {prefix ? (
          <PText size={11} color={C.textMuted} style={{ marginRight: 8 }}>
            {prefix}
          </PText>
        ) : null}
        <TextInput placeholderTextColor="#9b9070" style={[styles.inputText, style]} {...rest} />
      </View>
    </View>
  );
}

export function PixelSwitch({ value, onChange, disabled }: { value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      onPress={() => {
        tap();
        onChange(!value);
      }}
      style={[styles.switch, { backgroundColor: value ? C.pipe : C.grayDark, opacity: disabled ? 0.5 : 1 }]}
    >
      <View style={[styles.switchKnob, { alignSelf: value ? 'flex-end' : 'flex-start' }]} />
    </Pressable>
  );
}

export function Loading({ label = 'LOADING...', world = 'overworld' }: { label?: string; world?: World }) {
  return (
    <View style={{ flex: 1, backgroundColor: WORLD_BG[world], alignItems: 'center', justifyContent: 'center' }}>
      <SkyBackground world={world} />
      <SpinningCoin scale={6} />
      <PText size={12} color={C.white} shadow={C.ink} style={{ marginTop: 20 }}>
        {label}
      </PText>
    </View>
  );
}

export function EmptyState({ sprite = 'chest', title, body, action }: { sprite?: SpriteName; title: string; body?: string; action?: ReactNode }) {
  return (
    <Box style={{ alignItems: 'center' }}>
      <View style={{ alignItems: 'center', paddingVertical: 10 }}>
        <Sprite name={sprite} scale={5} />
        <PText size={11} center style={{ marginTop: 14 }}>
          {title}
        </PText>
        {body ? (
          <Body center style={{ marginTop: 8 }}>
            {body}
          </Body>
        ) : null}
        {action ? <View style={{ marginTop: 14 }}>{action}</View> : null}
      </View>
    </Box>
  );
}

/** Small label/value pair used inside boxes. */
export function Stat({ label, value, color = C.text, align = 'left' }: { label: string; value: string; color?: string; align?: 'left' | 'center' | 'right' }) {
  return (
    <View style={{ alignItems: align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center' }}>
      <PText size={7} color={C.textMuted}>
        {label.toUpperCase()}
      </PText>
      <PText size={11} color={color} style={{ marginTop: 6 }}>
        {value}
      </PText>
    </View>
  );
}

export function SpriteBadge({ sprite, color = C.paperDark, size = 44 }: { sprite: SpriteName; color?: string; size?: number }) {
  return (
    <View style={[styles.badge, { width: size, height: size, backgroundColor: color }]}>
      <Sprite name={sprite} scale={Math.max(2, Math.floor(size / 16))} />
    </View>
  );
}

/** Bottom sheet styled as a game dialog. */
export function PixelSheet({ visible, onClose, title, children }: { visible: boolean; onClose: () => void; title: string; children: ReactNode }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.sheetBackdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
        <View style={styles.sheet}>
          <View style={[styles.row, { justifyContent: 'space-between', marginBottom: 16 }]}>
            <PText size={12}>{title}</PText>
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" hitSlop={12} style={styles.closeBtn}>
              <PText size={10} color={C.white}>
                X
              </PText>
            </Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

/** Typewriter text for "dialog box" moments. */
export function TypeText({ text, speed = 22, ...rest }: Omit<PTextProps, 'children'> & { text: string; speed?: number }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    setN(0);
    const id = setInterval(() => setN((v) => (v >= text.length ? v : v + 1)), speed);
    return () => clearInterval(id);
  }, [text, speed]);
  return <PText {...rest}>{text.slice(0, n)}</PText>;
}

export const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  boxWrap: { position: 'relative' },
  boxShadow: { position: 'absolute', left: SHADOW, top: SHADOW, right: -SHADOW, bottom: -SHADOW, backgroundColor: C.ink },
  box: { borderWidth: BORDER, borderColor: C.ink, overflow: 'hidden' },
  boxHighlight: { position: 'absolute', left: 0, right: 0, top: 0, height: 3, backgroundColor: 'rgba(255,255,255,0.55)' },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: BORDER,
    borderColor: C.ink,
    paddingVertical: 15,
    paddingHorizontal: 18,
    minHeight: 54,
  },
  buttonSmall: { paddingVertical: 9, paddingHorizontal: 12, minHeight: 38 },
  buttonHighlight: { position: 'absolute', left: 0, right: 0, top: 0, height: 4, backgroundColor: 'rgba(255,255,255,0.35)' },
  block: { borderWidth: BORDER, borderColor: C.ink, alignItems: 'center', justifyContent: 'center' },
  blockLight: { position: 'absolute', left: 0, top: 0, right: 0, height: 4, backgroundColor: C.blockLight },
  blockDark: { position: 'absolute', left: 0, bottom: 0, right: 0, height: 4, backgroundColor: C.blockDark },
  rivet: { position: 'absolute', width: 4, height: 4, backgroundColor: C.ink },
  rivetTL: { left: 5, top: 7 },
  rivetTR: { right: 5, top: 7 },
  rivetBL: { left: 5, bottom: 7 },
  rivetBR: { right: 5, bottom: 7 },
  barTrack: { flexDirection: 'row', borderWidth: BORDER, borderColor: C.ink, padding: 0, gap: 2 },
  barSeg: { flex: 1, backgroundColor: 'rgba(255,255,255,0.12)', overflow: 'hidden' },
  barShine: { position: 'absolute', left: 0, right: 0, top: 0, height: 3, backgroundColor: 'rgba(255,255,255,0.45)' },
  groundTile: { backgroundColor: C.brick, borderRightWidth: 2, borderColor: C.brickDark, overflow: 'hidden' },
  groundLine: { position: 'absolute', left: 0, right: 0, top: '50%', height: 2, backgroundColor: C.brickDark },
  groundJoint: { position: 'absolute', top: '50%', width: 2, height: '50%', backgroundColor: C.brickDark },
  hills: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 120 },
  hill: {
    position: 'absolute',
    bottom: -4,
    backgroundColor: C.pipe,
    borderTopLeftRadius: 999,
    borderTopRightRadius: 999,
    borderWidth: BORDER,
    borderColor: C.ink,
  },
  hillEye: { position: 'absolute', width: 6, height: 14, backgroundColor: C.ink },
  lava: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 26, backgroundColor: C.lava, borderTopWidth: BORDER, borderColor: C.ink },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  content: { paddingHorizontal: 16, paddingBottom: 120 },
  backBtn: { width: 42, height: 42, backgroundColor: C.pipeDark, borderWidth: BORDER, borderColor: C.ink, padding: 3 },
  backInner: { flex: 1, backgroundColor: C.pipeLight, alignItems: 'center', justifyContent: 'center' },
  chip: { borderWidth: BORDER, borderColor: C.ink, paddingHorizontal: 12, paddingVertical: 9, marginRight: 8 },
  input: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: BORDER,
    borderColor: C.ink,
    backgroundColor: C.white,
    paddingHorizontal: 12,
    minHeight: 52,
  },
  inputText: { flex: 1, fontSize: 16, fontWeight: '700', color: C.text, paddingVertical: 12 },
  switch: { width: 58, height: 32, borderWidth: BORDER, borderColor: C.ink, padding: 3, justifyContent: 'center' },
  switchKnob: { width: 22, height: 20, backgroundColor: C.white, borderWidth: 2, borderColor: C.ink },
  badge: { borderWidth: BORDER, borderColor: C.ink, alignItems: 'center', justifyContent: 'center' },
  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: C.paper,
    borderTopWidth: BORDER * 2,
    borderColor: C.ink,
    padding: 20,
    paddingBottom: 36,
    maxHeight: '88%',
  },
  closeBtn: { width: 34, height: 34, backgroundColor: C.red, borderWidth: BORDER, borderColor: C.ink, alignItems: 'center', justifyContent: 'center' },
});
