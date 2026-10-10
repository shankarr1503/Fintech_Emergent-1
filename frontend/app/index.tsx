import { Redirect } from 'expo-router';
import { View } from 'react-native';
import { useAuth } from '../src/context/AuthContext';
import { C } from '../src/ui/theme';

export default function Index() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <View style={{ flex: 1, backgroundColor: C.paper }} />;
  return <Redirect href={user ? '/(tabs)' : '/(auth)/login'} />;
}
