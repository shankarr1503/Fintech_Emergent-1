import { useEffect, useState } from 'react';
import { getAppConfig } from './api';

type Config = { demo_mode: boolean; terms_version: string };

let cached: Config | null = null;
let pending: Promise<Config> | null = null;

/** Public server flags (demo mode, terms version), fetched once per app start. */
export function useAppConfig(): Config | null {
  const [config, setConfig] = useState(cached);
  useEffect(() => {
    if (cached) return;
    pending = pending ?? getAppConfig().then((c) => (cached = c));
    pending.then(setConfig).catch(() => (pending = null));
  }, []);
  return config;
}

/** True while the server runs on sample data (no real money, sample bills, scores and vouchers). */
export const useDemo = () => useAppConfig()?.demo_mode ?? false;
