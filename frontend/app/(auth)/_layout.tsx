import { Stack } from 'expo-router';
import { C } from '../../src/game/theme';

export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.sky }, animation: 'slide_from_right' }} />;
}
