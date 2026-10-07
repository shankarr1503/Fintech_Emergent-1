// Composite, app-specific building blocks shared by several screens.
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { formatCurrency } from '../utils/format';
import { useGame } from './GameContext';
import { SpriteName } from './sprites';
import { BORDER, C, categoryMeta } from './theme';
import { Body, CoinCount, PText, SegmentBar, Sprite, SpriteBadge, tap } from './ui';

/** Classic top-of-screen status line: player, coins, level, world. */
export function PlayerHUD() {
  const { profile } = useGame();
  const router = useRouter();
  return (
    <Pressable
      onPress={() => {
        tap();
        router.push('/profile');
      }}
      accessibilityRole="button"
      accessibilityLabel="Open player profile"
      testID="hud"
      style={styles.hud}
    >
      <View style={styles.avatar}>
        <Sprite name="hero" scale={2.5} />
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <View style={styles.hudRow}>
          <PText size={10} color={C.white} shadow={C.ink} numberOfLines={1} style={{ flexShrink: 1 }}>
            {(profile?.name || 'PLAYER 1').toUpperCase()}
          </PText>
          <PText size={8} color={C.coin} shadow={C.ink}>
            WORLD {profile?.world ?? '1-1'}
          </PText>
        </View>
        <View style={[styles.hudRow, { marginTop: 8 }]}>
          <PText size={8} color={C.white} shadow={C.ink}>
            LV {profile?.level ?? 1}
          </PText>
          <CoinCount value={profile?.coins ?? 0} size={9} color={C.white} />
        </View>
        <View style={{ marginTop: 8 }}>
          <SegmentBar value={profile?.progress ?? 0} max={100} color={C.cyan} segments={12} height={8} />
        </View>
        <PText size={6} color={C.paper} style={{ marginTop: 5 }}>
          {profile ? `${profile.xp_into_level}/${profile.xp_for_next} XP • ${profile.title.toUpperCase()}` : 'LOADING...'}
        </PText>
      </View>
    </Pressable>
  );
}

export type Txn = {
  id?: string;
  merchant: string;
  category: string;
  amount: number;
  type: 'credit' | 'debit';
  date?: string;
  is_recurring?: boolean;
};

export function TxnRow({ txn, last }: { txn: Txn; last?: boolean }) {
  const meta = categoryMeta(txn.category);
  const credit = txn.type === 'credit';
  return (
    <View style={[styles.txn, !last && styles.txnDivider]}>
      <SpriteBadge sprite={meta.sprite as SpriteName} color={meta.color} size={40} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Body bold color={C.text} numberOfLines={1}>
          {txn.merchant}
        </Body>
        <PText size={7} color={C.textMuted} style={{ marginTop: 4 }}>
          {txn.category.toUpperCase()}
          {txn.is_recurring ? ' • REPEAT' : ''}
        </PText>
      </View>
      <PText size={10} color={credit ? C.pipe : C.red}>
        {credit ? '+' : '-'}
        {formatCurrency(txn.amount)}
      </PText>
    </View>
  );
}

/** Tappable list row used in settings-style menus. */
export function MenuRow({
  sprite,
  label,
  hint,
  onPress,
  right,
  danger,
  testID,
}: {
  sprite: SpriteName;
  label: string;
  hint?: string;
  onPress?: () => void;
  right?: React.ReactNode;
  danger?: boolean;
  testID?: string;
}) {
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress?.();
      }}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      testID={testID}
      style={({ pressed }) => [styles.menuRow, pressed && { backgroundColor: C.paperDark }]}
    >
      <Sprite name={sprite} scale={2.5} />
      <View style={{ flex: 1, marginLeft: 14 }}>
        <PText size={9} color={danger ? C.red : C.text}>
          {label.toUpperCase()}
        </PText>
        {hint ? (
          <Body size={12} style={{ marginTop: 4 }}>
            {hint}
          </Body>
        ) : null}
      </View>
      {right ?? (onPress ? <PText size={10}>{'>'}</PText> : null)}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hud: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderWidth: BORDER,
    borderColor: C.ink,
    padding: 10,
  },
  avatar: {
    width: 52,
    height: 58,
    backgroundColor: C.skyLight,
    borderWidth: BORDER,
    borderColor: C.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hudRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  txn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  txnDivider: { borderBottomWidth: 2, borderColor: C.paperDark, borderStyle: 'dashed' },
  menuRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 4, borderBottomWidth: 2, borderColor: C.paperDark },
});
