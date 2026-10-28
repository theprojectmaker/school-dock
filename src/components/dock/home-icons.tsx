// Icons on the home screen grid (with labels) and in the frosted dock.
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { Platform, Pressable, Text, View } from 'react-native';

import type { AppId } from '@/lib/apps';
import { APPS } from '@/lib/apps';
import { AppIconArt, iconRadius, iconShadow } from './app-icon';
import { useLauncher } from './launcher';

function Tile({ id, size, refKey }: { id: AppId; size: number; refKey: string }) {
  const { register, launch } = useLauncher();
  return (
    <Pressable ref={(v) => register(refKey, v as any)} accessibilityRole="button" accessibilityLabel={APPS[id].name}
      onPress={() => { if (Platform.OS === 'ios') Haptics.selectionAsync().catch(() => {}); launch(id, refKey); }}
      style={{ width: size, height: size, ...iconShadow }}>
      {({ pressed }) => (
        <View>
          <AppIconArt app={APPS[id]} size={size} />
          {pressed ? <View style={{ position: 'absolute', top: 0, left: 0, width: size, height: size, borderRadius: iconRadius(size), backgroundColor: 'rgba(0,0,0,0.28)' }} /> : null}
        </View>
      )}
    </Pressable>
  );
}

export function GridIcon({ id, size, cell }: { id: AppId; size: number; cell: number }) {
  return (
    <View style={{ width: cell, alignItems: 'center' }}>
      <Tile id={id} size={size} refKey={`grid:${id}`} />
      <Text numberOfLines={1} style={{ marginTop: 7, color: '#fff', fontSize: 13, fontWeight: '500', textShadowColor: 'rgba(0,0,0,0.35)', textShadowRadius: 4, textShadowOffset: { width: 0, height: 1 } }}>
        {APPS[id].name}
      </Text>
    </View>
  );
}

export function Dock({ apps, size }: { apps: AppId[]; size: number }) {
  if (!apps.length) return null;
  const pad = Math.round(size * 0.2);
  return (
    <View style={{ borderRadius: size * 0.42, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 20 }}>
      <BlurView intensity={Platform.OS === 'ios' ? 60 : 40} tint={Platform.OS === 'ios' ? 'systemThinMaterialLight' : 'light'}
        style={{ flexDirection: 'row', gap: Math.round(size * 0.27), padding: pad, backgroundColor: Platform.OS === 'ios' ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.28)' }}>
        {apps.map((id) => <Tile key={id} id={id} size={size} refKey={`dock:${id}`} />)}
      </BlurView>
    </View>
  );
}
