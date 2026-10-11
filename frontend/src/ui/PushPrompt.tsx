import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { pushStatus, registerForPush } from '../services/push';
import { Button, Card, IconMark, Small, Strong } from './kit';

const DISMISSED = 'push_prompt_dismissed';

/** Explains why alerts matter before the system permission prompt, and only appears until answered. */
export function PushPrompt({ userId }: { userId: string }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    (async () => {
      const dismissed = await AsyncStorage.getItem(DISMISSED).catch(() => null);
      setShow(!dismissed && (await pushStatus()) === 'undetermined');
    })();
  }, []);

  if (!show) return null;

  const done = () => {
    setShow(false);
    AsyncStorage.setItem(DISMISSED, '1').catch(() => {});
  };

  return (
    <Card style={{ marginTop: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        <IconMark icon="bell" tint="alerts" />
        <View style={{ flex: 1, marginLeft: 14 }}>
          <Strong>Get an alert for every payment</Strong>
          <Small style={{ marginTop: 4 }}>We’ll tell you the moment money leaves or arrives, and if someone signs in on another phone. You can choose what you get in Settings.</Small>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
        <Button label="Not now" kind="ghost" small style={{ flex: 1 }} onPress={done} />
        <Button
          label="Turn on alerts"
          small
          style={{ flex: 1 }}
          onPress={async () => {
            await registerForPush(userId, true);
            done();
          }}
        />
      </View>
    </Card>
  );
}
