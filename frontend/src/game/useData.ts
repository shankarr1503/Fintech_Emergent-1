import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';

/**
 * Loads data for the signed-in user and exposes loading / pull-to-refresh state.
 * `load` receives the user id; it is re-run whenever `deps` change.
 */
export function useUserData<T>(load: (userId: string) => Promise<T>, deps: unknown[] = []) {
  const { user } = useAuth();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const loadRef = useRef(load);
  loadRef.current = load;

  const run = useCallback(async () => {
    if (!user?.id) return;
    try {
      setData(await loadRef.current(user.id));
      setError(null);
    } catch (e) {
      console.warn('Load failed', e);
      setError(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, ...deps]);

  useEffect(() => {
    run();
  }, [run]);

  const refresh = useCallback(() => {
    setRefreshing(true);
    run();
  }, [run]);

  return { data, setData, loading, refreshing, refresh, reload: run, error, userId: user?.id ?? '' };
}
