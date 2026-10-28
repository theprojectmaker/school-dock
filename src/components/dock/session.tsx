// Everything that sits above the apps: first-run setup, the lock screen (shown
// at launch and every time the iPad wakes, over whatever app was open), the
// admin screen, and asking iOS for Single App Mode when the school wants it.
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, StyleSheet, View } from 'react-native';

import { useDock } from '@/lib/dock';
import { isLocked, requestLock } from '@/lib/lock';
import { AdminScreen } from './admin';
import { useLauncher } from './launcher';
import { LockScreen } from './lock-screen';
import { Setup } from './setup';

type Ctx = { openAdmin: () => void; lockNow: () => void };
const SessionCtx = createContext<Ctx>({ openAdmin: () => {}, lockNow: () => {} });
export const useSession = () => useContext(SessionCtx);

export function SessionProvider({ children }: { children: ReactNode }) {
  const { cfg, loaded } = useDock();
  const launcher = useLauncher();
  const [locked, setLocked] = useState(true);
  const [wake, setWake] = useState(0);
  const [admin, setAdmin] = useState(false);
  const asked = useRef(false);

  // Lock again whenever the iPad comes back from sleep or the background.
  useEffect(() => {
    let last = AppState.currentState;
    const sub = AppState.addEventListener('change', (s) => {
      if (last === 'background' && s === 'active') { setLocked(true); setWake((n) => n + 1); }
      last = s;
    });
    return () => sub.remove();
  }, []);

  // Ask iOS for Autonomous Single App Mode once per launch (a no-op on unmanaged iPads).
  useEffect(() => {
    if (!loaded || !cfg.setup || !cfg.autoLock || asked.current) return;
    asked.current = true;
    if (!isLocked()) requestLock(true);
  }, [loaded, cfg.setup, cfg.autoLock]);

  const value = useMemo<Ctx>(() => ({
    openAdmin: () => setAdmin(true),
    lockNow: () => { setLocked(true); setWake((n) => n + 1); },
  }), []);

  const editSchedule = useCallback(() => {
    setAdmin(false);
    setTimeout(() => launcher.launch('studento', 'dock:studento', 'edit=1'), 450);
  }, [launcher]);

  if (!loaded) return <View style={{ flex: 1, backgroundColor: '#000' }} />;

  return (
    <SessionCtx.Provider value={value}>
      {children}
      {!cfg.setup ? (
        <View style={StyleSheet.absoluteFill}><Setup /></View>
      ) : locked ? (
        <LockScreen wakeKey={wake} onUnlock={() => setLocked(false)} onAdmin={() => setAdmin(true)} />
      ) : null}
      <AdminScreen visible={admin} onClose={() => setAdmin(false)} onEditSchedule={editSchedule} />
    </SessionCtx.Provider>
  );
}
