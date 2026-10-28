// The lock screen: date and a big clock over the wallpaper, the student's
// lock screen widgets, assignments as notifications, and "swipe up to open".
// With a student passcode set, the swipe lands on the iOS keypad.
// Long-press the clock to customize it (font, colour, widgets), like iOS.
// Long-pressing the school name opens the admin screen (after its PIN).
import { BlurView } from 'expo-blur';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, PanResponder, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/ui';
import { APPS } from '@/lib/apps';
import { dueLabel } from '@/lib/classroom';
import { enabledApps, useDock } from '@/lib/dock';
import { useLayout } from '@/lib/layout';
import { condition } from '@/lib/weather';
import { AppIconArt } from './app-icon';
import { pressHaptic } from './home-icons';
import { clockFont, LockStyleControls } from './lock-style';
import { PasscodePad } from './passcode';
import { Wallpaper } from './wallpaper';
import { LockWidgets, useHomeData } from './widgets';

const LOCK_WIDGET_APP: Record<string, string | null> = { weather: 'weather', class: 'studento', due: 'classroom', date: null, notes: 'quill' };

export function LockScreen({ onUnlock, onAdmin, wakeKey }: { onUnlock: () => void; onAdmin: () => void; wakeKey: number }) {
  const { cfg } = useDock();
  const { prefs, setLock, canCustomize } = useLayout();
  const { width, height } = useWindowDimensions();
  const ins = useSafeAreaInsets();
  const data = useHomeData(wakeKey);
  const lift = useRef(new Animated.Value(0)).current;   // 0 = resting, 1 = swiped all the way up
  const edit = useRef(new Animated.Value(0)).current;   // 1 = customizing
  const [stage, setStage] = useState<'lock' | 'code' | 'custom'>('lock');
  const stageRef = useRef(stage);
  stageRef.current = stage;
  const style = prefs.lock;
  const allowed = new Set(enabledApps(cfg));
  const kinds = style.widgets.filter((k) => LOCK_WIDGET_APP[k] == null || allowed.has(LOCK_WIDGET_APP[k]!));

  useEffect(() => { lift.setValue(0); edit.setValue(0); setStage('lock'); }, [wakeKey, lift, edit]);

  const finish = () => {
    if (cfg.passcode) { setStage('code'); return; }
    onUnlock();
  };
  const settle = (open: boolean) => {
    let done = false;
    const end = () => { if (!done && open) { done = true; finish(); } };
    Animated.timing(lift, { toValue: open ? 1 : 0, duration: open ? 260 : 320, easing: Easing.bezier(0.2, 0.85, 0.25, 1), useNativeDriver: true })
      .start(({ finished }) => { if (finished) end(); });
    if (open) setTimeout(end, 420);   // in case the frame clock is throttled and the callback is late
  };
  const customize = (on: boolean) => {
    if (on) { pressHaptic(); setStage('custom'); }
    Animated.spring(edit, { toValue: on ? 1 : 0, useNativeDriver: true, damping: 20, stiffness: 200 }).start();
    if (!on) setStage('lock');
  };

  // The responder is made once; it calls the latest settle/height through a ref.
  const latest = useRef({ settle, height });
  latest.current = { settle, height };
  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, g) => stageRef.current === 'lock' && g.dy < -6 && Math.abs(g.dy) > Math.abs(g.dx),
    onPanResponderMove: (_, g) => lift.setValue(Math.max(0, Math.min(1, -g.dy / (latest.current.height * 0.55)))),
    onPanResponderRelease: (_, g) => latest.current.settle(-g.dy > latest.current.height * 0.16 || g.vy < -0.6),
    onPanResponderTerminate: () => latest.current.settle(false),
  })).current;

  const now = data.now;
  const date = now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
  const time = `${now.getHours() % 12 || 12}:${String(now.getMinutes()).padStart(2, '0')}`;
  const big = Math.min(width * 0.15, height * 0.2, 168);
  const ink = style.color;
  const notes = style.notifications && allowed.has('classroom') && data.due
    ? data.due.filter((a) => a.due != null && a.due < Date.now() + 3 * 864e5).slice(0, 3) : [];

  const contentStyle = {
    opacity: lift.interpolate({ inputRange: [0, 0.7], outputRange: [1, 0], extrapolate: 'clamp' }),
    transform: [
      { translateY: Animated.add(lift.interpolate({ inputRange: [0, 1], outputRange: [0, -height * 0.35] }), edit.interpolate({ inputRange: [0, 1], outputRange: [0, -height * 0.06] })) },
      { scale: edit.interpolate({ inputRange: [0, 1], outputRange: [1, 0.86] }) },
    ],
  };

  return (
    <View style={[StyleSheet.absoluteFill, { userSelect: 'none' } as any]} {...pan.panHandlers}>
      <Wallpaper />
      {/* The keypad sits on a blurred, darkened copy of the wallpaper that fades in as you swipe. */}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: stage === 'code' ? 1 : lift }]}>
        <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.25)' }]} />
      </Animated.View>

      {stage !== 'code' ? (
        <Animated.View style={[StyleSheet.absoluteFill, { paddingTop: ins.top + 18, paddingBottom: ins.bottom + 10 }, contentStyle]}>
          <View style={{ alignItems: 'center' }}>
            <Icon name="lock.fill" size={18} color={ink} />
          </View>
          <Pressable onLongPress={() => canCustomize && customize(true)} delayLongPress={550} disabled={stage === 'custom'}
            style={{ alignItems: 'center', marginTop: height * 0.06, alignSelf: 'center', paddingHorizontal: 24, borderRadius: 24,
              borderWidth: stage === 'custom' ? 2 : 0, borderColor: 'rgba(255,255,255,0.6)', borderStyle: 'dashed' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={[styles.shadow, { color: ink, opacity: 0.92, fontSize: 22, fontWeight: '600' }]}>{date}</Text>
              {data.weather && allowed.has('weather') ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <Icon name={condition(data.weather.now.code, data.weather.now.day).icon} size={18} color={ink} />
                  <Text style={[styles.shadow, { color: ink, opacity: 0.92, fontSize: 22, fontWeight: '600' }]}>{data.weather.now.temp}°</Text>
                </View>
              ) : null}
            </View>
            <Text style={[styles.shadow, { color: ink, fontSize: big, letterSpacing: -big * 0.03, lineHeight: big * 1.08, fontVariant: ['tabular-nums'], marginTop: -4 }, clockFont(style.font)]}>{time}</Text>
          </Pressable>
          <View style={{ marginTop: 10 }}>
            <LockWidgets data={data} kinds={kinds} color={ink} />
          </View>

          <View style={{ flex: 1 }} />
          {notes.length && stage === 'lock' ? (
            <View style={{ alignSelf: 'center', width: Math.min(width - 48, 440), gap: 8, marginBottom: 16 }}>
              {notes.map((a) => (
                <View key={`${a.courseId}:${a.id}`} style={{ borderRadius: 20, overflow: 'hidden' }}>
                  <BlurView intensity={45} tint="light" style={StyleSheet.absoluteFill} />
                  <View style={{ backgroundColor: 'rgba(255,255,255,0.32)', padding: 12, flexDirection: 'row', gap: 10 }}>
                    <AppIconArt app={APPS.classroom} size={34} />
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ color: '#000', fontSize: 14, fontWeight: '600' }}>{a.course}</Text>
                        <Text style={{ color: 'rgba(0,0,0,0.5)', fontSize: 13 }}>{a.status === 'missing' ? 'Missing' : dueLabel(a.due)}</Text>
                      </View>
                      <Text numberOfLines={1} style={{ color: '#000', fontSize: 14, marginTop: 1 }}>{a.title}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          ) : null}
          {stage === 'lock' ? (
            <View style={{ alignItems: 'center', gap: 10 }}>
              <Pressable onLongPress={() => { pressHaptic(); onAdmin(); }} delayLongPress={1200} hitSlop={10} accessibilityLabel="School name">
                {cfg.school ? (
                  <Text style={{ color: ink, opacity: 0.78, fontSize: 13, fontWeight: '600', letterSpacing: 1.6, paddingVertical: 8 }}>{cfg.school.toUpperCase()}</Text>
                ) : <View style={{ width: 120, height: 32 }} />}
              </Pressable>
              <Pressable onPress={() => settle(true)} accessibilityLabel="Open" style={{ alignItems: 'center', gap: 10, paddingTop: 4 }}>
                <Text style={[styles.shadow, { color: ink, opacity: 0.85, fontSize: 15, fontWeight: '500' }]}>Swipe up to open</Text>
                <View style={{ width: 140, height: 5, borderRadius: 3, backgroundColor: ink }} />
              </Pressable>
            </View>
          ) : null}
        </Animated.View>
      ) : (
        <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
          <PasscodePad title="Enter Passcode" length={4}
            onSubmit={(code) => { if (code === cfg.passcode) { onUnlock(); return true; } return false; }}
            onCancel={() => { setStage('lock'); lift.setValue(0); }} />
        </View>
      )}

      {/* Customize: the clock shrinks up and the controls slide in underneath, like iOS. */}
      {stage === 'custom' ? (
        <>
          <View style={{ position: 'absolute', top: ins.top + 10, right: 20 }}>
            <Pressable onPress={() => customize(false)} style={{ paddingHorizontal: 18, height: 36, borderRadius: 18, backgroundColor: '#007AFF', justifyContent: 'center' }}>
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Done</Text>
            </Pressable>
          </View>
          <Animated.View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, transform: [{ translateY: edit.interpolate({ inputRange: [0, 1], outputRange: [420, 0] }) }] }}>
            <View style={{ alignSelf: 'center', width: Math.min(width - 32, 720), borderTopLeftRadius: 26, borderTopRightRadius: 26, overflow: 'hidden' }}>
              <BlurView intensity={70} tint="dark" style={StyleSheet.absoluteFill} />
              <ScrollView style={{ maxHeight: height * 0.44 }} contentContainerStyle={{ padding: 22, paddingBottom: ins.bottom + 24 }}>
                <LockStyleControls style={style} onChange={setLock} dark />
              </ScrollView>
            </View>
          </Animated.View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  shadow: { textShadowColor: 'rgba(0,0,0,0.18)', textShadowRadius: 12, textShadowOffset: { width: 0, height: 1 } },
});
