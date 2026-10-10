import React, { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { errorMessage, updateUser } from '../src/services/api';
import { useAuth } from '../src/context/AuthContext';
import { useGame } from '../src/game/GameContext';
import { Alert } from '../src/ui/dialog';
import { Avatar, Button, Card, Field, Screen, Small, Strong } from '../src/ui/kit';
import { C } from '../src/ui/theme';
import { formatCurrency } from '../src/utils/format';

export default function EditProfile() {
  const router = useRouter();
  const { user, updateUser: updateLocal } = useAuth();
  const { refresh } = useGame();
  const [name, setName] = useState(user?.name ?? '');
  const [income, setIncome] = useState(user?.monthly_income ? String(user.monthly_income) : '');
  const [fixed, setFixed] = useState(user?.fixed_expenses ? String(user.fixed_expenses) : '');
  const [busy, setBusy] = useState(false);
  const spare = (parseFloat(income) || 0) - (parseFloat(fixed) || 0);

  const save = async () => {
    if (!user?.id || !name.trim()) return;
    setBusy(true);
    try {
      const updates = { name: name.trim(), monthly_income: parseFloat(income) || 0, fixed_expenses: parseFloat(fixed) || 0 };
      await updateUser(user.id, updates);
      updateLocal(updates);
      refresh();
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
      <Field label="Take-home pay per month" prefix="₹" keyboardType="numeric" value={income} onChangeText={setIncome} hint="Used for budgets and insights. Never shared." />
      <Field label="Fixed costs per month" prefix="₹" keyboardType="numeric" value={fixed} onChangeText={setFixed} hint="Rent, EMIs, school fees: things you can't skip." />
      {!!income && (
        <Card style={{ backgroundColor: spare >= 0 ? C.greenSoft : C.redSoft, borderColor: 'transparent' }}>
          <Small color={C.ink2}>Left for everything else</Small>
          <Strong style={{ marginTop: 2, fontSize: 20 }} color={spare >= 0 ? C.green : C.red}>
            {formatCurrency(spare)}
          </Strong>
        </Card>
      )}
      <Small style={{ marginTop: 18 }}>Phone +91 {user?.phone} · used to sign in</Small>
    </Screen>
  );
}
