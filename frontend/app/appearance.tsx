import React from 'react';
import { View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { AppearancePref, useAppearance } from '../src/ui/appearance';
import { Card, Divider, IconMark, IconName, Row, Screen, Section, Small } from '../src/ui/kit';
import { C } from '../src/ui/theme';

const OPTIONS: { value: AppearancePref; label: string; sub: string; icon: IconName }[] = [
  { value: 'system', label: 'Match my phone', sub: 'Switches with your phone’s dark mode', icon: 'smartphone' },
  { value: 'light', label: 'Light', sub: 'Easier to read in daylight', icon: 'sun' },
  { value: 'dark', label: 'Dark', sub: 'Easier on the eyes at night', icon: 'moon' },
];

export default function Appearance() {
  const { preference, setPreference } = useAppearance();
  return (
    <Screen title="Appearance">
      <Section title="Theme" style={{ marginTop: 18 }}>
        <Card padded={false} style={{ paddingHorizontal: 16 }}>
          {OPTIONS.map((o, i) => {
            const on = preference === o.value;
            return (
              <View key={o.value}>
                {i > 0 && <Divider inset={54} />}
                <Row
                  left={<IconMark icon={o.icon} tint={o.value} />}
                  title={o.label}
                  subtitle={o.sub}
                  right={<Feather name={on ? 'check-circle' : 'circle'} size={20} color={on ? C.green : C.lineStrong} />}
                  onPress={() => !on && setPreference(o.value, '/appearance')}
                  role="radio"
                  checked={on}
                  testID={`theme-${o.value}`}
                />
              </View>
            );
          })}
        </Card>
      </Section>
      <Small style={{ marginTop: 16 }}>Text size follows your phone’s accessibility settings.</Small>
    </Screen>
  );
}
