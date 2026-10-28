// An iPadOS app icon: a continuous-corner tile with a soft top sheen and an
// drawn glyph (icon-art.tsx). Used on the home screen, in the dock and by the launch zoom.
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import type { DockApp } from '@/lib/apps';
import { IconGlyph } from './icon-art';

export const iconRadius = (size: number) => size * 0.225;

export function AppIconArt({ app, size }: { app: DockApp; size: number }) {
  const r = iconRadius(size);
  return (
    <View style={{ width: size, height: size, borderRadius: r, overflow: 'hidden', borderCurve: 'continuous' } as any}>
      <LinearGradient colors={[app.top, app.bottom]} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={StyleSheet.absoluteFill} />
      <LinearGradient colors={['rgba(255,255,255,0.22)', 'rgba(255,255,255,0)']} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 0.55 }} style={StyleSheet.absoluteFill} />
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <IconGlyph id={app.id} size={size} />
      </View>
    </View>
  );
}

/** The icon's drop shadow lives on a wrapper so the tile itself can clip. */
export const iconShadow = {
  shadowColor: '#000', shadowOpacity: 0.22, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
};
