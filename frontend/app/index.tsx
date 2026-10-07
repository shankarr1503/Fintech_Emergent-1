import { Redirect } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { Loading } from '../src/game/ui';

export default function Index() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <Loading label="WORLD 1-1" />;
  return <Redirect href={user ? '/(tabs)' : '/(auth)/login'} />;
}
