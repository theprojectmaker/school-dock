// Locking a student into the app (modules/school-lock). On a supervised iPad
// whose MDM allows it, lock(true) turns on Autonomous Single App Mode; anywhere
// else iOS says no and the teacher uses Guided Access instead (see README).
import { requireNativeModule } from 'expo-modules-core';
import { useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';

type Native = {
  status(): boolean;
  lock(on: boolean): Promise<boolean>;
  managedConfig(): Record<string, unknown>;
  addListener(name: 'onLockChange', fn: (e: { locked: boolean }) => void): { remove(): void };
};

let N: Native | null = null;
if (Platform.OS === 'ios') {
  try { N = requireNativeModule<Native>('SchoolLock'); } catch { N = null; }
}

export const lockAvailable = () => !!N;

/** True while any single-app lock is on (ASAM, Guided Access or the MDM's Single App Mode). */
export const isLocked = () => { try { return N?.status() ?? false; } catch { return false; } };

/** Asks iOS to lock (or unlock) the iPad into School Dock. Resolves false when iOS says no. */
export async function requestLock(on: boolean): Promise<boolean> {
  if (!N) return false;
  try { return await N.lock(on); } catch { return false; }
}

/** What the school's MDM pushed as managed app configuration (empty when none). */
export function managedConfig(): Record<string, unknown> {
  try { return N?.managedConfig() ?? {}; } catch { return {}; }
}

/** Live lock state: follows Guided Access / Single App Mode turning on and off. */
export function useLocked() {
  const [locked, setLocked] = useState(isLocked);
  useEffect(() => {
    const sub = N?.addListener('onLockChange', (e) => setLocked(!!e.locked));
    const app = AppState.addEventListener('change', (s) => { if (s === 'active') setLocked(isLocked()); });
    return () => { sub?.remove(); app.remove(); };
  }, []);
  return locked;
}
