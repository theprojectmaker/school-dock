// Opening and closing mini apps with the iPadOS zoom. Opening: the tapped
// icon grows into a full-screen card in the app's launch colour, the app is
// pushed underneath, and the card fades away. Closing: a card covers the app,
// the stack pops back to the home screen, and the card shrinks into the icon.
// The overlay sits above the navigator, so the route swap is never seen.
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, runOnJS, type SharedValue, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { APPS, type AppId, type DockApp } from '@/lib/apps';
import { iconRadius } from './app-icon';
import { IconGlyph } from './icon-art';

type Frame = { x: number; y: number; w: number; h: number };
type Measurable = { measureInWindow(cb: (x: number, y: number, w: number, h: number) => void): void };

type Ctx = {
  /** Home screen icons and widgets register so the zoom knows where to start and land. */
  register: (key: string, view: Measurable | null) => void;
  launch: (id: AppId, from: string, params?: string) => void;
  goHome: () => void;
  current: AppId | null;
  homeZoom: SharedValue<number>;   // 0 = home at rest, 1 = zoomed "through" while an app is open
};

const LauncherCtx = createContext<Ctx | null>(null);

const OPEN_MS = 420;
const CLOSE_MS = 380;
const ease = Easing.bezier(0.2, 0.85, 0.25, 1);

function measure(v: Measurable | null | undefined): Promise<Frame | null> {
  return new Promise((res) => {
    if (!v) return res(null);
    try { v.measureInWindow((x, y, w, h) => res(w > 0 ? { x, y, w, h } : null)); } catch { res(null); }
  });
}

export function LauncherProvider({ children }: { children: ReactNode }) {
  const { width: W, height: H } = useWindowDimensions();
  const views = useRef(new Map<string, Measurable>());
  const source = useRef('');
  const busy = useRef(false);
  const [app, setApp] = useState<DockApp | null>(null);       // what the overlay shows
  const [current, setCurrent] = useState<AppId | null>(null);
  const [glyphSize, setGlyphSize] = useState(64);

  const x = useSharedValue(0), y = useSharedValue(0), w = useSharedValue(0), h = useSharedValue(0);
  const radius = useSharedValue(0);
  const art = useSharedValue(1);          // 1 = looks like the icon, 0 = the plain launch card
  const shown = useSharedValue(0);
  const homeZoom = useSharedValue(0);

  const register = useCallback((key: string, view: Measurable | null) => {
    if (view) views.current.set(key, view); else views.current.delete(key);
  }, []);

  const hide = useCallback(() => { setApp(null); busy.current = false; }, []);
  const fallback = useCallback((): Frame => ({ x: W / 2 - 32, y: H / 2 - 32, w: 64, h: 64 }), [W, H]);

  const flyTo = useCallback((f: Frame, ms: number, after?: () => void) => {
    const t = { duration: ms, easing: ease };
    x.value = withTiming(f.x, t);
    y.value = withTiming(f.y, t);
    w.value = withTiming(f.w, t);
    h.value = withTiming(f.h, t, (fin) => { if (fin && after) runOnJS(after)(); });
  }, [x, y, w, h]);

  const launch = useCallback(async (id: AppId, from: string, params?: string) => {
    if (busy.current) return;
    busy.current = true;
    const a = APPS[id];
    source.current = from;
    const f = (await measure(views.current.get(from))) ?? fallback();
    const size = Math.min(f.w, f.h);
    setGlyphSize(Math.round(Math.min(80, size)));
    setApp(a);
    setCurrent(id);
    x.value = f.x; y.value = f.y; w.value = f.w; h.value = f.h;
    radius.value = Math.min(iconRadius(size), 26); art.value = 1; shown.value = 1;
    const push = () => router.push((a.route + (params ? `?${params}` : '')) as any);
    flyTo({ x: 0, y: 0, w: W, h: H }, OPEN_MS, push);
    radius.value = withTiming(18, { duration: OPEN_MS, easing: ease });
    art.value = withTiming(0, { duration: OPEN_MS * 0.7 });
    homeZoom.value = withTiming(1, { duration: OPEN_MS, easing: ease });
    // Give the app a moment to draw under the card, then let the card fade away.
    shown.value = withDelay(OPEN_MS + 160, withTiming(0, { duration: 220 }, (fin) => { if (fin) runOnJS(hide)(); }));
  }, [W, H, x, y, w, h, radius, art, shown, homeZoom, hide, fallback, flyTo]);

  const goHome = useCallback(() => {
    if (busy.current) return;
    if (!current) { if (router.canDismiss()) router.dismissTo('/'); else router.replace('/'); return; }
    busy.current = true;
    const a = APPS[current];
    setApp(a);
    x.value = 0; y.value = 0; w.value = W; h.value = H; radius.value = 18; art.value = 0; shown.value = 0;

    const shrink = async () => {
      if (router.canDismiss()) router.dismissTo('/'); else router.replace('/');
      setCurrent(null);
      await new Promise((r) => setTimeout(r, 40));   // let the home screen lay out before measuring
      const f = (await measure(views.current.get(source.current))) ?? fallback();
      const size = Math.min(f.w, f.h);
      setGlyphSize(Math.round(Math.min(80, size)));
      flyTo(f, CLOSE_MS);
      radius.value = withTiming(Math.min(iconRadius(size), 26), { duration: CLOSE_MS, easing: ease });
      art.value = withDelay(CLOSE_MS * 0.3, withTiming(1, { duration: CLOSE_MS * 0.6 }));
      homeZoom.value = withTiming(0, { duration: CLOSE_MS, easing: ease });
      shown.value = withDelay(CLOSE_MS, withTiming(0, { duration: 90 }, (fin) => { if (fin) runOnJS(hide)(); }));
    };
    // Cover the app with its launch card first, so the route change is hidden.
    shown.value = withTiming(1, { duration: 110 }, (fin) => { if (fin) runOnJS(shrink)(); });
  }, [current, W, H, x, y, w, h, radius, art, shown, homeZoom, hide, fallback, flyTo]);

  const card = useAnimatedStyle(() => ({
    left: x.value, top: y.value, width: w.value, height: h.value, borderRadius: radius.value, opacity: shown.value,
  }));
  const artStyle = useAnimatedStyle(() => ({ opacity: art.value }));

  const value = useMemo(() => ({ register, launch, goHome, current, homeZoom }), [register, launch, goHome, current, homeZoom]);

  return (
    <LauncherCtx.Provider value={value}>
      {children}
      {app ? (
        <Animated.View pointerEvents="none" style={[styles.card, { backgroundColor: app.splash }, card]}>
          <Animated.View style={[StyleSheet.absoluteFill, artStyle]}>
            <Art app={app} glyph={glyphSize} />
          </Animated.View>
        </Animated.View>
      ) : null}
    </LauncherCtx.Provider>
  );
}

/** The icon's gradient filling the card, with the glyph held at icon size in the middle. */
function Art({ app, glyph }: { app: DockApp; glyph: number }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <LinearGradient colors={[app.top, app.bottom]} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={StyleSheet.absoluteFill} />
      <LinearGradient colors={['rgba(255,255,255,0.22)', 'rgba(255,255,255,0)']} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 0.55 }} style={StyleSheet.absoluteFill} />
      <IconGlyph id={app.id} size={glyph} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { position: 'absolute', overflow: 'hidden', zIndex: 1000, elevation: 1000, borderCurve: 'continuous' } as any,
});

export function useLauncher() {
  const c = useContext(LauncherCtx);
  if (!c) throw new Error('useLauncher outside LauncherProvider');
  return c;
}
