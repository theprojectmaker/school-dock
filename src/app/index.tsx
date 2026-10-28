// The home screen: wallpaper, widgets and app icons on an iPadOS grid, and the
// dock. While an app is open the whole page sits zoomed "behind" it.
// Long-pressing an empty spot opens the admin screen (after its passcode).
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useState } from 'react';
import { Platform, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Dock, GridIcon } from '@/components/dock/home-icons';
import { useLauncher } from '@/components/dock/launcher';
import { useSession } from '@/components/dock/session';
import { Wallpaper, useWallpaperIsDark } from '@/components/dock/wallpaper';
import { DueSoonWidget, NotesWidget, UpNextWidget, useHomeData } from '@/components/dock/widgets';
import { APPS } from '@/lib/apps';
import { enabledApps, useDock } from '@/lib/dock';

export default function Home() {
  const { cfg } = useDock();
  const { launch, register, homeZoom } = useLauncher();
  const { openAdmin } = useSession();
  const ins = useSafeAreaInsets();
  const { width: W, height: H } = useWindowDimensions();
  const darkWall = useWallpaperIsDark();
  const [focus, setFocus] = useState(0);
  useFocusEffect(useCallback(() => { setFocus((n) => n + 1); }, []));
  const data = useHomeData(focus);

  const apps = enabledApps(cfg);
  const landscape = W > H;
  const compact = W < 700;                              // Slide Over / small windows
  const icon = compact ? 60 : W >= 1300 ? 80 : 74;      // iPadOS icon sizes
  const cell = icon + (compact ? 28 : 46);
  const side = compact ? 20 : landscape ? Math.round(W * 0.06) : 44;
  const gap = compact ? 16 : 26;

  // Medium widgets, iPadOS proportions (about 2.13 : 1).
  const widgets = cfg.widgets ? [
    cfg.apps.studento ? 'studento' : null,
    cfg.apps.classroom ? 'classroom' : null,
    cfg.apps.quill ? 'quill' : null,
  ].filter(Boolean) as ('studento' | 'classroom' | 'quill')[] : [];
  const widgetCol = landscape && !compact;              // landscape: widgets in a column on the left
  const ww = widgetCol ? Math.min(380, W * 0.3) : Math.min(380, (W - side * 2 - gap) / 2);
  const wh = Math.round(ww / 2.13);
  // In the left column, only as many widgets as fit above the dock.
  const fit = widgetCol ? Math.max(1, Math.floor((H - ins.top - 34 - icon - 60 + gap) / (wh + gap))) : widgets.length;

  const zoom = useAnimatedStyle(() => ({
    opacity: 1 - homeZoom.value * 0.9,
    transform: [{ scale: 1 + homeZoom.value * 0.12 }],
  }));
  const wallZoom = useAnimatedStyle(() => ({ transform: [{ scale: 1 + homeZoom.value * 0.05 }] }));

  const widget = (id: 'studento' | 'classroom' | 'quill') => {
    const props = { w: ww, h: wh, data, register, onPress: () => launch(id, `widget:${id}`) };
    return id === 'studento' ? <UpNextWidget key={id} {...props} />
      : id === 'classroom' ? <DueSoonWidget key={id} {...props} />
      : <NotesWidget key={id} {...props} />;
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <StatusBar style={darkWall ? 'light' : 'dark'} />
      <Animated.View style={[StyleSheet.absoluteFill, wallZoom]}><Wallpaper /></Animated.View>

      {/* Long-press the empty wallpaper for the admin screen. */}
      <Pressable style={StyleSheet.absoluteFill} delayLongPress={1500} accessible={false}
        onLongPress={() => { if (Platform.OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}); openAdmin(); }} />

      <Animated.View pointerEvents="box-none" style={[{ flex: 1, paddingTop: ins.top + (compact ? 20 : 34), paddingHorizontal: side }, zoom]}>
        <View pointerEvents="box-none" style={{ flex: 1, flexDirection: widgetCol ? 'row' : 'column', gap: widgetCol ? 40 : gap + 6 }}>
          {widgets.length ? (
            <View pointerEvents="box-none" style={{ flexDirection: widgetCol ? 'column' : 'row', flexWrap: widgetCol ? 'nowrap' : 'wrap', gap }}>
              {widgets.slice(0, fit).map(widget)}
            </View>
          ) : null}
          <View pointerEvents="box-none" style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignContent: 'flex-start', rowGap: compact ? 20 : 34 }}>
            {apps.map((id) => <GridIcon key={id} id={id} size={icon} cell={cell} />)}
          </View>
        </View>

        <View pointerEvents="box-none" style={{ alignItems: 'center', paddingBottom: Math.max(ins.bottom, 10) + (compact ? 6 : 12) }}>
          <Dock apps={apps.filter((id) => APPS[id].dock)} size={compact ? 54 : icon - 8} />
        </View>
      </Animated.View>
    </View>
  );
}
