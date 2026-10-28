// The wallpaper behind the lock screen and home screen: a built-in one or the
// school's photo. `dim` darkens it.
import { LinearGradient } from 'expo-linear-gradient';
import { useMemo } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { useDock } from '@/lib/dock';
import { fsx } from '@/lib/fsx';
import { contourPaths, wallpaperById } from '@/lib/wallpapers';

let paths: string[] | null = null;

export function Wallpaper({ id, photo, dim = 0 }: { id?: string; photo?: string; dim?: number }) {
  const { cfg } = useDock();
  const which = id ?? cfg.wallpaper;
  const pic = which === 'photo' ? (photo ?? cfg.photo) : '';
  const w = wallpaperById(which);
  const lines = useMemo(() => (w.lines ? (paths ??= contourPaths()) : null), [w.lines]);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {pic ? (
        <>
          <Image source={{ uri: fsx.uri(pic) }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          {/* A light scrim so white text and icon labels stay readable on any photo. */}
          <LinearGradient colors={['rgba(0,0,0,0.25)', 'rgba(0,0,0,0.05)', 'rgba(0,0,0,0.3)']} style={StyleSheet.absoluteFill} />
        </>
      ) : (
        <>
          <LinearGradient colors={[w.top, w.bottom]} style={StyleSheet.absoluteFill} />
          {lines ? (
            <Svg style={StyleSheet.absoluteFill} viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid slice">
              {lines.map((d, i) => <Path key={i} d={d} stroke={w.lines} strokeWidth={1.6} fill="none" />)}
            </Svg>
          ) : null}
        </>
      )}
      {dim ? <View style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(0,0,0,${dim})` }]} /> : null}
    </View>
  );
}

/** Whether white text reads well on the current wallpaper. */
export function useWallpaperIsDark() {
  const { cfg } = useDock();
  return cfg.wallpaper === 'photo' ? true : wallpaperById(cfg.wallpaper).dark;
}
