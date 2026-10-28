// Guided Access, School Dock style: lock the student into the app that's open,
// optionally for a set time. A teacher triple-taps the home bar, enters the
// admin passcode, picks a time limit and starts; while it runs the home bar
// does nothing. Triple-tap + passcode ends it early; when time is up it ends
// on its own and the lock screen comes back.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlurView } from 'expo-blur';
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import type { DockApp } from '@/lib/apps';
import { useDock } from '@/lib/dock';
import { AppIconArt } from './app-icon';
import { PasscodePad } from './passcode';

export type Guided = { app: string; until: number | null; started: number };
const KEY = 'dock.guided.v1';

export const loadGuided = async (): Promise<Guided | null> => {
  try {
    const g = JSON.parse((await AsyncStorage.getItem(KEY)) ?? 'null') as Guided | null;
    return g && (g.until == null || g.until > Date.now()) ? g : null;
  } catch { return null; }
};
export const saveGuided = (g: Guided | null) => AsyncStorage.setItem(KEY, JSON.stringify(g)).catch(() => {});

const LIMITS: [number | null, string][] = [[null, 'No limit'], [15, '15 min'], [30, '30 min'], [45, '45 min'], [60, '1 hour'], [90, '90 min']];

export const remaining = (g: Guided) => {
  if (g.until == null) return '';
  const s = Math.max(0, Math.round((g.until - Date.now()) / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')} left`;
};

/** The sheet a triple-tap opens: passcode first, then the options (or End when one is running). */
export function GuidedSheet({ visible, app, active, onStart, onEnd, onClose }: {
  visible: boolean; app: DockApp | null; active: Guided | null;
  onStart: (minutes: number | null) => void; onEnd: () => void; onClose: () => void;
}) {
  const dock = useDock();
  const [ok, setOk] = useState(false);
  const [limit, setLimit] = useState<number | null>(null);
  const [, tick] = useState(0);
  useEffect(() => { if (visible) { setOk(!dock.hasPin); setLimit(null); } }, [visible, dock.hasPin]);
  useEffect(() => { if (!visible || !active) return; const t = setInterval(() => tick((n) => n + 1), 1000); return () => clearInterval(t); }, [visible, active]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.35)' }]} />
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        {!ok ? (
          <PasscodePad title="Guided Access" subtitle="Enter the admin passcode" length={6}
            onSubmit={async (c) => { if (await dock.checkPin(c)) { setOk(true); return true; } return false; }} onCancel={onClose} />
        ) : (
          <View style={{ width: 420, borderRadius: 24, overflow: 'hidden', backgroundColor: 'rgba(242,242,247,0.97)', padding: 24, alignItems: 'center' }}>
            {app ? <AppIconArt app={app} size={64} /> : null}
            <Text style={{ fontSize: 22, fontWeight: '700', color: '#000', marginTop: 14 }}>Guided Access</Text>
            <Text style={{ fontSize: 15, color: '#6C6C70', marginTop: 6, textAlign: 'center' }}>
              {active ? `Students are locked in ${app?.name ?? 'this app'}${active.until ? `, ${remaining(active)}` : ''}.` : `Keep students in ${app?.name ?? 'this app'} until you end it.`}
            </Text>
            {!active ? (
              <>
                <Text style={{ alignSelf: 'flex-start', fontSize: 13, color: '#6C6C70', fontWeight: '600', marginTop: 22, marginBottom: 8 }}>TIME LIMIT</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignSelf: 'stretch' }}>
                  {LIMITS.map(([m, l]) => (
                    <Pressable key={l} onPress={() => setLimit(m)} style={{ paddingHorizontal: 14, height: 34, borderRadius: 17, justifyContent: 'center', backgroundColor: limit === m ? '#007AFF' : '#fff' }}>
                      <Text style={{ color: limit === m ? '#fff' : '#000', fontSize: 15, fontWeight: '600' }}>{l}</Text>
                    </Pressable>
                  ))}
                </View>
              </>
            ) : null}
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 26, alignSelf: 'stretch' }}>
              <Pressable onPress={onClose} style={{ flex: 1, height: 48, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#007AFF', fontSize: 17, fontWeight: '600' }}>Cancel</Text>
              </Pressable>
              <Pressable onPress={() => (active ? onEnd() : onStart(limit))} style={{ flex: 1, height: 48, borderRadius: 14, backgroundColor: active ? '#FF3B30' : '#34C759', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#fff', fontSize: 17, fontWeight: '600' }}>{active ? 'End' : 'Start'}</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}
