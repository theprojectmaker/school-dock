// App icons on the home screen and in the dock: tap to open, long-press to
// start editing; while editing they wiggle and show the remove badge.
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { type ReactNode, useEffect } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

import { Icon } from '@/components/ui';
import type { DockApp } from '@/lib/apps';
import { AppIconArt, iconRadius, iconShadow } from './app-icon';
import { useLauncher } from './launcher';

export const tapHaptic = () => { if (Platform.OS === 'ios') Haptics.selectionAsync().catch(() => {}); };
export const pressHaptic = () => { if (Platform.OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}); };

/** The jiggle: a small alternating tilt with a per-item phase, like iPadOS edit mode. */
export function Wiggle({ on, seed, children }: { on: boolean; seed: number; children: ReactNode }) {
  const r = useSharedValue(0);
  useEffect(() => {
    if (!on) { cancelAnimation(r); r.value = withTiming(0, { duration: 120 }); return; }
    const amp = 1.6 + (seed % 3) * 0.25;
    const ms = 120 + (seed % 4) * 9;
    r.value = withSequence(withTiming(seed % 2 ? amp : -amp, { duration: ms / 2 }),
      withRepeat(withTiming(seed % 2 ? -amp : amp, { duration: ms, easing: Easing.inOut(Easing.sin) }), -1, true));
    return () => cancelAnimation(r);
  }, [on, seed, r]);
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${r.value}deg` }] }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

/** The grey "−" badge in the icon's corner while editing. */
export function RemoveBadge({ onPress, label }: { onPress: () => void; label: string }) {
  return (
    <Pressable onPress={onPress} hitSlop={10} accessibilityLabel={`Remove ${label}`}
      style={{ position: 'absolute', top: -7, left: -7, width: 24, height: 24, borderRadius: 12, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', zIndex: 5 }}>
      <BlurView intensity={40} tint="light" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(120,120,128,0.55)' }} />
      <View style={{ width: 10, height: 2.2, borderRadius: 1.1, backgroundColor: '#fff' }} />
    </Pressable>
  );
}

export function AppTile({ app, size, refKey, editing, dark, label, onLongPress, onRemove, seed, hidden }: {
  app: DockApp; size: number; refKey: string; editing: boolean; dark?: boolean; label?: boolean;
  onLongPress?: () => void; onRemove?: () => void; seed: number; hidden?: boolean;
}) {
  const { register, launch } = useLauncher();
  return (
    <View style={{ alignItems: 'center', opacity: hidden ? 0 : 1 }}>
      <Wiggle on={editing} seed={seed}>
        <Pressable ref={(v) => register(refKey, v as any)} accessibilityRole="button" accessibilityLabel={app.name}
          onPress={() => { if (editing) return; tapHaptic(); launch(app.id, refKey); }}
          onLongPress={() => { pressHaptic(); onLongPress?.(); }} delayLongPress={450}
          style={{ width: size, height: size, ...iconShadow }}>
          {({ pressed }) => (
            <View>
              <AppIconArt app={app} size={size} dark={dark} />
              {pressed && !editing ? <View style={{ position: 'absolute', top: 0, left: 0, width: size, height: size, borderRadius: iconRadius(size), backgroundColor: 'rgba(0,0,0,0.28)' }} /> : null}
            </View>
          )}
        </Pressable>
        {editing && onRemove ? <RemoveBadge onPress={onRemove} label={app.name} /> : null}
      </Wiggle>
      {label ? (
        <Text numberOfLines={1} style={{ marginTop: 6, maxWidth: size + 30, color: '#fff', fontSize: 12.5, fontWeight: '500', textShadowColor: 'rgba(0,0,0,0.35)', textShadowRadius: 4, textShadowOffset: { width: 0, height: 1 } }}>
          {app.name}
        </Text>
      ) : null}
    </View>
  );
}

/** The App Library icon at the end of the dock: four tiny icons in a rounded square. */
export function LibraryButton({ size, apps, onPress }: { size: number; apps: DockApp[]; onPress: () => void }) {
  const mini = (size - size * 0.28) / 2;
  return (
    <Pressable onPress={() => { tapHaptic(); onPress(); }} accessibilityLabel="App Library"
      style={{ width: size, height: size, borderRadius: iconRadius(size), overflow: 'hidden', ...iconShadow }}>
      <BlurView intensity={50} tint="light" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
      <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.28)', flexDirection: 'row', flexWrap: 'wrap', padding: size * 0.1, gap: size * 0.08 }}>
        {apps.slice(0, 4).map((a) => <AppIconArt key={a.id} app={a} size={mini} />)}
        {apps.length < 4 ? <Icon name="square.grid.2x2" size={mini} color="#fff" /> : null}
      </View>
    </Pressable>
  );
}
