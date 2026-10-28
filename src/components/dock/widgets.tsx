// Home screen widgets (Up Next, Due Soon, Recent Notes) and the two small
// lock screen widgets. They read what the mini apps already saved on the
// iPad: the bell schedule, the last Classroom refresh and the notes library.
import { useCallback, useEffect, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Image, Pressable, StyleSheet, Text, useColorScheme, View, type ViewStyle } from 'react-native';

import { Icon } from '@/components/ui';
import { type Assignment, cached, courseColor, dueLabel } from '@/lib/classroom';
import { fsx } from '@/lib/fsx';
import { useLibrary } from '@/lib/library';
import { notePath } from '@/lib/noteio';
import { useDock } from '@/lib/dock';
import { fmtTime, loadSchedule, type Schedule, whereNow } from '@/lib/schedule';
import { condition, type Forecast, getForecast } from '@/lib/weather';
import type { LockWidget } from '@/lib/layout';

export type HomeData = { schedule: Schedule; due: Assignment[] | null; now: Date; weather: Forecast | null };

/** Schedule + Classroom cache (re-read whenever `key` changes, e.g. the home screen is shown) and a ticking clock. */
export function useHomeData(key: unknown): HomeData {
  const [schedule, setSchedule] = useState<Schedule>({ periods: [], theme: 0 });
  const [due, setDue] = useState<Assignment[] | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [weather, setWeather] = useState<Forecast | null>(null);
  const { cfg } = useDock();
  const place = cfg.apps.weather ? cfg.place : null;
  const refresh = useCallback(() => {
    if (place) getForecast(place).then(setWeather).catch(() => {});
    loadSchedule().then(setSchedule);
    cached().then((d) => setDue(d ? d.items.filter((a) => a.status !== 'done' && (a.due == null || a.due > Date.now() - 7 * 864e5))
      .sort((a, b) => (a.due ?? 9e15) - (b.due ?? 9e15)) : null)).catch(() => setDue(null));
  }, [place]);
  useEffect(refresh, [key, refresh]);
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return { schedule, due, now, weather: place ? weather : null };
}

export const mmss = (s: number) => {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(x).padStart(2, '0')}` : `${m}:${String(x).padStart(2, '0')}`;
};

export function useWidgetColors() {
  const dark = useColorScheme() === 'dark';
  return dark
    ? { bg: '#1C1C1E', text: '#FFFFFF', sub: 'rgba(235,235,245,0.6)', line: 'rgba(84,84,88,0.6)', track: '#3A3A3C', dark }
    : { bg: '#FFFFFF', text: '#000000', sub: 'rgba(60,60,67,0.6)', line: 'rgba(60,60,67,0.18)', track: '#E5E5EA', dark };
}

/** The widget card: continuous corners, opaque like iPadOS widgets, pressable. */
export function Card({ w, h, onPress, onLongPress, children, refKey, register, bg, pad = 16 }: {
  w: number; h: number; onPress: () => void; onLongPress?: () => void; children: React.ReactNode; refKey: string;
  register?: (key: string, v: any) => void; bg?: [string, string]; pad?: number;
}) {
  const c = useWidgetColors();
  return (
    <Pressable ref={(v) => register?.(refKey, v)} onPress={onPress} onLongPress={onLongPress} delayLongPress={450}
      style={({ pressed }) => ({ width: w, height: h, transform: [{ scale: pressed ? 0.97 : 1 }],
        shadowColor: '#000', shadowOpacity: 0.16, shadowRadius: 16, shadowOffset: { width: 0, height: 6 } } as ViewStyle)}>
      <View style={{ flex: 1, borderRadius: 22, borderCurve: 'continuous', backgroundColor: c.bg, overflow: 'hidden', padding: pad } as ViewStyle}>
        {bg ? <LinearGradient colors={bg} style={StyleSheet.absoluteFill} /> : null}
        {children}
      </View>
    </Pressable>
  );
}

export function Header({ icon, label, color }: { icon: string; label: string; color: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
      <Icon name={icon} size={13} color={color} />
      <Text style={{ color, fontSize: 12.5, fontWeight: '700', letterSpacing: 0.3 }}>{label}</Text>
    </View>
  );
}

export type WidgetProps = { w: number; h: number; data: HomeData; onPress: () => void; onLongPress?: () => void; register: (key: string, v: any) => void; refKey?: string };

export function UpNextWidget({ w, h, data, onPress, onLongPress, register, refKey = 'widget:studento' }: WidgetProps) {
  const c = useWidgetColors();
  const at = whereNow(data.schedule, data.now);
  const orange = '#FF8A1F';
  const day = data.now.toLocaleDateString([], { weekday: 'long' });
  return (
    <Card w={w} h={h} onPress={onPress} onLongPress={onLongPress} refKey={refKey} register={register}>
      <Header icon="bell.fill" label={at.kind === 'class' ? 'IN CLASS' : at.kind === 'passing' ? 'UP NEXT' : day.toUpperCase()} color={orange} />
      {at.kind === 'class' ? (
        <View style={{ flex: 1, justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 6 }}>
            <Text numberOfLines={1} style={{ flex: 1, color: c.text, fontSize: 22, fontWeight: '700', letterSpacing: -0.3 }}>{at.period.name}</Text>
            <Text style={{ color: c.text, fontSize: 30, fontWeight: '600', fontVariant: ['tabular-nums'], letterSpacing: -0.5 }}>{mmss(at.left)}</Text>
          </View>
          <View>
            <View style={{ height: 6, borderRadius: 3, backgroundColor: c.track, overflow: 'hidden' }}>
              <View style={{ width: `${Math.max(2, Math.min(100, 100 * (1 - at.left / at.total)))}%`, height: 6, borderRadius: 3, backgroundColor: orange }} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
              <Text style={{ color: c.sub, fontSize: 13, fontWeight: '500' }}>Ends {fmtTime(at.period.end)}</Text>
              <Text numberOfLines={1} style={{ color: c.sub, fontSize: 13, fontWeight: '500' }}>{at.next ? `Next: ${at.next.name} ${fmtTime(at.next.start)}` : 'Last class'}</Text>
            </View>
          </View>
        </View>
      ) : at.kind === 'passing' ? (
        <View style={{ flex: 1, justifyContent: 'space-between' }}>
          <Text numberOfLines={1} style={{ color: c.text, fontSize: 22, fontWeight: '700', marginTop: 6, letterSpacing: -0.3 }}>{at.next.name}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <Text style={{ color: c.sub, fontSize: 13, fontWeight: '500' }}>Starts {fmtTime(at.next.start)}</Text>
            <Text style={{ color: c.text, fontSize: 30, fontWeight: '600', fontVariant: ['tabular-nums'] }}>{mmss(at.left)}</Text>
          </View>
        </View>
      ) : (
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text style={{ color: c.text, fontSize: 17, fontWeight: '600' }}>{data.schedule.periods.length ? 'No class right now' : 'No bell schedule yet'}</Text>
            <Text style={{ color: c.sub, fontSize: 13, marginTop: 3 }}>{data.schedule.periods.length ? 'Enjoy the break.' : 'Add your periods in Studento.'}</Text>
          </View>
          <Text style={{ color: c.text, fontSize: 52, fontWeight: '300', letterSpacing: -1.5, lineHeight: 56 }}>{data.now.getDate()}</Text>
        </View>
      )}
    </Card>
  );
}

export function DueSoonWidget({ w, h, data, onPress, onLongPress, register, refKey = 'widget:classroom' }: WidgetProps) {
  const c = useWidgetColors();
  const green = '#1FA855';
  const rows = Math.max(1, Math.floor((h - 52) / 40));
  const list = (data.due ?? []).slice(0, rows);
  return (
    <Card w={w} h={h} onPress={onPress} onLongPress={onLongPress} refKey={refKey} register={register}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Header icon="graduationcap.fill" label="DUE SOON" color={green} />
        {data.due?.length ? <Text style={{ color: c.sub, fontSize: 12.5, fontWeight: '600' }}>{data.due.length} to do</Text> : null}
      </View>
      {data.due == null ? (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <Text style={{ color: c.text, fontSize: 17, fontWeight: '600' }}>Classroom</Text>
          <Text style={{ color: c.sub, fontSize: 13, marginTop: 3 }}>Sign in to see what's due.</Text>
        </View>
      ) : !list.length ? (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <Text style={{ color: c.text, fontSize: 17, fontWeight: '600' }}>All caught up</Text>
          <Text style={{ color: c.sub, fontSize: 13, marginTop: 3 }}>Nothing due right now.</Text>
        </View>
      ) : (
        <View style={{ marginTop: 8, gap: 6 }}>
          {list.map((a) => (
            <View key={`${a.courseId}:${a.id}`} style={{ flexDirection: 'row', gap: 9, height: 34, alignItems: 'center' }}>
              <View style={{ width: 4, height: 30, borderRadius: 2, backgroundColor: courseColor(a.courseId) }} />
              <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={{ color: c.text, fontSize: 14, fontWeight: '600' }}>{a.title}</Text>
                <Text numberOfLines={1} style={{ color: a.status === 'missing' ? '#FF3B30' : c.sub, fontSize: 12 }}>{a.course} · {a.status === 'missing' ? 'Missing' : dueLabel(a.due)}</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </Card>
  );
}

export function NotesWidget({ w, h, onPress, onLongPress, register, refKey = 'widget:quill' }: Omit<WidgetProps, 'data'>) {
  const c = useWidgetColors();
  const lib = useLibrary();
  const recent = lib.lib.notes.slice().sort((a, b) => b.updated - a.updated).slice(0, 3);
  const tileH = h - 62;
  const tileW = Math.min(tileH * 0.78, (w - 32 - 24) / 3);
  return (
    <Card w={w} h={h} onPress={onPress} onLongPress={onLongPress} refKey={refKey} register={register}>
      <Header icon="pencil.and.scribble" label="RECENT NOTES" color="#2F6BFF" />
      {recent.length ? (
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 10 }}>
          {recent.map((n) => (
            <View key={n.id} style={{ width: tileW }}>
              <View style={{ width: tileW, height: tileH - 18, borderRadius: 8, overflow: 'hidden', backgroundColor: c.dark ? '#2C2C2E' : '#F2F2F7', borderWidth: 0.5, borderColor: c.line }}>
                {n.thumb ? <Image source={{ uri: fsx.uri(notePath(n.id, n.thumb)) }} style={{ width: '100%', height: '100%' }} resizeMode="cover" /> : null}
              </View>
              <Text numberOfLines={1} style={{ color: c.text, fontSize: 12, fontWeight: '600', marginTop: 4 }}>{n.title}</Text>
            </View>
          ))}
        </View>
      ) : (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <Text style={{ color: c.text, fontSize: 17, fontWeight: '600' }}>No notes yet</Text>
          <Text style={{ color: c.sub, fontSize: 13, marginTop: 3 }}>Start one in Quill.</Text>
        </View>
      )}
    </Card>
  );
}

/** Lock screen widgets: monochrome, translucent, under the clock, in the order the student picked. */
export function LockWidgets({ data, kinds, color = '#FFFFFF' }: { data: HomeData; kinds: LockWidget[]; color?: string }) {
  const lib = useLibrary();
  const at = whereNow(data.schedule, data.now);
  const items: { key: string; icon: string; top: string; main: string }[] = [];
  for (const k of kinds) {
    if (k === 'weather' && data.weather) {
      const c = condition(data.weather.now.code, data.weather.now.day);
      const d = data.weather.days[0];
      items.push({ key: k, icon: c.icon, top: data.weather.place, main: `${data.weather.now.temp}° ${d ? `H:${d.hi}° L:${d.lo}°` : c.text}` });
    } else if (k === 'class') {
      if (at.kind === 'class') items.push({ key: k, icon: 'bell.fill', top: at.period.name, main: `${Math.ceil(at.left / 60)} min left` });
      else if (at.kind === 'passing') items.push({ key: k, icon: 'bell.fill', top: `${at.next.name} at ${fmtTime(at.next.start)}`, main: `in ${Math.ceil(at.left / 60)} min` });
      else items.push({ key: k, icon: 'bell.fill', top: 'Studento', main: data.schedule.periods.length ? 'No class now' : 'No schedule' });
    } else if (k === 'due' && data.due) {
      const soon = data.due.filter((a) => a.due != null && a.due < Date.now() + 2 * 864e5);
      items.push({ key: k, icon: 'graduationcap.fill', top: 'Classroom', main: data.due.length ? `${data.due.length} to do${soon.length ? `, ${soon.length} soon` : ''}` : 'All caught up' });
    } else if (k === 'date') {
      items.push({ key: k, icon: 'calendar', top: data.now.toLocaleDateString([], { weekday: 'long' }), main: data.now.toLocaleDateString([], { month: 'short', day: 'numeric' }) });
    } else if (k === 'notes') {
      const n = lib.lib.notes.slice().sort((a, b) => b.updated - a.updated)[0];
      items.push({ key: k, icon: 'pencil.and.scribble', top: 'Quill', main: n ? n.title : 'No notes yet' });
    }
  }
  if (!items.length) return null;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
      {items.map((it) => (
        <View key={it.key} style={{ minWidth: 160, maxWidth: 230, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.16)' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Icon name={it.icon} size={12} color={color} />
            <Text numberOfLines={1} style={{ color, opacity: 0.85, fontSize: 13, fontWeight: '600' }}>{it.top}</Text>
          </View>
          <Text numberOfLines={1} style={{ color, fontSize: 16, fontWeight: '700', marginTop: 2 }}>{it.main}</Text>
        </View>
      ))}
    </View>
  );
}
