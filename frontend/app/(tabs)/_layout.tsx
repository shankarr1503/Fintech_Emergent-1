import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, F, themed } from '../../src/ui/theme';
import { haptic, IconName } from '../../src/ui/kit';

// expo-router ships its own copy of the tab navigator types, so derive props from it.
type BottomTabBarProps = Parameters<NonNullable<React.ComponentProps<typeof Tabs>['tabBar']>>[0];

const TABS: Record<string, { label: string; icon: IconName }> = {
  index: { label: 'Home', icon: 'home' },
  money: { label: 'Money', icon: 'pie-chart' },
  rewards: { label: 'Rewards', icon: 'award' },
  me: { label: 'Me', icon: 'user' },
};

function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const tab = (index: number) => {
    const route = state.routes[index];
    const meta = TABS[route.name];
    const focused = state.index === index;
    return (
      <Pressable
        key={route.key}
        testID={`tab-${route.name}`}
        accessibilityRole="tab"
        accessibilityState={{ selected: focused }} aria-selected={focused}
        accessibilityLabel={meta.label}
        onPress={() => {
          haptic();
          const e = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !e.defaultPrevented) navigation.navigate(route.name);
        }}
        style={styles.tab}
      >
        <Feather name={meta.icon} size={21} color={focused ? C.ink : C.ink3} />
        <Text style={[styles.label, { color: focused ? C.ink : C.ink3 }]}>{meta.label}</Text>
        {focused && <View style={styles.activeDot} />}
      </Pressable>
    );
  };
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {tab(0)}
      {tab(1)}
      <View style={styles.tab}>
        <Pressable
          testID="tab-scan"
          onPress={() => {
            haptic('medium');
            router.push('/scan');
          }}
          accessibilityRole="button"
          accessibilityLabel="Scan and pay"
          style={({ pressed }) => [styles.scan, pressed && { transform: [{ scale: 0.94 }] }]}
        >
          <Feather name="maximize" size={24} color={C.onPrimary} />
        </Pressable>
      </View>
      {tab(2)}
      {tab(3)}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="money" />
      <Tabs.Screen name="rewards" />
      <Tabs.Screen name="me" />
    </Tabs>
  );
}

const styles = themed(() => StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: C.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.line,
    paddingTop: 8,
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 2 },
  label: { fontFamily: F.medium, fontSize: 11, marginTop: 4 },
  activeDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: C.gold, marginTop: 3 },
  scan: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -26,
    borderWidth: 4,
    borderColor: C.paper,
  },
}));
