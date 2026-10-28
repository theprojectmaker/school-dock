// The App Library: every app the school allows, sorted into categories the
// way iPadOS does it, with a search field that turns into an A-Z list. Apps
// taken off the home screen live here and can be added back.
import { BlurView } from 'expo-blur';
import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/ui';
import type { DockApp } from '@/lib/apps';
import { addApp, useLayout } from '@/lib/layout';
import { AppIconArt } from './app-icon';
import { tapHaptic } from './home-icons';
import { useLauncher } from './launcher';

const GROUPS: { name: string; ids: string[] }[] = [
  { name: 'School', ids: ['quill', 'classroom', 'studento'] },
  { name: 'Math & Practice', ids: ['desmos', 'khan', 'quizlet', 'kahoot'] },
  { name: 'Video Lessons', ids: ['edpuzzle'] },
  { name: 'Reference', ids: ['ray', 'dictionary', 'weather'] },
  { name: 'Utilities', ids: ['settings'] },
];

export function AppLibrary({ visible, apps, page, onClose }: { visible: boolean; apps: DockApp[]; page: number; onClose: () => void }) {
  const ins = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { launch, register } = useLauncher();
  const { layout, setLayout } = useLayout();
  const [q, setQ] = useState('');

  const byId = useMemo(() => new Map(apps.map((a) => [a.id, a])), [apps]);
  const groups = useMemo(() => {
    const used = new Set<string>();
    const out = GROUPS.map((g) => ({ name: g.name, apps: g.ids.map((id) => byId.get(id)).filter(Boolean) as DockApp[] }))
      .map((g) => { g.apps.forEach((a) => used.add(a.id)); return g; });
    const web = apps.filter((a) => !used.has(a.id));
    if (web.length) out.push({ name: 'Websites', apps: web });
    return out.filter((g) => g.apps.length);
  }, [apps, byId]);

  const open = (a: DockApp) => { tapHaptic(); onClose(); setTimeout(() => launch(a.id, `lib:${a.id}`), 60); };
  const tile = Math.min(250, (Math.min(width, 1000) - 48 - 3 * 26) / 4);
  const icon = (tile - 44) / 2;
  const list = apps.filter((a) => a.name.toLowerCase().includes(q.trim().toLowerCase())).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <BlurView intensity={70} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.2)' }]} />
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessible={false} />
      <View pointerEvents="box-none" style={{ flex: 1, paddingTop: ins.top + 24, alignItems: 'center' }}>
        <View style={{ width: Math.min(width - 48, 620), flexDirection: 'row', alignItems: 'center', gap: 8, height: 42, paddingHorizontal: 14, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.18)' }}>
          <Icon name="magnifyingglass" size={16} color="rgba(255,255,255,0.75)" />
          <TextInput value={q} onChangeText={setQ} placeholder="App Library" placeholderTextColor="rgba(255,255,255,0.65)" autoCorrect={false}
            style={{ flex: 1, color: '#fff', fontSize: 17, height: 42 }} />
          {q ? <Pressable onPress={() => setQ('')} hitSlop={8}><Icon name="xmark.circle.fill" size={16} color="rgba(255,255,255,0.75)" /></Pressable> : null}
        </View>

        {q.trim() ? (
          <ScrollView style={{ width: Math.min(width - 48, 620), marginTop: 18 }} contentContainerStyle={{ paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
            {list.map((a) => (
              <Pressable key={a.id} onPress={() => open(a)} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, height: 58, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.18)' }}>
                <AppIconArt app={a} size={40} />
                <Text style={{ flex: 1, color: '#fff', fontSize: 17 }}>{a.name}</Text>
                {layout.removed.includes(a.id) ? (
                  <Pressable onPress={() => setLayout((l) => addApp(l, a.id, page))} hitSlop={8} style={{ paddingHorizontal: 12, height: 30, borderRadius: 15, justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.2)' }}>
                    <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>Add to Home Screen</Text>
                  </Pressable>
                ) : null}
              </Pressable>
            ))}
            {!list.length ? <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 16, textAlign: 'center', marginTop: 30 }}>No apps match.</Text> : null}
          </ScrollView>
        ) : (
          <ScrollView style={{ alignSelf: 'stretch', marginTop: 26 }} contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 26, paddingHorizontal: 24, paddingBottom: 60 }}>
            {groups.map((g) => (
              <View key={g.name} style={{ width: tile, alignItems: 'center' }}>
                <View style={{ width: tile, height: tile, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.14)', padding: 14, flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
                  {g.apps.slice(0, 4).map((a) => (
                    <Pressable key={a.id} ref={(v) => register(`lib:${a.id}`, v as any)} onPress={() => open(a)} accessibilityLabel={a.name}>
                      <AppIconArt app={a} size={icon} />
                    </Pressable>
                  ))}
                </View>
                <Text style={{ color: '#fff', fontSize: 14, fontWeight: '500', marginTop: 8 }}>{g.name}</Text>
              </View>
            ))}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}
