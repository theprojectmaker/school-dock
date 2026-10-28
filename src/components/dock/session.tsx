// Everything that sits above the apps: first-run setup, the lock screen (shown
// at launch and every time the iPad wakes, over whatever app was open), the
// admin screen, and asking iOS for Single App Mode when the school wants it.
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, StyleSheet, View } from 'react-native';

import { useDock } from '@/lib/dock';
import { isLocked, requestLock } from '@/lib/lock';
import { AdminScreen } from './admin';
import { type Guided, GuidedSheet, loadGuided, saveGuided } from './guided';
import { appById } from '@/lib/apps';
import { useLauncher } from './launcher';
import { LockScreen } from './lock-screen';
import { Setup } from './setup';

type Ctx = { openAdmin: () => void; lockNow: () => void; guided: Guided | null; openGuided: () => void };
const SessionCtx = createContext<Ctx>({ openAdmin: () => {}, lockNow: () => {}, guided: null, openGuided: () => {} });
export const useSession = () => useContext(SessionCtx);

export function SessionProvider({ children }: { children: ReactNode }) {
  const { cfg, loaded } = useDock();
  const launcher = useLauncher();
  const [locked, setLocked] = useState(true);
  const [wake, setWake] = useState(0);
  const [admin, setAdmin] = useState(false);
  const asked = useRef(false);
  const [guided, setGuided] = useState<Guided | null>(null);
  const [guidedSheet, setGuidedSheet] = useState(false);

  // A Guided Access session survives a relaunch until its time is up.
  useEffect(() => { loadGuided().then((g) => { if (g) setGuided(g); }); }, []);
  useEffect(() => {
    if (!guided?.until) return;
    const t = setInterval(() => {
      if (Date.now() >= guided.until!) { setGuided(null); saveGuided(null); setLocked(true); setWake((n) => n + 1); }
    }, 1000);
    return () => clearInterval(t);
  }, [guided]);

  // Lock again when the iPad comes back after sleeping or being away for a while.
  // A quick trip out (a share sheet, a stray swipe) shouldn't land on the lock screen.
  useEffect(() => {
    let away = 0;
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'background') away = Date.now();
      else if (s === 'active' && away) {
        if (Date.now() - away > 60_000) { setLocked(true); setWake((n) => n + 1); }
        away = 0;
      }
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
    guided,
    openGuided: () => setGuidedSheet(true),
  }), [guided]);
  const openApp = guided?.app ?? launcher.current;

  // During Guided Access the guided app is the only place to be (also after unlocking).
  useEffect(() => {
    if (guided && !locked && cfg.setup && launcher.current !== guided.app) {
      const t = setTimeout(() => launcher.launch(guided.app, 'guided'), 300);
      return () => clearTimeout(t);
    }
  }, [guided, locked, cfg.setup, launcher]);

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
      <GuidedSheet visible={guidedSheet} app={openApp ? appById(openApp, cfg.webApps) : null} active={guided}
        onClose={() => setGuidedSheet(false)}
        onStart={(min) => {
          if (!openApp) { setGuidedSheet(false); return; }
          const g: Guided = { app: openApp, until: min ? Date.now() + min * 60_000 : null, started: Date.now() };
          setGuided(g); saveGuided(g); setGuidedSheet(false);
        }}
        onEnd={() => { setGuided(null); saveGuided(null); setGuidedSheet(false); }} />
    </SessionCtx.Provider>
  );
}
