// The home screen, laid out like iPadOS: pages of apps and widgets packed into
// a grid, page dots, the dock with the App Library at its end. Long-press
// anything to edit: icons wiggle, drag them around (between pages and into or
// out of the dock), remove them, add widgets with +, then Done.
// While an app is open the whole page sits zoomed "behind" it.
import { useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { BlurView } from 'expo-blur';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { type NativeScrollEvent, type NativeSyntheticEvent, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppLibrary } from '@/components/dock/app-library';
import { AppTile, LibraryButton, pressHaptic, RemoveBadge, Wiggle } from '@/components/dock/home-icons';
import { WidgetView } from '@/components/dock/home-widgets';
import { useLauncher } from '@/components/dock/launcher';
import { Wallpaper, useWallpaperIsDark } from '@/components/dock/wallpaper';
import { WidgetGallery } from '@/components/dock/widget-gallery';
import { useHomeData } from '@/components/dock/widgets';
import { Icon } from '@/components/ui';
import { appById, type DockApp } from '@/lib/apps';
import { enabledApps, useDock } from '@/lib/dock';
import {
  displayPages, type Item, itemKey, MAX_DOCK, moveItem, moveToDock, type Placed, removeItem, resizeWidget,
  useLayout, WIDGET_APP, WIDGET_SIZES,
} from '@/lib/layout';

type Rect = { x: number; y: number; w: number; h: number };
type Drag = { key: string; item: Item; app: DockApp | null; offX: number; offY: number; w: number; h: number; from: 'grid' | 'dock' };

const SPRING = { damping: 22, stiffness: 240, mass: 0.7 };

/** Springs to its slot whenever the layout moves it, like icons reflowing on iPad. */
function Slot({ x, y, w, h, z, children }: Rect & { z?: number; children: React.ReactNode }) {
  const sx = useSharedValue(x), sy = useSharedValue(y);
  useEffect(() => { sx.value = withSpring(x, SPRING); sy.value = withSpring(y, SPRING); }, [x, y, sx, sy]);
  const st = useAnimatedStyle(() => ({ transform: [{ translateX: sx.value }, { translateY: sy.value }] }));
  return <Animated.View pointerEvents="box-none" style={[{ position: 'absolute', left: 0, top: 0, width: w, height: h, zIndex: z }, st]}>{children}</Animated.View>;
}

export default function Home() {
  const { cfg } = useDock();
  const { launch, register, homeZoom } = useLauncher();
  const { layout, prefs, setLayout, canCustomize } = useLayout();
  const ins = useSafeAreaInsets();
  const { width: W, height: H } = useWindowDimensions();
  const darkWall = useWallpaperIsDark();
  const [focus, setFocus] = useState(0);
  useFocusEffect(useCallback(() => { setFocus((n) => n + 1); }, []));
  const data = useHomeData(focus);

  const [editing, setEditing] = useState(false);
  const [page, setPage] = useState(0);
  const [gallery, setGallery] = useState(false);
  const [library, setLibrary] = useState(false);
  const [drag, setDrag] = useState<Drag | null>(null);
  const scroll = useRef<ScrollView>(null);

  // ---- geometry ----
  const landscape = W > H;
  const compact = W < 700;
  const cols = compact || !landscape ? 4 : 6;
  const rows = compact || !landscape ? 6 : 4;
  const large = prefs.iconSize === 'large';
  const side = compact ? 18 : landscape ? Math.round(W * 0.07) : 46;
  const dockIcon = compact ? 52 : W >= 1300 ? 72 : 64;
  const dockPad = Math.round(dockIcon * 0.2);
  const dockH = dockIcon + dockPad * 2;
  const dockBottom = Math.max(ins.bottom, 10) + 12;
  const gridTop = ins.top + (compact ? 30 : 46);
  const gridBottom = H - dockBottom - dockH - 34;
  const cellW = (W - side * 2) / cols;
  const cellH = (gridBottom - gridTop) / rows;
  const icon = Math.round(Math.min(cellW * (large ? 0.66 : 0.56), cellH * (large ? 0.72 : 0.6), large ? 96 : 84));

  const pages = useMemo(() => displayPages(layout, cols, rows), [layout, cols, rows]);
  const pageCount = pages.length + (editing ? 1 : 0);   // a fresh page to drop onto while editing

  const rectOf = (p: Placed): Rect => {
    const x0 = side + p.x * cellW + (cellW - icon) / 2;
    const y0 = gridTop + p.y * cellH + (cellH - icon - (large ? 0 : 20)) / 2;
    if (p.item.kind === 'app') return { x: x0, y: y0, w: icon, h: icon + (large ? 0 : 22) };
    return { x: x0, y: y0, w: (p.w - 1) * cellW + icon, h: (p.h - 1) * cellH + icon };
  };

  const allApps = useMemo(() => enabledApps(cfg).map((id) => appById(id, cfg.webApps)).filter(Boolean) as DockApp[], [cfg]);
  const dockApps = layout.dock.map((id) => appById(id, cfg.webApps)).filter(Boolean) as DockApp[];
  const dockGap = Math.round(dockIcon * 0.27);
  const dockW = dockPad * 2 + dockApps.length * dockIcon + Math.max(0, dockApps.length - 1) * dockGap + (dockApps.length ? dockGap * 2 + 1 : 0) + dockIcon;
  const dockLeft = (W - dockW) / 2;
  const dockTop = H - dockBottom - dockH;
  const dockSlot = (i: number): Rect => ({ x: dockLeft + dockPad + i * (dockIcon + dockGap), y: dockTop + dockPad, w: dockIcon, h: dockIcon });

  // ---- page scrolling ----
  const goPage = (p: number) => { const n = Math.max(0, Math.min(p, pageCount - 1)); setPage(n); scroll.current?.scrollTo({ x: n * W, animated: true }); };
  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => setPage(Math.round(e.nativeEvent.contentOffset.x / W));
  useEffect(() => { if (page >= pageCount) goPage(pageCount - 1); }); // eslint-disable-line react-hooks/exhaustive-deps

  const startEditing = () => { if (!canCustomize) return; pressHaptic(); setEditing(true); };

  // ---- dragging (edit mode) ----
  const gx = useSharedValue(0), gy = useSharedValue(0);
  const ghost = useAnimatedStyle(() => ({ transform: [{ translateX: gx.value }, { translateY: gy.value }, { scale: 1.08 }] }));
  const hover = useRef<{ sig: string; at: number; applied: string }>({ sig: '', at: 0, applied: '' });
  const edge = useRef<{ dir: number; at: number }>({ dir: 0, at: 0 });
  const live = useRef({ pages, page, layout, dockApps });
  live.current = { pages, page, layout, dockApps };
  const dragRef = useRef<Drag | null>(null);   // set at once (state lags a render behind a fast drag)

  const hit = (x: number, y: number): Drag | null => {
    const { pages: ps, page: pg, dockApps: da } = live.current;
    for (let i = 0; i < da.length; i++) {
      const r = dockSlot(i);
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
        return { key: `app:${da[i].id}`, item: { kind: 'app', id: da[i].id }, app: da[i], offX: x - r.x, offY: y - r.y, w: r.w, h: r.h, from: 'dock' };
      }
    }
    for (const p of ps[pg] ?? []) {
      const r = rectOf(p);
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + Math.min(r.h, p.item.kind === 'app' ? icon : r.h)) {
        return { key: itemKey(p.item), item: p.item, app: p.item.kind === 'app' ? appById(p.item.id, cfg.webApps) : null, offX: x - r.x, offY: y - r.y, w: r.w, h: p.item.kind === 'app' ? icon : r.h, from: 'grid' };
      }
    }
    return null;
  };

  /** Where the dragged item would go if dropped at (x, y), applied after a short hover. */
  const target = (d: Drag, x: number, y: number, now: number, force = false) => {
    let sig = '';
    let apply: (() => void) | null = null;
    const { pages: ps, page: pg } = live.current;
    if (y > dockTop - 8 && d.item.kind === 'app') {
      const id = d.item.id;
      const idx = Math.max(0, Math.min(Math.round((x - dockLeft - dockPad - dockIcon / 2) / (dockIcon + dockGap)), live.current.layout.dock.length));
      const full = live.current.layout.dock.length >= MAX_DOCK && !live.current.layout.dock.includes(id);
      if (!full) { sig = `dock:${idx}`; apply = () => setLayout((l) => moveToDock(l, id, idx)); }
    } else {
      const col = Math.max(0, Math.min(cols - 1, Math.floor((x - side) / cellW)));
      const row = Math.max(0, Math.min(rows - 1, Math.floor((y - gridTop) / cellH)));
      const over = (ps[pg] ?? []).find((p) => itemKey(p.item) !== d.key && col >= p.x && col < p.x + p.w && row >= p.y && row < p.y + p.h);
      sig = over ? `over:${itemKey(over.item)}` : `end:${pg}`;
      apply = () => setLayout((l) => {
        if (!over) return moveItem(l, d.key, pg, (l.pages[pg] ?? []).filter((it) => itemKey(it) !== d.key).length);
        const without = l.pages.map((p) => p.filter((it) => itemKey(it) !== d.key));
        const pi = without.findIndex((p) => p.some((it) => itemKey(it) === itemKey(over.item)));
        if (pi < 0) return l;
        return moveItem(l, d.key, pi, without[pi].findIndex((it) => itemKey(it) === itemKey(over.item)));
      });
    }
    const h = hover.current;
    if (sig !== h.sig) { h.sig = sig; h.at = now; }
    if (apply && sig !== h.applied && (force || now - h.at > 160)) { h.applied = sig; apply(); }
  };

  const down = useRef({ x: 0, y: 0 });
  const pan = Gesture.Pan().runOnJS(true).enabled(editing).minDistance(4)
    .onBegin((e) => { down.current = { x: e.absoluteX, y: e.absoluteY }; })
    .onStart((e) => {
      // onStart fires once the finger has moved; hit-test where it first came down.
      const d = hit(down.current.x, down.current.y);
      hover.current = { sig: '', at: 0, applied: '' };
      edge.current = { dir: 0, at: 0 };
      dragRef.current = d;
      if (!d) { setDrag(null); return; }
      gx.value = e.absoluteX - d.offX; gy.value = e.absoluteY - d.offY;
      setDrag(d);
    })
    .onUpdate((e) => {
      const d = dragRef.current;
      if (!d) return;
      gx.value = e.absoluteX - d.offX; gy.value = e.absoluteY - d.offY;
      const now = Date.now();
      // Hold at a side edge to carry it to the next page.
      const dir = e.absoluteX < 30 ? -1 : e.absoluteX > W - 30 ? 1 : 0;
      if (dir !== edge.current.dir) edge.current = { dir, at: now };
      else if (dir && now - edge.current.at > 650) {
        edge.current.at = now;
        const np = live.current.page + dir;
        if (np >= 0 && np <= live.current.pages.length) {
          goPage(np);
          setLayout((l) => moveItem(l, d.key, np, (l.pages[np] ?? []).length));
          hover.current = { sig: '', at: 0, applied: '' };
        }
        return;
      }
      if (!dir) target(d, e.absoluteX, e.absoluteY, now);
    })
    .onEnd((e) => {
      const d = dragRef.current;
      dragRef.current = null;
      if (!d) {
        if (e.translationX < -60) goPage(live.current.page + 1);
        else if (e.translationX > 60) goPage(live.current.page - 1);
        return;
      }
      target(d, e.absoluteX, e.absoluteY, Date.now(), true);
      setDrag(null);
    })
    .onFinalize(() => { dragRef.current = null; setDrag(null); });

  // ---- launching ----
  const zoom = useAnimatedStyle(() => ({ opacity: 1 - homeZoom.value * 0.9, transform: [{ scale: 1 + homeZoom.value * 0.12 }] }));
  const wallZoom = useAnimatedStyle(() => ({ transform: [{ scale: 1 + homeZoom.value * 0.05 }] }));

  const renderItem = (p: Placed, pi: number) => {
    const key = itemKey(p.item);
    const r = rectOf(p);
    const hidden = drag?.key === key;
    const seed = key.length + p.x * 7 + p.y * 3 + pi;
    if (p.item.kind === 'app') {
      const app = appById(p.item.id, cfg.webApps);
      if (!app) return null;
      return (
        <Slot key={key} x={r.x} y={r.y} w={r.w} h={r.h}>
          <AppTile app={app} size={icon} refKey={`grid:${app.id}`} editing={editing} dark={prefs.darkIcons} label={!large} seed={seed} hidden={hidden}
            onLongPress={startEditing} onRemove={() => setLayout((l) => removeItem(l, key))} />
        </Slot>
      );
    }
    const it = p.item;
    const sizes = WIDGET_SIZES[it.type];
    const appId = WIDGET_APP[it.type] ?? 'studento';
    return (
      <Slot key={key} x={r.x} y={r.y} w={r.w} h={r.h}>
        <View style={{ opacity: hidden ? 0 : 1 }}>
          <Wiggle on={editing} seed={seed}>
            <View pointerEvents={editing ? 'none' : 'auto'}>
              <WidgetView type={it.type} size={it.size} w={r.w} h={r.h} data={data} refKey={`widget:${it.id}`} register={register}
                onPress={() => { if (!editing) launch(appId, `widget:${it.id}`); }} onLongPress={startEditing} />
            </View>
            {editing ? <RemoveBadge onPress={() => setLayout((l) => removeItem(l, key))} label={it.type} /> : null}
            {editing && sizes.length > 1 ? (
              <Pressable onPress={() => setLayout((l) => resizeWidget(l, key, sizes[(sizes.indexOf(it.size) + 1) % sizes.length]))} hitSlop={8} accessibilityLabel="Resize widget"
                style={{ position: 'absolute', right: -6, bottom: -6, width: 26, height: 26, borderRadius: 13, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 4 }}>
                <Icon name="arrow.up.left.and.arrow.down.right" size={12} color="#1C1C1E" />
              </Pressable>
            ) : null}
          </Wiggle>
        </View>
      </Slot>
    );
  };

  const frosted = (children: React.ReactNode, onPress: () => void, label: string) => (
    <Pressable onPress={onPress} accessibilityLabel={label} style={{ height: 34, minWidth: 34, paddingHorizontal: 14, borderRadius: 17, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
      <BlurView intensity={40} tint="light" style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255,255,255,0.22)' }]} />
      {children}
    </Pressable>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <StatusBar style={darkWall ? 'light' : 'dark'} />
      <Animated.View style={[StyleSheet.absoluteFill, wallZoom]}><Wallpaper /></Animated.View>

      <GestureDetector gesture={pan}>
        <Animated.View style={[{ flex: 1 }, zoom]}>
          <ScrollView ref={scroll} horizontal pagingEnabled scrollEnabled={!editing} showsHorizontalScrollIndicator={false} onMomentumScrollEnd={onScrollEnd}
            style={StyleSheet.absoluteFill} contentContainerStyle={{ width: W * pageCount }}>
            {Array.from({ length: pageCount }, (_, pi) => (
              <View key={pi} style={{ width: W, height: H }}>
                {/* Empty space: long-press to edit, tap to finish editing. */}
                <Pressable style={StyleSheet.absoluteFill} accessible={false} delayLongPress={450}
                  onPress={() => editing && setEditing(false)} onLongPress={startEditing} />
                {/* Pages are drawn in place; items sit at absolute positions inside the page. */}
                <View pointerEvents="box-none" style={{ position: 'absolute', left: -0, top: 0, width: W, height: H }}>
                  {(pages[pi] ?? []).map((p) => renderItem(p, pi))}
                </View>
              </View>
            ))}
          </ScrollView>

          {/* Page dots */}
          {pageCount > 1 ? (
            <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: dockTop - 26, alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 10, height: 18, borderRadius: 9, alignItems: 'center', backgroundColor: editing ? 'rgba(0,0,0,0.18)' : 'transparent' }}>
                {Array.from({ length: pageCount }, (_, i) => (
                  <View key={i} style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: i === page ? '#fff' : 'rgba(255,255,255,0.4)' }} />
                ))}
              </View>
            </View>
          ) : null}

          {/* Dock */}
          <View pointerEvents="box-none" style={{ position: 'absolute', left: dockLeft, top: dockTop, width: dockW, height: dockH }}>
            <View style={{ flex: 1, borderRadius: dockIcon * 0.42, overflow: 'hidden' }}>
              <BlurView intensity={55} tint="light" style={StyleSheet.absoluteFill} />
              <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255,255,255,0.2)' }]} />
            </View>
            {dockApps.map((app, i) => {
              const r = dockSlot(i);
              return (
                <Slot key={app.id} x={r.x - dockLeft} y={dockPad} w={dockIcon} h={dockIcon}>
                  <AppTile app={app} size={dockIcon} refKey={`dock:${app.id}`} editing={editing} dark={prefs.darkIcons} seed={i * 5 + 1}
                    hidden={drag?.key === `app:${app.id}`} onLongPress={startEditing} onRemove={() => setLayout((l) => removeItem(l, `app:${app.id}`))} />
                </Slot>
              );
            })}
            {dockApps.length ? <View style={{ position: 'absolute', top: dockPad + 6, bottom: dockPad + 6, left: dockW - dockPad - dockIcon - dockGap - 1, width: 1, backgroundColor: 'rgba(255,255,255,0.35)' }} /> : null}
            <View style={{ position: 'absolute', top: dockPad, left: dockW - dockPad - dockIcon }}>
              <LibraryButton size={dockIcon} apps={allApps} onPress={() => setLibrary(true)} />
            </View>
          </View>

          {/* Edit mode controls, top corners like iPadOS */}
          {editing ? (
            <View pointerEvents="box-none" style={{ position: 'absolute', top: ins.top + 6, left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between' }}>
              {frosted(<Icon name="plus" size={16} color="#fff" />, () => setGallery(true), 'Add widget')}
              {frosted(<Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>Done</Text>, () => setEditing(false), 'Done')}
            </View>
          ) : null}
        </Animated.View>
      </GestureDetector>

      {/* The item being dragged, drawn above everything. */}
      {drag ? (
        <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0, width: drag.w, height: drag.h, zIndex: 50, opacity: 0.95 }, ghost]}>
          {drag.app ? (
            <AppTile app={drag.app} size={drag.w} refKey="drag" editing={false} dark={prefs.darkIcons} seed={0} />
          ) : drag.item.kind === 'widget' ? (
            <WidgetView type={drag.item.type} size={drag.item.size} w={drag.w} h={drag.h} data={data} refKey="drag" register={() => {}} onPress={() => {}} />
          ) : null}
        </Animated.View>
      ) : null}

      <WidgetGallery visible={gallery} page={page} data={data} onClose={() => setGallery(false)} />
      <AppLibrary visible={library} apps={allApps} page={page} onClose={() => setLibrary(false)} />
    </View>
  );
}
