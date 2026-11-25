import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { isMacAddress, maskHostOrIp, maskIpv4, maskMac, maskSensitiveText } from '../utils/masking';

const DEMO_MODE_KEY = 'netpulse_demo_mode';

interface DemoModeContextValue {
  demoMode: boolean;
  setDemoMode: (next: boolean) => void;
  toggleDemoMode: () => void;
  maskHost: (value?: string | null) => string;
  maskIp: (value?: string | null) => string;
  maskMacAddr: (value?: string | null) => string;
  maskText: (value?: string | null) => string;
}

const DemoModeContext = createContext<DemoModeContextValue | null>(null);

export const DemoModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [demoMode, setDemoModeState] = useState<boolean>(() => {
    try {
      return window.localStorage.getItem(DEMO_MODE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(DEMO_MODE_KEY, demoMode ? 'true' : 'false');
    } catch {
      // Ignore storage error
    }
  }, [demoMode]);

  const setDemoMode = useCallback((next: boolean) => setDemoModeState(next), []);
  const toggleDemoMode = useCallback(() => setDemoModeState((prev) => !prev), []);

  const value = useMemo<DemoModeContextValue>(
    () => ({
      demoMode,
      setDemoMode,
      toggleDemoMode,
      maskHost: (val) => {
        if (!val) return 'No data';
        return demoMode ? maskHostOrIp(val) : val;
      },
      maskIp: (val) => {
        if (!val) return 'No data';
        return demoMode ? maskIpv4(val) : val;
      },
      maskMacAddr: (val) => {
        if (!val) return 'No data';
        if (!demoMode) return val;
        return isMacAddress(val) ? maskMac(val) : maskSensitiveText(val);
      },
      maskText: (val) => {
        if (!val) return '';
        return demoMode ? maskSensitiveText(val) : val;
      },
    }),
    [demoMode, setDemoMode, toggleDemoMode]
  );

  return <DemoModeContext.Provider value={value}>{children}</DemoModeContext.Provider>;
};

export const useDemoMode = (): DemoModeContextValue => {
  const ctx = useContext(DemoModeContext);
  if (!ctx) {
    throw new Error('useDemoMode must be used within DemoModeProvider');
  }
  return ctx;
};
