import { Stack } from 'expo-router';
import { C } from '../../src/ui/theme';

export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.paper }, animation: 'slide_from_right' }} />;
}
