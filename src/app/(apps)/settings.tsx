// Settings, laid out like iPadOS Settings: a sidebar of sections and the chosen
// one on the right. Students set their own wallpaper, home screen and lock
// screen (when the school allows it); School Admin opens the PIN-protected
// admin screen.
import Constants from 'expo-constants';
import * as ImagePicker from 'expo-image-picker';
import { type ReactNode, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppIconArt } from '@/components/dock/app-icon';
import { clockFont, LockStyleControls } from '@/components/dock/lock-style';
import { useSession } from '@/components/dock/session';
import { Wallpaper } from '@/components/dock/wallpaper';
import { Icon } from '@/components/ui';
import { APPS } from '@/lib/apps';
import { useDock } from '@/lib/dock';
import { fsx } from '@/lib/fsx';
import { useLayout } from '@/lib/layout';
import { useLocked } from '@/lib/lock';
import { WALLPAPERS } from '@/lib/wallpapers';

const C = { bg: '#F2F2F7', card: '#FFFFFF', text: '#000', sub: '#6C6C70', line: '#C6C6C8', blue: '#007AFF', side: '#F2F2F7' };

type Page = 'wallpaper' | 'home' | 'lock' | 'guided' | 'admin' | 'about';
const PAGES: { id: Page; name: string; icon: string; color: string }[] = [
  { id: 'wallpaper', name: 'Wallpaper', icon: 'photo.fill', color: '#32ADE6' },
  { id: 'home', name: 'Home Screen & App Library', icon: 'square.grid.2x2', color: '#5856D6' },
  { id: 'lock', name: 'Lock Screen', icon: 'lock.fill', color: '#FF2D55' },
  { id: 'guided', name: 'Guided Access', icon: 'hand.raised.fill', color: '#34C759' },
  { id: 'admin', name: 'School Admin', icon: 'graduationcap.fill', color: '#FF9500' },
  { id: 'about', name: 'About', icon: 'info.circle.fill', color: '#8E8E93' },
];

function Group({ title, footer, children }: { title?: string; footer?: string; children: ReactNode }) {
  return (
    <View style={{ marginBottom: 28 }}>
      {title ? <Text style={{ color: C.sub, fontSize: 13, marginLeft: 16, marginBottom: 7 }}>{title.toUpperCase()}</Text> : null}
      <View style={{ backgroundColor: C.card, borderRadius: 12, overflow: 'hidden' }}>{children}</View>
      {footer ? <Text style={{ color: C.sub, fontSize: 13, marginHorizontal: 16, marginTop: 7, lineHeight: 18 }}>{footer}</Text> : null}
    </View>
  );
}

function Row({ label, right, onPress, last, blue, sub }: { label: string; right?: ReactNode; onPress?: () => void; last?: boolean; blue?: boolean; sub?: string }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => ({ backgroundColor: pressed && onPress ? '#E5E5EA' : C.card })}>
      <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: 46, marginLeft: 16, paddingRight: 16, borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth, borderBottomColor: C.line }}>
        <View style={{ flex: 1, paddingVertical: 10 }}>
          <Text style={{ color: blue ? C.blue : C.text, fontSize: 17 }}>{label}</Text>
          {sub ? <Text style={{ color: C.sub, fontSize: 13, marginTop: 2 }}>{sub}</Text> : null}
        </View>
        {right}
      </View>
    </Pressable>
  );
}

const Toggle = ({ value, onChange, disabled }: { value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) => (
  <Switch trackColor={{ false: '#E9E9EB', true: '#34C759' }} ios_backgroundColor="#E9E9EB" value={value} onValueChange={onChange} disabled={disabled} />
);

function Segmented<T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <View style={{ flexDirection: 'row', backgroundColor: 'rgba(118,118,128,0.12)', borderRadius: 9, padding: 2 }}>
      {options.map(([v, l]) => (
        <Pressable key={v} onPress={() => onChange(v)} style={{ paddingHorizontal: 16, height: 30, borderRadius: 7, justifyContent: 'center', backgroundColor: v === value ? '#fff' : 'transparent' }}>
          <Text style={{ fontSize: 14, fontWeight: v === value ? '600' : '400', color: '#000' }}>{l}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export default function SettingsScreen() {
  const ins = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const wide = width >= 820;
  const [page, setPage] = useState<Page | null>(wide ? 'wallpaper' : null);
  const { cfg } = useDock();
  const { prefs, setPrefs, setLock, canCustomize, reset } = useLayout();
  const { openAdmin } = useSession();
  const locked = useLocked();

  const lockedNote = canCustomize ? undefined : 'Your school chose this look. Ask a teacher to change it.';
  const current = wide ? page ?? 'wallpaper' : page;

  const pickPhoto = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
    if (r.canceled || !r.assets[0]) return;
    const path = `dock/mywall_${Date.now().toString(36)}.jpg`;
    await fsx.copyIn(r.assets[0].uri, path);
    if (prefs.photo) fsx.remove(prefs.photo).catch(() => {});
    setPrefs({ wallpaper: 'photo', photo: path });
  };

  const confirmReset = () => {
    const go = () => reset();
    if (Platform.OS === 'web') { go(); return; }
    Alert.alert('Reset Home Screen?', 'Apps and widgets go back to how they started.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Reset', style: 'destructive', onPress: go }]);
  };

  const detail = (p: Page) => {
    if (p === 'wallpaper') {
      const sel = prefs.wallpaper;
      const tile = (id: string | null, label: string, node: ReactNode) => (
        <Pressable key={label} disabled={!canCustomize} onPress={() => (id === 'photo' ? pickPhoto() : setPrefs({ wallpaper: id }))} style={{ alignItems: 'center', gap: 8 }}>
          <View style={{ width: 120, height: 160, borderRadius: 16, overflow: 'hidden', borderWidth: 3, borderColor: sel === id ? C.blue : 'transparent', backgroundColor: '#E5E5EA', alignItems: 'center', justifyContent: 'center' }}>{node}</View>
          <Text style={{ fontSize: 14, color: sel === id ? C.blue : C.text, fontWeight: sel === id ? '600' : '400' }}>{label}</Text>
        </Pressable>
      );
      return (
        <Group title="Choose a Wallpaper" footer={lockedNote ?? 'Used on both the lock screen and the home screen.'}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 18, padding: 18, opacity: canCustomize ? 1 : 0.5 }}>
            {tile(null, "School's", <Wallpaper id={cfg.wallpaper} photo={cfg.photo} />)}
            {WALLPAPERS.map((w) => tile(w.id, w.name, <Wallpaper id={w.id} />))}
            {tile('photo', 'Photo…', prefs.photo ? <Wallpaper id="photo" photo={prefs.photo} /> : <Icon name="photo.fill" size={30} color="#8E8E93" />)}
          </View>
        </Group>
      );
    }
    if (p === 'home') {
      return (
        <>
          <Group title="App Icons" footer={lockedNote ?? 'Large icons hide the names under them, like iPadOS.'}>
            <Row label="Size" right={<Segmented value={prefs.iconSize} options={[['normal', 'Normal'], ['large', 'Large']]} onChange={(v) => setPrefs({ iconSize: v })} />} />
            <Row label="Dark Icons" right={<Toggle value={prefs.darkIcons} onChange={(v) => setPrefs({ darkIcons: v })} disabled={!canCustomize} />} last />
          </Group>
          <View style={{ flexDirection: 'row', gap: 16, marginBottom: 28, paddingHorizontal: 4 }}>
            {(['quill', 'classroom', 'desmos', 'ray'] as const).map((id) => <AppIconArt key={id} app={APPS[id]} size={prefs.iconSize === 'large' ? 76 : 62} dark={prefs.darkIcons} />)}
          </View>
          <Group title="Editing" footer="Tip: touch and hold any icon or empty space on the home screen to move apps, add widgets with +, or take apps off (they stay in the App Library).">
            <Row label="Reset Home Screen Layout" blue onPress={canCustomize ? confirmReset : undefined} last />
          </Group>
        </>
      );
    }
    if (p === 'lock') {
      return (
        <>
          <View style={{ alignSelf: 'center', width: 260, height: 190, borderRadius: 20, overflow: 'hidden', marginBottom: 22, alignItems: 'center', justifyContent: 'center' }}>
            <Wallpaper />
            <Text style={{ color: prefs.lock.color, fontSize: 13, fontWeight: '600', opacity: 0.9 }}>Monday, June 9</Text>
            <Text style={[{ color: prefs.lock.color, fontSize: 64, lineHeight: 72, fontVariant: ['tabular-nums'] }, clockFont(prefs.lock.font)]}>9:41</Text>
          </View>
          <Group footer={lockedNote ?? 'You can also touch and hold the clock on the lock screen to customize it.'}>
            <View style={{ padding: 16, opacity: canCustomize ? 1 : 0.5 }} pointerEvents={canCustomize ? 'auto' : 'none'}>
              <LockStyleControls style={prefs.lock} onChange={setLock} />
            </View>
          </Group>
        </>
      );
    }
    if (p === 'guided') {
      return (
        <>
          <Group title="Lock to One App" footer="Teachers: open the app students should stay in (say, Desmos for a test), then tap the home bar at the bottom three times. Enter the admin passcode, pick a time limit and start. The home bar stops working until the time is up or you triple-tap it again and enter the passcode.">
            <Row label="Triple-tap the home bar" sub="Starts or ends a Guided Access session in the open app" right={<Icon name="hand.raised.fill" size={18} color="#34C759" />} last />
          </Group>
          <Group title="This iPad" footer={locked ? 'School Dock is locked on this iPad: students cannot leave it.' : "For the whole iPad, use your school's Single App Mode (see the README for IT) or Apple's Guided Access: Settings › Accessibility › Guided Access, then triple-click the top button inside School Dock."}>
            <Row label="Single App Mode" right={<Text style={{ color: locked ? '#34C759' : C.sub, fontSize: 17 }}>{locked ? 'On' : 'Off'}</Text>} last />
          </Group>
        </>
      );
    }
    if (p === 'admin') {
      return (
        <Group footer="School name, which apps show, website apps, Ray's allowed sites, passcodes and the iPad lock. Needs the admin passcode.">
          <Row label="Open School Admin…" blue onPress={openAdmin} last />
        </Group>
      );
    }
    return (
      <>
        <Group>
          <Row label="School" right={<Text style={{ color: C.sub, fontSize: 17 }}>{cfg.school || 'Not set'}</Text>} />
          <Row label="Version" right={<Text style={{ color: C.sub, fontSize: 17 }}>{Constants.expoConfig?.version ?? '1.0'}</Text>} />
          <Row label="Single App Mode" right={<Text style={{ color: C.sub, fontSize: 17 }}>{locked ? 'On' : 'Off'}</Text>} last />
        </Group>
        <Group title="Data" footer="Weather by Open-Meteo. Definitions by Datamuse. Search by DuckDuckGo with strict SafeSearch.">
          <Row label="Nothing is shared" sub="Notes, layout and settings stay on this iPad." last />
        </Group>
      </>
    );
  };

  const sidebar = (
    <ScrollView style={{ width: wide ? 340 : undefined, flexGrow: wide ? 0 : 1, flexShrink: 0, flex: wide ? undefined : 1, backgroundColor: C.side, borderRightWidth: wide ? StyleSheet.hairlineWidth : 0, borderRightColor: C.line }}
      contentContainerStyle={{ paddingTop: ins.top + 16, paddingHorizontal: 16, paddingBottom: 40 }}>
      <Text style={{ fontSize: 34, fontWeight: '700', color: '#000', marginLeft: 4, marginBottom: 16, letterSpacing: -0.5 }}>Settings</Text>
      <View style={{ backgroundColor: C.card, borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <View style={{ width: 54, height: 54, borderRadius: 27, backgroundColor: '#FF9500', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="graduationcap.fill" size={26} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={{ fontSize: 18, fontWeight: '600', color: '#000' }}>{cfg.school || 'School Dock'}</Text>
          <Text style={{ fontSize: 13, color: C.sub, marginTop: 2 }}>{locked ? 'Locked to School Dock' : 'School iPad'}</Text>
        </View>
      </View>
      <View style={{ backgroundColor: C.card, borderRadius: 12, overflow: 'hidden' }}>
        {PAGES.map((pg, i) => {
          const on = wide && current === pg.id;
          return (
            <Pressable key={pg.id} onPress={() => setPage(pg.id)} style={{ backgroundColor: on ? C.blue : C.card }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, height: 46, paddingLeft: 12 }}>
                <View style={{ width: 29, height: 29, borderRadius: 7, backgroundColor: pg.color, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name={pg.icon} size={16} color="#fff" />
                </View>
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch', paddingRight: 14, borderBottomWidth: i === PAGES.length - 1 ? 0 : StyleSheet.hairlineWidth, borderBottomColor: on ? 'transparent' : C.line }}>
                  <Text style={{ flex: 1, fontSize: 17, color: on ? '#fff' : '#000' }}>{pg.name}</Text>
                  {!wide ? <Icon name="chevron.right" size={13} color="#C7C7CC" /> : null}
                </View>
              </View>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );

  const pane = (p: Page) => (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ paddingTop: ins.top + 16, paddingHorizontal: 24, paddingBottom: 60, maxWidth: 760, width: '100%', alignSelf: 'center' }}>
      {!wide ? (
        <Pressable onPress={() => setPage(null)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 10 }}>
          <Icon name="chevron.left" size={17} color={C.blue} /><Text style={{ color: C.blue, fontSize: 17 }}>Settings</Text>
        </Pressable>
      ) : null}
      <Text style={{ fontSize: 28, fontWeight: '700', color: '#000', marginBottom: 20, marginLeft: 4 }}>{PAGES.find((x) => x.id === p)!.name}</Text>
      {detail(p)}
    </ScrollView>
  );

  return (
    <View style={{ flex: 1, flexDirection: 'row', backgroundColor: C.bg }}>
      {wide ? <>{sidebar}{pane(current!)}</> : current ? pane(current) : sidebar}
    </View>
  );
}
