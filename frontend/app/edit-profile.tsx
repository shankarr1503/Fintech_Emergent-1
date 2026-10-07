import React, { useState } from 'react';
import { View } from 'react-native';
import { Alert } from '../src/game/dialog';
import { useRouter } from 'expo-router';
import { errorMessage, updateUser } from '../src/services/api';
import { useAuth } from '../src/context/AuthContext';
import { useGame } from '../src/game/GameContext';
import { C } from '../src/game/theme';
import { Body, Box, PixelButton, PixelInput, PText, Screen, Sprite } from '../src/game/ui';
import { formatCurrency } from '../src/utils/format';

export default function EditProfileScreen() {
  const router = useRouter();
  const { user, updateUser: updateLocal } = useAuth();
  const { refresh } = useGame();
  const [name, setName] = useState(user?.name ?? '');
  const [income, setIncome] = useState(user?.monthly_income ? String(user.monthly_income) : '');
  const [fixed, setFixed] = useState(user?.fixed_expenses ? String(user.fixed_expenses) : '');
  const [busy, setBusy] = useState(false);

  const spare = (parseFloat(income) || 0) - (parseFloat(fixed) || 0);

  const save = async () => {
    if (!user?.id) return;
    if (!name.trim()) return Alert.alert('Name needed', 'Every hero needs a name!');
    setBusy(true);
    try {
      const updates = { name: name.trim(), monthly_income: parseFloat(income) || 0, fixed_expenses: parseFloat(fixed) || 0 };
      await updateUser(user.id, updates);
      updateLocal(updates);
      refresh();
      router.back();
    } catch (e) {
      Alert.alert('Could not save', errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen title="EDIT PLAYER" subtitle="YOUR CHARACTER SHEET" ground>
      <View style={{ alignItems: 'center', marginVertical: 12 }}>
        <Sprite name="hero" scale={7} />
      </View>
      <Box>
        <PixelInput label="Hero name" placeholder="Your name" value={name} onChangeText={setName} maxLength={24} testID="name-input" />
        <PixelInput label="Monthly income" prefix="₹" keyboardType="numeric" value={income} onChangeText={setIncome} />
        <PixelInput label="Fixed expenses (rent, EMIs)" prefix="₹" keyboardType="numeric" value={fixed} onChangeText={setFixed} />
        {!!income && (
          <Box color={spare >= 0 ? '#D7F5B0' : '#FFD6D0'} padding={10} style={{ marginBottom: 14 }}>
            <PText size={8}>SPARE COINS / MONTH</PText>
            <PText size={14} color={spare >= 0 ? C.pipeDark : C.red} style={{ marginTop: 6 }}>
              {formatCurrency(spare)}
            </PText>
          </Box>
        )}
        <PixelButton label="SAVE" sprite="star" color={C.pipe} loading={busy} onPress={save} testID="save-profile" />
        <Body size={12} style={{ marginTop: 10 }}>
          Phone +91 {user?.phone} • used for sign-in only
        </Body>
      </Box>
    </Screen>
  );
}
