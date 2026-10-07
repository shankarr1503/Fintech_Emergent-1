import React from 'react';
import { Tabs } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BORDER, C } from '../../src/game/theme';
import { PText, Sprite, tap } from '../../src/game/ui';
import { SpriteName } from '../../src/game/sprites';

// expo-router ships its own copy of the tab navigator types, so derive props from it.
type BottomTabBarProps = Parameters<NonNullable<React.ComponentProps<typeof Tabs>['tabBar']>>[0];

const TABS: Record<string, { label: string; sprite: SpriteName }> = {
  index: { label: 'HOME', sprite: 'house' },
  transactions: { label: 'LOG', sprite: 'scroll' },
  pay: { label: 'PAY', sprite: 'coin' },
  debts: { label: 'BOSS', sprite: 'boss' },
  savings: { label: 'GOALS', sprite: 'flag' },
};

function BrickTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <View style={styles.mortar} pointerEvents="none" />
      {state.routes.map((route, index) => {
        const meta = TABS[route.name];
        if (!meta) return null;
        const focused = state.index === index;
        const isPay = route.name === 'pay';
        const onPress = () => {
          tap();
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
        };
        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={meta.label}
            testID={`tab-${route.name}`}
            style={styles.tab}
          >
            {isPay ? (
              <View style={styles.payBlock}>
                <View style={styles.payLight} />
                <Sprite name="coin" scale={3} />
              </View>
            ) : (
              <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
                <Sprite name={meta.sprite} scale={2} />
              </View>
            )}
            <PText size={7} color={focused ? C.coin : C.white} shadow={C.ink} style={{ marginTop: 4 }}>
              {meta.label}
            </PText>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs tabBar={(props) => <BrickTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="transactions" />
      <Tabs.Screen name="pay" />
      <Tabs.Screen name="debts" />
      <Tabs.Screen name="savings" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: C.brick,
    borderTopWidth: BORDER,
    borderColor: C.ink,
    paddingTop: 8,
    paddingHorizontal: 6,
  },
  mortar: { position: 'absolute', left: 0, right: 0, top: 26, height: 2, backgroundColor: C.brickDark },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  iconWrap: { width: 40, height: 34, alignItems: 'center', justifyContent: 'center' },
  iconWrapActive: { backgroundColor: 'rgba(0,0,0,0.25)', borderWidth: 2, borderColor: C.coin },
  payBlock: {
    width: 58,
    height: 58,
    marginTop: -30,
    backgroundColor: C.block,
    borderWidth: BORDER,
    borderColor: C.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payLight: { position: 'absolute', top: 0, left: 0, right: 0, height: 5, backgroundColor: C.blockLight },
});
