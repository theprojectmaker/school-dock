// The home screen the student arranges, kept on the iPad: pages of apps and
// widgets, the dock, and apps taken off the home screen (still in the App
// Library). Also the student's own look: wallpaper, icon size, dark icons
// and the lock screen style. The school's Settings decide what's allowed;
// this only arranges and styles what is.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { type DockConfig, enabledApps, useDock } from './dock';

export type WidgetType = 'upnext' | 'due' | 'notes' | 'clock' | 'date' | 'weather';
export type WidgetSize = 's' | 'm' | 'l';
export type Item =
  | { kind: 'app'; id: string }
  | { kind: 'widget'; id: string; type: WidgetType; size: WidgetSize };
export type Layout = { pages: Item[][]; dock: string[]; removed: string[] };

export type LockFont = 'bold' | 'rounded' | 'thin' | 'serif' | 'condensed';
export type LockWidget = 'weather' | 'class' | 'due' | 'date' | 'notes';
export type LockStyle = { font: LockFont; color: string; widgets: LockWidget[]; inline: 'date' | 'weather' | 'class'; notifications: boolean };
export type Prefs = { wallpaper: string | null; photo: string; iconSize: 'normal' | 'large'; darkIcons: boolean; lock: LockStyle };

/** Which app a widget belongs to: no app, no widget. */
export const WIDGET_APP: Record<WidgetType, string | null> = { upnext: 'studento', due: 'classroom', notes: 'quill', weather: 'weather', clock: null, date: null };
export const WIDGET_SIZES: Record<WidgetType, WidgetSize[]> = {
  upnext: ['s', 'm'], due: ['m', 'l'], notes: ['m', 'l'], weather: ['s', 'm'], clock: ['s', 'm'], date: ['s'],
};
export const CELLS: Record<WidgetSize, [number, number]> = { s: [2, 2], m: [4, 2], l: [4, 4] };

const uid = () => Math.random().toString(36).slice(2, 9);
const w = (type: WidgetType, size: WidgetSize): Item => ({ kind: 'widget', id: `${type}-${uid()}`, type, size });
const a = (id: string): Item => ({ kind: 'app', id });

export const DEFAULT_LAYOUT: Layout = {
  pages: [
    [w('clock', 's'), w('upnext', 'm'), a('studento'), a('edpuzzle'), a('khan'), a('dictionary'), a('weather'), a('quizlet'), a('kahoot')],
    [w('due', 'm'), w('weather', 's'), w('notes', 'm'), w('date', 's')],
  ],
  dock: ['quill', 'classroom', 'desmos', 'ray', 'settings'],
  removed: [],
};

export const DEFAULT_LOCK: LockStyle = { font: 'bold', color: '#FFFFFF', widgets: ['weather', 'class', 'due'], inline: 'date', notifications: true };
const DEFAULT_PREFS: Prefs = { wallpaper: null, photo: '', iconSize: 'normal', darkIcons: false, lock: DEFAULT_LOCK };

export const itemKey = (it: Item) => (it.kind === 'app' ? `app:${it.id}` : `widget:${it.id}`);
export const MAX_DOCK = 6;

export type Placed = { item: Item; x: number; y: number; w: number; h: number };

/** iOS-style packing: each item takes the first free spot (row by row) where it fits. */
export function pack(items: Item[], cols: number, rows: number): { placed: Placed[]; overflow: Item[] } {
  const used = Array.from({ length: rows }, () => Array(cols).fill(false));
  const placed: Placed[] = [];
  const overflow: Item[] = [];
  for (const it of items) {
    let [iw, ih] = it.kind === 'app' ? [1, 1] : CELLS[it.size];
    iw = Math.min(iw, cols); ih = Math.min(ih, rows);
    let spot: [number, number] | null = null;
    for (let y = 0; y + ih <= rows && !spot; y++) {
      for (let x = 0; x + iw <= cols && !spot; x++) {
        let free = true;
        for (let dy = 0; dy < ih && free; dy++) for (let dx = 0; dx < iw && free; dx++) if (used[y + dy][x + dx]) free = false;
        if (free) spot = [x, y];
      }
    }
    if (!spot) { overflow.push(it); continue; }
    for (let dy = 0; dy < ih; dy++) for (let dx = 0; dx < iw; dx++) used[spot[1] + dy][spot[0] + dx] = true;
    placed.push({ item: it, x: spot[0], y: spot[1], w: iw, h: ih });
  }
  return { placed, overflow };
}

/** Pages as shown: items the school turned off are skipped, overflow spills onto the next page. */
export function displayPages(layout: Layout, cols: number, rows: number): Placed[][] {
  const out: Placed[][] = [];
  let carry: Item[] = [];
  const pages = layout.pages.length ? layout.pages : [[]];
  for (let i = 0; i < pages.length || carry.length; i++) {
    const { placed, overflow } = pack([...carry, ...(pages[i] ?? [])], cols, rows);
    carry = overflow;
    out.push(placed);
    if (i > pages.length + 20) break;
  }
  return out;
}

/** Drops what the school turned off and puts newly allowed apps on the last page. */
function reconcile(l: Layout, cfg: DockConfig): Layout {
  const allowed = new Set(enabledApps(cfg));
  const widgetOk = (t: WidgetType) => cfg.widgets && (WIDGET_APP[t] == null || allowed.has(WIDGET_APP[t]!));
  const pages = l.pages.map((p) => p.filter((it) => (it.kind === 'app' ? allowed.has(it.id) : widgetOk(it.type))));
  const dock = l.dock.filter((id) => allowed.has(id));
  const seen = new Set([...dock, ...l.removed, ...pages.flat().filter((it) => it.kind === 'app').map((it) => it.id)]);
  const missing = [...allowed].filter((id) => !seen.has(id));
  if (missing.length) {
    if (!pages.length) pages.push([]);
    pages[pages.length - 1] = [...pages[pages.length - 1], ...missing.map(a)];
  }
  return { pages: pages.length ? pages : [[]], dock, removed: l.removed.filter((id) => allowed.has(id)) };
}

type Ctx = {
  layout: Layout;                 // what's shown (school's choices applied)
  prefs: Prefs;
  canCustomize: boolean;
  setLayout: (fn: (l: Layout) => Layout) => void;
  setPrefs: (patch: Partial<Prefs>) => void;
  setLock: (patch: Partial<LockStyle>) => void;
  reset: () => void;
};
const LayoutCtx = createContext<Ctx | null>(null);
const LKEY = 'dock.layout.v1';
const PKEY = 'dock.prefs.v1';

export function LayoutProvider({ children }: { children: ReactNode }) {
  const { cfg } = useDock();
  const [raw, setRaw] = useState<Layout>(DEFAULT_LAYOUT);
  const [prefs, setP] = useState<Prefs>(DEFAULT_PREFS);

  useEffect(() => {
    AsyncStorage.getItem(LKEY).then((s) => { if (s) try { setRaw({ ...DEFAULT_LAYOUT, ...JSON.parse(s) }); } catch {} }).catch(() => {});
    AsyncStorage.getItem(PKEY).then((s) => {
      if (s) try { const j = JSON.parse(s); setP({ ...DEFAULT_PREFS, ...j, lock: { ...DEFAULT_LOCK, ...j.lock } }); } catch {}
    }).catch(() => {});
  }, []);

  const layout = useMemo(() => reconcile(raw, cfg), [raw, cfg]);
  const setLayout = useCallback((fn: (l: Layout) => Layout) => {
    setRaw((prev) => {
      const next = fn(reconcile(prev, cfg));
      // Empty pages in the middle go away, like on iPad.
      next.pages = next.pages.filter((p, i) => p.length || i === 0);
      AsyncStorage.setItem(LKEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, [cfg]);
  const setPrefs = useCallback((patch: Partial<Prefs>) => {
    setP((prev) => { const next = { ...prev, ...patch }; AsyncStorage.setItem(PKEY, JSON.stringify(next)).catch(() => {}); return next; });
  }, []);
  const setLock = useCallback((patch: Partial<LockStyle>) => {
    setP((prev) => { const next = { ...prev, lock: { ...prev.lock, ...patch } }; AsyncStorage.setItem(PKEY, JSON.stringify(next)).catch(() => {}); return next; });
  }, []);
  const reset = useCallback(() => { setRaw(DEFAULT_LAYOUT); AsyncStorage.setItem(LKEY, JSON.stringify(DEFAULT_LAYOUT)).catch(() => {}); }, []);

  // When the school turns customizing off, everyone sees the school's look.
  const shown = cfg.customize ? prefs : { ...DEFAULT_PREFS, iconSize: prefs.iconSize };
  const value = useMemo(() => ({ layout, prefs: shown, canCustomize: cfg.customize, setLayout, setPrefs, setLock, reset }), [layout, shown, cfg.customize, setLayout, setPrefs, setLock, reset]);
  return <LayoutCtx.Provider value={value}>{children}</LayoutCtx.Provider>;
}

export function useLayout() {
  const c = useContext(LayoutCtx);
  if (!c) throw new Error('useLayout outside LayoutProvider');
  return c;
}

// ---- edits (all return a new layout) ----

/** Moves an item to `index` on page `page` (from the grid or the dock). */
export function moveItem(l: Layout, key: string, page: number, index: number): Layout {
  let item: Item | undefined;
  const pages = l.pages.map((p) => p.filter((it) => { if (itemKey(it) === key) { item = it; return false; } return true; }));
  let dock = l.dock;
  if (!item && key.startsWith('app:')) {
    const id = key.slice(4);
    if (dock.includes(id)) { item = a(id); dock = dock.filter((d) => d !== id); }
  }
  if (!item) return l;
  while (pages.length <= page) pages.push([]);
  pages[page] = [...pages[page].slice(0, index), item, ...pages[page].slice(index)];
  return { ...l, pages, dock };
}

/** Puts an app into the dock at `index` (taking it off its page). */
export function moveToDock(l: Layout, id: string, index: number): Layout {
  if (!l.dock.includes(id) && l.dock.length >= MAX_DOCK) return l;
  const pages = l.pages.map((p) => p.filter((it) => !(it.kind === 'app' && it.id === id)));
  const dock = l.dock.filter((d) => d !== id);
  dock.splice(Math.max(0, Math.min(index, dock.length)), 0, id);
  return { ...l, pages, dock };
}

/** Takes an item off the home screen: apps go to the App Library, widgets are deleted. */
export function removeItem(l: Layout, key: string): Layout {
  const pages = l.pages.map((p) => p.filter((it) => itemKey(it) !== key));
  const dock = l.dock.filter((d) => `app:${d}` !== key);
  const removed = key.startsWith('app:') ? [...new Set([...l.removed, key.slice(4)])] : l.removed;
  return { pages, dock, removed };
}

export function addWidget(l: Layout, type: WidgetType, size: WidgetSize, page: number): Layout {
  const pages = l.pages.map((p) => p.slice());
  while (pages.length <= page) pages.push([]);
  pages[page] = [w(type, size), ...pages[page]];
  return { ...l, pages };
}

/** Back onto the home screen from the App Library (end of the given page). */
export function addApp(l: Layout, id: string, page: number): Layout {
  const pages = l.pages.map((p) => p.filter((it) => !(it.kind === 'app' && it.id === id)));
  while (pages.length <= page) pages.push([]);
  pages[page] = [...pages[page], a(id)];
  return { ...l, pages, removed: l.removed.filter((r) => r !== id), dock: l.dock.filter((d) => d !== id) };
}

export function resizeWidget(l: Layout, key: string, size: WidgetSize): Layout {
  return { ...l, pages: l.pages.map((p) => p.map((it) => (itemKey(it) === key && it.kind === 'widget' ? { ...it, size } : it))) };
}
