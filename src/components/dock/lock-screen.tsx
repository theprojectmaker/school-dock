// The lock screen: date and a big clock over the wallpaper, the school's name,
// two small widgets, and "swipe up to open". With a student passcode set, the
// swipe lands on the iOS keypad instead of going straight in.
// Long-pressing the school name opens the admin screen (after its PIN).
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, PanResponder, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/ui';
import { useDock } from '@/lib/dock';
import { condition } from '@/lib/weather';
import { PasscodePad } from './passcode';
import { Wallpaper } from './wallpaper';
import { LockWidgets, useHomeData } from './widgets';

export function LockScreen({ onUnlock, onAdmin, wakeKey }: { onUnlock: () => void; onAdmin: () => void; wakeKey: number }) {
  const { cfg } = useDock();
  const { width, height } = useWindowDimensions();
  const ins = useSafeAreaInsets();
  const data = useHomeData(wakeKey);
  const lift = useRef(new Animated.Value(0)).current;   // 0 = resting, 1 = swiped all the way up
  const [stage, setStage] = useState<'lock' | 'code'>('lock');
  const stageRef = useRef(stage);
  stageRef.current = stage;

  useEffect(() => { lift.setValue(0); setStage('lock'); }, [wakeKey, lift]);

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

  const contentStyle = {
    opacity: lift.interpolate({ inputRange: [0, 0.7], outputRange: [1, 0], extrapolate: 'clamp' }),
    transform: [{ translateY: lift.interpolate({ inputRange: [0, 1], outputRange: [0, -height * 0.35] }) }],
  };

  return (
    <View style={[StyleSheet.absoluteFill, { userSelect: 'none' } as any]} {...pan.panHandlers}>
      <Wallpaper />
      {/* The keypad sits on a blurred, darkened copy of the wallpaper that fades in as you swipe. */}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: stage === 'code' ? 1 : lift }]}>
        <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.25)' }]} />
      </Animated.View>

      {stage === 'lock' ? (
        <Animated.View style={[StyleSheet.absoluteFill, { paddingTop: ins.top + 18, paddingBottom: ins.bottom + 10 }, contentStyle]}>
          <View style={{ alignItems: 'center' }}>
            <Icon name="lock.fill" size={18} color="rgba(255,255,255,0.9)" />
          </View>
          <View style={{ alignItems: 'center', marginTop: height * 0.06 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={[styles.shadow, { color: 'rgba(255,255,255,0.92)', fontSize: 22, fontWeight: '600' }]}>{date}</Text>
              {data.weather ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <Icon name={condition(data.weather.now.code, data.weather.now.day).icon} size={18} color="rgba(255,255,255,0.92)" />
                  <Text style={[styles.shadow, { color: 'rgba(255,255,255,0.92)', fontSize: 22, fontWeight: '600' }]}>{data.weather.now.temp}°</Text>
                </View>
              ) : null}
            </View>
            <Text style={[styles.shadow, { color: '#fff', fontSize: big, fontWeight: '700', letterSpacing: -big * 0.035, lineHeight: big * 1.08, fontVariant: ['tabular-nums'], marginTop: -4 }]}>{time}</Text>
          </View>
          <View style={{ marginTop: 10 }}>
            <LockWidgets data={data} showClass={cfg.apps.studento} showDue={cfg.apps.classroom} />
          </View>

          <View style={{ flex: 1 }} />
          <View style={{ alignItems: 'center', gap: 10 }}>
            <Pressable onLongPress={() => { if (Platform.OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}); onAdmin(); }}
              delayLongPress={1200} hitSlop={10} accessibilityLabel="School name">
              {cfg.school ? (
                <Text style={{ color: 'rgba(255,255,255,0.78)', fontSize: 13, fontWeight: '600', letterSpacing: 1.6, paddingVertical: 8 }}>{cfg.school.toUpperCase()}</Text>
              ) : <View style={{ width: 120, height: 32 }} />}
            </Pressable>
            <Pressable onPress={() => settle(true)} accessibilityLabel="Open" style={{ alignItems: 'center', gap: 10, paddingTop: 4 }}>
              <Text style={[styles.shadow, { color: 'rgba(255,255,255,0.85)', fontSize: 15, fontWeight: '500' }]}>Swipe up to open</Text>
              <View style={{ width: 140, height: 5, borderRadius: 3, backgroundColor: '#fff' }} />
            </Pressable>
          </View>
        </Animated.View>
      ) : (
        <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
          <PasscodePad title="Enter Passcode" length={4}
            onSubmit={(code) => { if (code === cfg.passcode) { onUnlock(); return true; } return false; }}
            onCancel={() => { setStage('lock'); lift.setValue(0); }} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  shadow: { textShadowColor: 'rgba(0,0,0,0.18)', textShadowRadius: 12, textShadowOffset: { width: 0, height: 1 } },
});
