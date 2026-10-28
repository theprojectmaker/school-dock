// The hidden admin screen (long-press the school name on the lock screen, or
// the empty home screen, then the admin passcode). Laid out like iPadOS
// Settings: grouped rows for the school, the apps, the home screen and the
// student lock. Keys pushed by the school's MDM show as "Set by your school".
import * as ImagePicker from 'expo-image-picker';
import { type ReactNode, useEffect, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/ui';
import { APP_ORDER, APPS } from '@/lib/apps';
import { DEFAULT_SITES, type DockConfig, useDock } from '@/lib/dock';
import { fsx } from '@/lib/fsx';
import { lockAvailable, requestLock, useLocked } from '@/lib/lock';
import { WALLPAPERS } from '@/lib/wallpapers';
import { findPlace } from '@/lib/weather';
import { AppIconArt } from './app-icon';
import { PasscodePad } from './passcode';
import { Wallpaper } from './wallpaper';

const C = { bg: '#F2F2F7', card: '#FFFFFF', text: '#000000', sub: '#6C6C70', line: '#C6C6C8', blue: '#007AFF', red: '#FF3B30', green: '#34C759' };

function Section({ title, footer, children }: { title?: string; footer?: string; children: ReactNode }) {
  return (
    <View style={{ marginBottom: 30 }}>
      {title ? <Text style={{ color: C.sub, fontSize: 13, marginLeft: 20, marginBottom: 7 }}>{title.toUpperCase()}</Text> : null}
      <View style={{ backgroundColor: C.card, borderRadius: 12, overflow: 'hidden' }}>{children}</View>
      {footer ? <Text style={{ color: C.sub, fontSize: 13, marginHorizontal: 20, marginTop: 7, lineHeight: 18 }}>{footer}</Text> : null}
    </View>
  );
}

function Row({ left, label, right, onPress, last, danger, sub }: {
  left?: ReactNode; label: string; right?: ReactNode; onPress?: () => void; last?: boolean; danger?: boolean; sub?: string;
}) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => ({ backgroundColor: pressed && onPress ? '#E5E5EA' : C.card })}>
      <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: 46, paddingLeft: 16 }}>
        {left ? <View style={{ marginRight: 12 }}>{left}</View> : null}
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', minHeight: 46, paddingRight: 16, borderBottomWidth: last ? 0 : 0.5, borderBottomColor: C.line }}>
          <View style={{ flex: 1, paddingVertical: 10 }}>
            <Text style={{ color: danger ? C.red : onPress && !right ? C.blue : C.text, fontSize: 17 }}>{label}</Text>
            {sub ? <Text style={{ color: C.sub, fontSize: 13, marginTop: 2 }}>{sub}</Text> : null}
          </View>
          {right}
        </View>
      </View>
    </Pressable>
  );
}

const Managed = () => <Text style={{ color: C.sub, fontSize: 15 }}>Set by your school</Text>;

type Stage = 'pin' | 'main' | 'newCode' | 'confirmCode' | 'newPin' | 'confirmPin' | 'sites';

export function AdminScreen({ visible, onClose, onEditSchedule }: { visible: boolean; onClose: () => void; onEditSchedule: () => void }) {
  const dock = useDock();
  const { cfg, set, managed } = dock;
  const ins = useSafeAreaInsets();
  const locked = useLocked();
  const [stage, setStage] = useState<Stage>('pin');
  const [draft, setDraft] = useState('');
  const [lockMsg, setLockMsg] = useState<string | null>(null);
  const [school, setSchool] = useState(cfg.school);
  const [site, setSite] = useState('');
  const [webName, setWebName] = useState('');
  const [webUrl, setWebUrl] = useState('');
  const [webErr, setWebErr] = useState('');
  const addWebApp = () => {
    let u = webUrl.trim();
    if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
    let host = '';
    try { host = new URL(u).hostname.replace(/^www\./, ''); } catch {}
    if (!host || !host.includes('.')) { setWebErr("That doesn't look like a web address."); return; }
    const name = webName.trim() || host.split('.')[0].replace(/^./, (c) => c.toUpperCase());
    const palette = ['#2F6BFF', '#14A06A', '#E2504A', '#8B5CF6', '#F59E0B', '#0EA5E9', '#DB2777', '#475569'];
    const color = palette[([...host].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7) >>> 0) % palette.length];
    set({ webApps: [...cfg.webApps, { id: 'w_' + Date.now().toString(36), name, url: u, color }] });
    setWebName(''); setWebUrl(''); setWebErr('');
  };
  const [town, setTown] = useState(cfg.place.name);
  const saveTown = async () => {
    const n = town.trim();
    if (!n || n === cfg.place.name) { setTown(cfg.place.name); return; }
    try { const p = await findPlace(n); if (p) { set({ place: p }); setTown(p.name); } else setTown(cfg.place.name); } catch { setTown(cfg.place.name); }
  };

  useEffect(() => { if (visible) { setStage('pin'); setLockMsg(null); setSchool(cfg.school); } }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const is = (k: keyof DockConfig) => managed.has(k);

  const pickPhoto = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
    if (r.canceled || !r.assets[0]) return;
    const path = `dock/wallpaper_${Date.now().toString(36)}.jpg`;
    await fsx.copyIn(r.assets[0].uri, path);
    if (cfg.photo) fsx.remove(cfg.photo).catch(() => {});
    set({ wallpaper: 'photo', photo: path });
  };

  const lockNow = async (on: boolean) => {
    setLockMsg(null);
    const ok = await requestLock(on);
    if (!ok) {
      setLockMsg(on
        ? "This iPad isn't set up for Single App Mode by a school MDM, so iOS said no. Use Guided Access instead: Settings › Accessibility › Guided Access › On, then open School Dock and triple-click the top button."
        : 'iOS kept the lock on. If Guided Access is on, triple-click the top button and enter its passcode. If your MDM turned on Single App Mode, it has to be turned off there.');
    }
  };

  const shell = (children: ReactNode, title: string, done: string = 'Done') => (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ paddingTop: Platform.OS === 'ios' ? 14 : ins.top + 10, height: Platform.OS === 'ios' ? 58 : ins.top + 54, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, borderBottomWidth: 0.5, borderBottomColor: C.line, backgroundColor: 'rgba(249,249,249,0.94)' }}>
        <View style={{ flex: 1 }} />
        <Text style={{ position: 'absolute', left: 0, right: 0, textAlign: 'center', top: Platform.OS === 'ios' ? 28 : ins.top + 24, color: C.text, fontSize: 17, fontWeight: '600' }}>{title}</Text>
        <Pressable onPress={onClose} hitSlop={10}><Text style={{ color: C.blue, fontSize: 17, fontWeight: '600' }}>{done}</Text></Pressable>
      </View>
      {children}
    </View>
  );

  const pad = (title: string, subtitle: string | undefined, length: number, onSubmit: (c: string) => boolean | Promise<boolean>, onCancel: () => void) => shell(
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <PasscodePad light title={title} subtitle={subtitle} length={length} onSubmit={onSubmit} onCancel={onCancel} />
    </View>, 'School Dock Admin', 'Cancel');

  let body: ReactNode;
  if (stage === 'pin') {
    body = pad('Enter Admin Passcode', undefined, 6, async (c) => { if (await dock.checkPin(c)) { setStage('main'); return true; } return false; }, onClose);
  } else if (stage === 'newCode' || stage === 'confirmCode') {
    body = pad(stage === 'newCode' ? 'Choose a Student Passcode' : 'Enter It Again', 'Students type this 4-digit code after swiping up on the lock screen.', 4,
      (c) => {
        if (stage === 'newCode') { setDraft(c); setStage('confirmCode'); return true; }
        if (c !== draft) { setStage('newCode'); return false; }
        set({ passcode: c }); setStage('main'); return true;
      }, () => setStage('main'));
  } else if (stage === 'newPin' || stage === 'confirmPin') {
    body = pad(stage === 'newPin' ? 'New Admin Passcode' : 'Enter It Again', 'Six digits. Keep it away from students.', 6,
      async (c) => {
        if (stage === 'newPin') { setDraft(c); setStage('confirmPin'); return true; }
        if (c !== draft) { setStage('newPin'); return false; }
        await dock.setPin(c); setStage('main'); return true;
      }, () => setStage('main'));
  } else if (stage === 'sites') {
    const add = () => {
      const d = site.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '');
      if (d && /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(d) && !cfg.sites.includes(d)) set({ sites: [...cfg.sites, d].sort() });
      setSite('');
    };
    body = shell(
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 28, paddingBottom: ins.bottom + 40, maxWidth: 720, width: '100%', alignSelf: 'center' }} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => setStage('main')} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 18 }}>
          <Icon name="chevron.left" size={16} color={C.blue} /><Text style={{ color: C.blue, fontSize: 17 }}>Admin</Text>
        </Pressable>
        <Section title="Add a site" footer="Type a domain like nasa.gov. Its subdomains are allowed too.">
          <Row label="" left={<TextInput value={site} onChangeText={setSite} onSubmitEditing={add} placeholder="example.org" placeholderTextColor="#C7C7CC" autoCapitalize="none" autoCorrect={false}
            returnKeyType="done" style={{ minWidth: 300, fontSize: 17, color: C.text, paddingVertical: 10 }} />}
            right={<Pressable onPress={add} hitSlop={8}><Text style={{ color: C.blue, fontSize: 17, fontWeight: '600' }}>Add</Text></Pressable>} last />
        </Section>
        <Section title={`Allowed sites (${cfg.sites.length})`}>
          {cfg.sites.map((d, i) => (
            <Row key={d} label={d} last={i === cfg.sites.length - 1}
              right={<Pressable onPress={() => set({ sites: cfg.sites.filter((x) => x !== d) })} hitSlop={8}><Icon name="minus.circle.fill" size={20} color={C.red} /></Pressable>} />
          ))}
        </Section>
        <Section><Row label="Reset to the Starter List" onPress={() => set({ sites: DEFAULT_SITES })} last /></Section>
      </ScrollView>, 'Allowed Sites');
  } else {
    body = shell(
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 28, paddingBottom: ins.bottom + 40, maxWidth: 720, width: '100%', alignSelf: 'center' }}>
        <Section title="School">
          <Row label="Name" right={is('school') ? <Managed /> : (
            <TextInput value={school} onChangeText={setSchool} onEndEditing={() => set({ school: school.trim() })} onBlur={() => set({ school: school.trim() })}
              placeholder="School name" placeholderTextColor="#C7C7CC" style={{ minWidth: 240, textAlign: 'right', fontSize: 17, color: C.sub, paddingVertical: 8 }} />
          )} />
          <Row label="Weather Location" right={
            <TextInput value={town} onChangeText={setTown} onSubmitEditing={saveTown} onBlur={saveTown} placeholder="Town" placeholderTextColor="#C7C7CC"
              style={{ minWidth: 240, textAlign: 'right', fontSize: 17, color: C.sub, paddingVertical: 8 }} />} last />
        </Section>

        <Section title="Wallpaper" footer={is('wallpaper') ? 'Set by your school.' : undefined}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 14 }}>
            {WALLPAPERS.map((w) => (
              <Pressable key={w.id} disabled={is('wallpaper')} onPress={() => set({ wallpaper: w.id })} style={{ alignItems: 'center', gap: 6 }}>
                <View style={{ width: 84, height: 112, borderRadius: 12, overflow: 'hidden', borderWidth: cfg.wallpaper === w.id ? 3 : 0, borderColor: C.blue }}>
                  <Wallpaper id={w.id} />
                </View>
                <Text style={{ fontSize: 13, color: cfg.wallpaper === w.id ? C.blue : C.text }}>{w.name}</Text>
              </Pressable>
            ))}
            <Pressable disabled={is('wallpaper')} onPress={pickPhoto} style={{ alignItems: 'center', gap: 6 }}>
              <View style={{ width: 84, height: 112, borderRadius: 12, overflow: 'hidden', backgroundColor: '#E5E5EA', alignItems: 'center', justifyContent: 'center', borderWidth: cfg.wallpaper === 'photo' ? 3 : 0, borderColor: C.blue }}>
                {cfg.photo ? <Wallpaper id="photo" photo={cfg.photo} /> : <Icon name="photo.fill" size={26} color="#8E8E93" />}
              </View>
              <Text style={{ fontSize: 13, color: cfg.wallpaper === 'photo' ? C.blue : C.text }}>Photo…</Text>
            </Pressable>
          </ScrollView>
        </Section>

        <Section title="Apps" footer="Hidden apps disappear from the home screen and dock. Turning off Desmos also removes the calculator inside Quill. Website apps can only open their own site and its sign-in pages.">
          {APP_ORDER.map((id, i) => (
            <Row key={id} left={<AppIconArt app={APPS[id]} size={29} />} label={APPS[id].name} last={i === APP_ORDER.length - 1}
              right={is('apps') ? <Managed /> : <Switch trackColor={{ false: '#E9E9EB', true: '#34C759' }} ios_backgroundColor="#E9E9EB" value={cfg.apps[id]} onValueChange={(v) => set({ apps: { ...cfg.apps, [id]: v } })} />} />
          ))}
        </Section>

        <Section title="Website Apps" footer={webErr || 'Any website as an app on the home screen, with its own icon. It opens in the locked browser and can only go to its own site and Google, Microsoft or Clever sign-in.'}>
          {cfg.webApps.map((w) => (
            <Row key={w.id} label={w.name} sub={w.url}
              right={<Pressable onPress={() => set({ webApps: cfg.webApps.filter((x) => x.id !== w.id) })} hitSlop={8}><Icon name="minus.circle.fill" size={20} color={C.red} /></Pressable>} />
          ))}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 8 }}>
            <TextInput value={webName} onChangeText={setWebName} placeholder="Name" placeholderTextColor="#C7C7CC" style={{ width: 140, fontSize: 17, color: C.text, paddingVertical: 8 }} />
            <TextInput value={webUrl} onChangeText={(t) => { setWebUrl(t); setWebErr(''); }} onSubmitEditing={addWebApp} placeholder="website.com" placeholderTextColor="#C7C7CC"
              autoCapitalize="none" autoCorrect={false} keyboardType="url" style={{ flex: 1, fontSize: 17, color: C.text, paddingVertical: 8 }} />
            <Pressable onPress={addWebApp} hitSlop={8}><Text style={{ color: C.blue, fontSize: 17, fontWeight: '600' }}>Add</Text></Pressable>
          </View>
        </Section>

        <Section title="Home Screen">
          <Row label="Students can customize" sub="Wallpaper, lock screen and arranging the home screen" right={is('customize') ? <Managed /> : <Switch trackColor={{ false: '#E9E9EB', true: '#34C759' }} ios_backgroundColor="#E9E9EB" value={cfg.customize} onValueChange={(v) => set({ customize: v })} />} />
          <Row label="Widgets" sub="Clock, Calendar, Weather, Up Next, Due Soon, Recent Notes" right={is('widgets') ? <Managed /> : <Switch trackColor={{ false: '#E9E9EB', true: '#34C759' }} ios_backgroundColor="#E9E9EB" value={cfg.widgets} onValueChange={(v) => set({ widgets: v })} />} />
          <Row label="Students can edit the bell schedule" right={is('editSchedule') ? <Managed /> : <Switch trackColor={{ false: '#E9E9EB', true: '#34C759' }} ios_backgroundColor="#E9E9EB" value={cfg.editSchedule} onValueChange={(v) => set({ editSchedule: v })} />} />
          <Row label="Edit Bell Schedule…" onPress={onEditSchedule} last />
        </Section>

        <Section title="Ray (search)" footer={cfg.searchAnySite ? 'Students can open any site that comes up. SafeSearch stays strict and cannot be turned off.' : 'Ray shows strict SafeSearch results, and students can only open the sites on your list.'}>
          <Row label="Allow Any Website" right={is('searchAnySite') ? <Managed /> : <Switch trackColor={{ false: '#E9E9EB', true: '#34C759' }} ios_backgroundColor="#E9E9EB" value={cfg.searchAnySite} onValueChange={(v) => set({ searchAnySite: v })} />} />
          {is('sites') ? <Row label="Allowed Sites" right={<Managed />} last /> : (
            <Row label="Allowed Sites" right={<View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Text style={{ color: C.sub, fontSize: 17 }}>{cfg.sites.length}</Text><Icon name="chevron.right" size={13} color="#C7C7CC" /></View>}
              onPress={() => setStage('sites')} last />
          )}
        </Section>

        <Section title="Student Lock" footer={lockMsg ?? (lockAvailable()
          ? 'Single App Mode keeps students inside School Dock: no home gesture, no app switcher, no Control Center. On school iPads it needs the MDM setup in the README; on any iPad you can use Guided Access.'
          : 'Locking works in the iPad app.')}>
          <Row label="Single App Mode" right={<Text style={{ color: locked ? C.green : C.sub, fontSize: 17 }}>{locked ? 'On' : 'Off'}</Text>} />
          <Row label="Lock automatically at launch" right={is('autoLock') ? <Managed /> : <Switch trackColor={{ false: '#E9E9EB', true: '#34C759' }} ios_backgroundColor="#E9E9EB" value={cfg.autoLock} onValueChange={(v) => set({ autoLock: v })} />} />
          <Row label={locked ? 'Unlock This iPad' : 'Lock This iPad Now'} danger={locked} onPress={() => lockNow(!locked)} />
          <Row label="Student Passcode" right={is('passcode') ? <Managed /> : <Text style={{ color: C.sub, fontSize: 17 }}>{cfg.passcode ? 'On' : 'Off'}</Text>} last={is('passcode')} />
          {!is('passcode') ? <Row label={cfg.passcode ? 'Change Student Passcode…' : 'Turn Student Passcode On…'} onPress={() => setStage('newCode')} last={!cfg.passcode} /> : null}
          {!is('passcode') && cfg.passcode ? <Row label="Turn Student Passcode Off" danger onPress={() => set({ passcode: '' })} last /> : null}
        </Section>

        <Section title="Admin" footer={managed.size || dock.pinManaged ? 'Some settings are managed by your school.' : undefined}>
          {dock.pinManaged ? <Row label="Admin Passcode" right={<Managed />} last /> : <Row label="Change Admin Passcode…" onPress={() => setStage('newPin')} last />}
        </Section>
      </ScrollView>, 'School Dock Admin');
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'} onRequestClose={onClose}>
      {body}
    </Modal>
  );
}
