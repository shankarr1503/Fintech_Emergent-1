import React, { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../context/AuthContext';
import { dailyCheckIn, getGameProfile } from '../services/api';
import { C } from './theme';
import { Box, NATIVE_DRIVER, PText, Sprite, tap } from './ui';

export type Reward = {
  action?: string;
  xp_earned?: number;
  coins_earned?: number;
  total_xp?: number;
  level?: number;
  leveled_up?: boolean;
  title?: string;
  quests_completed?: { id: string; title: string; reward_coins: number }[];
  new_achievements?: { id: string; name: string; desc: string }[];
};

export type GameProfile = {
  name: string;
  coins: number;
  xp: number;
  level: number;
  title: string;
  world: string;
  xp_into_level: number;
  xp_for_next: number;
  progress: number;
  streak: number;
  best_streak: number;
  checked_in_today: boolean;
  quests: { id: string; title: string; desc: string; target: number; progress: number; done: boolean; reward_coins: number }[];
  achievements: { id: string; name: string; desc: string; icon: string; unlocked: boolean }[];
};

type Celebration = { headline: string; reward?: Reward; extraCoins?: number };

type GameCtx = {
  profile: GameProfile | null;
  refresh: () => Promise<void>;
  checkIn: () => Promise<void>;
  /** Show the coin-burst overlay for a reward returned by the API, then refresh the HUD. */
  celebrate: (headline: string, reward?: Reward, extraCoins?: number) => void;
};

const Ctx = createContext<GameCtx | undefined>(undefined);

export function GameProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<GameProfile | null>(null);
  const [celebration, setCelebration] = useState<Celebration | null>(null);

  const refresh = useCallback(async () => {
    if (!user?.id) return;
    try {
      setProfile(await getGameProfile(user.id));
    } catch (e) {
      console.warn('Failed to load game profile', e);
    }
  }, [user?.id]);

  useEffect(() => {
    setProfile(null);
    refresh();
  }, [refresh]);

  const celebrate = useCallback(
    (headline: string, reward?: Reward, extraCoins?: number) => {
      setCelebration({ headline, reward, extraCoins });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      refresh();
    },
    [refresh],
  );

  const checkIn = useCallback(async () => {
    if (!user?.id) return;
    const res = await dailyCheckIn(user.id);
    if (!res.already_checked_in) celebrate(`DAY ${res.streak} STREAK!`, res.reward);
    else refresh();
  }, [user?.id, celebrate, refresh]);

  return (
    <Ctx.Provider value={{ profile, refresh, checkIn, celebrate }}>
      {children}
      {celebration && <CelebrationOverlay data={celebration} onDone={() => setCelebration(null)} />}
    </Ctx.Provider>
  );
}

export function useGame() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}

// ---------------------------------------------------------------- overlay

const BURST = 14;

function FlyingCoin({ index, progress }: { index: number; progress: Animated.Value }) {
  const angle = (index / BURST) * Math.PI - Math.PI; // upper half-circle
  const dist = 110 + (index % 3) * 40;
  const tx = Math.cos(angle) * dist;
  const peak = Math.sin(angle) * dist;
  const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [0, tx] });
  const translateY = progress.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, peak, peak + 260] });
  const opacity = progress.interpolate({ inputRange: [0, 0.1, 0.75, 1], outputRange: [0, 1, 1, 0] });
  const rotate = progress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${(index % 2 ? 1 : -1) * 540}deg`] });
  return (
    <Animated.View style={{ position: 'absolute', opacity, transform: [{ translateX }, { translateY }, { rotateY: rotate }] }}>
      <Sprite name="coin" scale={4} />
    </Animated.View>
  );
}

function CelebrationOverlay({ data, onDone }: { data: Celebration; onDone: () => void }) {
  const { height } = useWindowDimensions();
  const burst = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(0)).current;
  const hero = useRef(new Animated.Value(0)).current;
  const { reward } = data;
  const coins = (reward?.coins_earned || 0) + (data.extraCoins || 0);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(burst, { toValue: 1, duration: 1300, easing: Easing.out(Easing.quad), useNativeDriver: NATIVE_DRIVER }),
      Animated.spring(pop, { toValue: 1, friction: 5, tension: 120, useNativeDriver: NATIVE_DRIVER }),
      Animated.sequence([
        Animated.timing(hero, { toValue: 1, duration: 260, easing: Easing.out(Easing.quad), useNativeDriver: NATIVE_DRIVER }),
        Animated.timing(hero, { toValue: 0, duration: 300, easing: Easing.bounce, useNativeDriver: NATIVE_DRIVER }),
      ]),
    ]).start();
    const extra = (reward?.quests_completed?.length || 0) + (reward?.new_achievements?.length || 0) + (reward?.leveled_up ? 1 : 0);
    const id = setTimeout(onDone, 2600 + extra * 700);
    return () => clearTimeout(id);
  }, [burst, pop, hero, onDone, reward]);

  const scale = pop.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] });
  const heroY = hero.interpolate({ inputRange: [0, 1], outputRange: [0, -60] });

  return (
    <Pressable
      style={[StyleSheet.absoluteFill, styles.overlay]}
      onPress={() => {
        tap();
        onDone();
      }}
      accessibilityLabel="Dismiss celebration"
    >
      <View style={{ alignItems: 'center', marginTop: -height * 0.06 }}>
        <View style={{ alignItems: 'center', justifyContent: 'center', height: 120 }}>
          {Array.from({ length: BURST }).map((_, i) => (
            <FlyingCoin key={i} index={i} progress={burst} />
          ))}
          <Animated.View style={{ transform: [{ translateY: heroY }] }}>
            <Sprite name="heroJump" scale={6} />
          </Animated.View>
        </View>

        <Animated.View style={{ transform: [{ scale }], alignItems: 'center', marginTop: 18 }}>
          <PText size={18} color={C.coin} shadow={C.ink} center>
            {data.headline}
          </PText>
          <View style={styles.rewardRow}>
            {coins > 0 && (
              <View style={styles.pill}>
                <Sprite name="coin" scale={2} />
                <PText size={11} color={C.ink} style={{ marginLeft: 6 }}>
                  +{coins}
                </PText>
              </View>
            )}
            {!!reward?.xp_earned && (
              <View style={[styles.pill, { backgroundColor: C.cyan }]}>
                <Sprite name="star" scale={2} />
                <PText size={11} color={C.ink} style={{ marginLeft: 6 }}>
                  +{reward.xp_earned} XP
                </PText>
              </View>
            )}
          </View>

          {reward?.leveled_up && (
            <Box color={C.coin} style={{ marginTop: 16 }} padding={12}>
              <PText size={12} center>
                LEVEL UP! LV {reward.level}
              </PText>
              <PText size={8} center color={C.textMuted} style={{ marginTop: 6 }}>
                {reward.title?.toUpperCase()}
              </PText>
            </Box>
          )}
          {reward?.quests_completed?.map((q) => (
            <Box key={q.id} color={C.pipeLight} style={{ marginTop: 12 }} padding={10}>
              <PText size={9} center>
                QUEST CLEAR: {q.title.toUpperCase()}
              </PText>
            </Box>
          ))}
          {reward?.new_achievements?.map((a) => (
            <Box key={a.id} color={C.paper} style={{ marginTop: 12 }} padding={10}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Sprite name="trophy" scale={3} />
                <View style={{ marginLeft: 10 }}>
                  <PText size={9}>BADGE: {a.name.toUpperCase()}</PText>
                  <PText size={7} color={C.textMuted} style={{ marginTop: 4 }}>
                    {a.desc}
                  </PText>
                </View>
              </View>
            </Box>
          ))}
          <PText size={7} color={C.white} style={{ marginTop: 22, opacity: 0.8 }}>
            TAP TO CONTINUE
          </PText>
        </Animated.View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: { backgroundColor: 'rgba(0,0,20,0.78)', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  rewardRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.coin,
    borderWidth: 3,
    borderColor: C.ink,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
});
