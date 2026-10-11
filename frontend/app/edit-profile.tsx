import React, { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { errorMessage, updateUser } from '../src/services/api';
import { useAuth } from '../src/context/AuthContext';
import { useGame } from '../src/game/GameContext';
import { Alert } from '../src/ui/dialog';
import { Avatar, Button, Field, Screen, Small } from '../src/ui/kit';

export default function EditProfile() {
  const router = useRouter();
  const { user, updateUser: updateLocal } = useAuth();
  const { refresh } = useGame();
  const [name, setName] = useState(user?.name ?? '');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!user?.id || !name.trim()) return;
    setBusy(true);
    try {
      const updates = { name: name.trim() };
      await updateUser(user.id, updates);
      updateLocal(updates);
      refresh();
      Alert.alert('Saved', 'Your name has been updated.');
      router.back();
    } catch (e) {
      Alert.alert("Couldn't save", errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen title="Profile" footer={<Button label="Save" disabled={!name.trim()} loading={busy} onPress={save} testID="save-profile" />}>
      <View style={{ alignItems: 'center', marginVertical: 18 }}>
        <Avatar name={name} size={84} />
      </View>
      <Field label="Your name" placeholder="As you'd like us to call you" value={name} onChangeText={setName} maxLength={40} testID="name-input" />
      <Small style={{ marginTop: 4 }}>Shown only to you, on your Home screen and receipts.</Small>
      <Small style={{ marginTop: 18 }}>Phone +91 {user?.phone} · used to sign in. To change it, contact support.</Small>
    </Screen>
  );
}
