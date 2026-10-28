// School Dock's own settings: school name, wallpaper, which apps show, the
// student passcode and lock. The admin screen edits them; a school's MDM can
// push the same keys as managed app configuration, which then win and show as
// "Set by your school" (keys listed in README).
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AppState, Platform } from 'react-native';

import { APP_ORDER, APPS, type AppId } from './apps';
import { managedConfig } from './lock';
import { DEFAULT_SITES } from './sites';
import { GREAT_NECK, type Place } from './weather';

export { DEFAULT_SITES };

export type DockConfig = {
  setup: boolean;                     // the first-run setup is done
  school: string;
  wallpaper: string;                  // a WALLPAPERS id, or 'photo'
  photo: string;                      // fsx path of the photo wallpaper
  apps: Record<AppId, boolean>;
  widgets: boolean;
  editSchedule: boolean;              // students may change the bell schedule
  passcode: string;                   // student passcode on the lock screen ('' = none)
  autoLock: boolean;                  // ask iOS for Single App Mode on every launch
  searchAnySite: boolean;             // Ray may open any site (SafeSearch still on)
  sites: string[];                    // sites Ray may open when searchAnySite is off
  place: Place;                       // where the Weather app and widgets forecast for
};

const DEFAULTS: DockConfig = {
  setup: false, school: '', wallpaper: 'north', photo: '',
  apps: Object.fromEntries(APP_ORDER.map((id) => [id, APPS[id].on])) as Record<AppId, boolean>,
  widgets: true, editSchedule: true, passcode: '', autoLock: true,
  searchAnySite: false, sites: DEFAULT_SITES, place: GREAT_NECK,
};

const KEY = 'dock.config.v1';
const PIN_KEY = 'dock.adminPin';

const secret = {
  get: async (k: string) => (Platform.OS === 'web' ? globalThis.localStorage?.getItem(k) ?? null : SecureStore.getItemAsync(k)),
  set: async (k: string, v: string) => (Platform.OS === 'web' ? globalThis.localStorage?.setItem(k, v) : SecureStore.setItemAsync(k, v)),
};

/** Managed keys a school can push (com.apple.configuration.managed). */
type Managed = Partial<Omit<DockConfig, 'setup' | 'photo'>> & { adminPin?: string };

function readManaged(): Managed {
  const m = managedConfig();
  const out: Managed = {};
  const str = (k: string) => (typeof m[k] === 'string' ? (m[k] as string) : typeof m[k] === 'number' ? String(m[k]) : undefined);
  const bool = (k: string) => (typeof m[k] === 'boolean' ? (m[k] as boolean) : typeof m[k] === 'number' ? !!m[k] : undefined);
  if (str('schoolName') != null) out.school = str('schoolName');
  if (str('wallpaper') != null) out.wallpaper = str('wallpaper');
  if (str('adminPin') != null) out.adminPin = str('adminPin');
  if (str('studentPasscode') != null) out.passcode = str('studentPasscode');
  if (bool('widgets') != null) out.widgets = bool('widgets');
  if (bool('studentsEditSchedule') != null) out.editSchedule = bool('studentsEditSchedule');
  if (bool('autoLock') != null) out.autoLock = bool('autoLock');
  if (bool('searchAnySite') != null) out.searchAnySite = bool('searchAnySite');
  const sites = m.allowedSites;
  const sl = Array.isArray(sites) ? sites.map(String) : typeof sites === 'string' ? sites.split(',') : null;
  if (sl) out.sites = sl.map((x) => x.trim().toLowerCase()).filter(Boolean);
  const apps = m.apps;
  const list = Array.isArray(apps) ? apps.map(String) : typeof apps === 'string' ? apps.split(',') : null;
  if (list) {
    const on = new Set(list.map((s) => s.trim().toLowerCase()));
    out.apps = Object.fromEntries(APP_ORDER.map((id) => [id, on.has(id)])) as Record<AppId, boolean>;
  }
  return out;
}

type Ctx = {
  cfg: DockConfig;                      // what's in effect (managed keys applied)
  loaded: boolean;
  managed: Set<keyof DockConfig>;       // keys the school's MDM controls
  set: (patch: Partial<DockConfig>) => void;
  checkPin: (pin: string) => Promise<boolean>;
  setPin: (pin: string) => Promise<void>;
  hasPin: boolean;
  pinManaged: boolean;
};

const DockCtx = createContext<Ctx | null>(null);

export function DockProvider({ children }: { children: ReactNode }) {
  const [own, setOwn] = useState(DEFAULTS);
  const [loaded, setLoaded] = useState(false);
  const [mdm, setMdm] = useState<Managed>(readManaged);
  const [pin, setPinState] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const s = await AsyncStorage.getItem(KEY);
        if (s) { const j = JSON.parse(s); setOwn({ ...DEFAULTS, ...j, apps: { ...DEFAULTS.apps, ...j.apps } }); }
      } catch {}
      try { setPinState(await secret.get(PIN_KEY)); } catch {}
      setLoaded(true);
    })();
    // The MDM can change the managed config while the app runs; re-read when it comes back.
    const sub = AppState.addEventListener('change', (st) => { if (st === 'active') setMdm(readManaged()); });
    return () => sub.remove();
  }, []);

  const set = useCallback((patch: Partial<DockConfig>) => {
    setOwn((prev) => {
      const next = { ...prev, ...patch };
      AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const value = useMemo<Ctx>(() => {
    const { adminPin, ...rest } = mdm;
    const cfg: DockConfig = { ...own, ...rest };
    if (adminPin) cfg.setup = true;   // a school-managed iPad needs no first-run setup
    const realPin = adminPin || pin;
    return {
      cfg, loaded,
      managed: new Set(Object.keys(rest) as (keyof DockConfig)[]),
      set,
      hasPin: !!realPin,
      pinManaged: !!adminPin,
      checkPin: async (p) => !!realPin && p === realPin,
      setPin: async (p) => { await secret.set(PIN_KEY, p); setPinState(p); },
    };
  }, [own, mdm, pin, loaded, set]);

  return <DockCtx.Provider value={value}>{children}</DockCtx.Provider>;
}

export function useDock() {
  const c = useContext(DockCtx);
  if (!c) throw new Error('useDock outside DockProvider');
  return c;
}

export const enabledApps = (cfg: DockConfig) => APP_ORDER.filter((id) => cfg.apps[id]);
