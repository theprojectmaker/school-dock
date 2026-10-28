// The home bar along the bottom of every mini app: swipe it up (or tap it) to
// go back to the home screen. When the iPad is locked into School Dock, iOS's
// own home gesture is off, so this is the way home. A screen can ask for a
// light or dark bar to suit its background (useHomeBarTone).
import { createContext, type ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { Animated, PanResponder, View } from 'react-native';

import { useLauncher } from './launcher';

type Tone = 'light' | 'dark' | null;
const ToneCtx = createContext<(t: Tone) => void>(() => {});

/** Called by a screen whose background needs a specific bar colour; resets when it goes away. */
export function useHomeBarTone(tone: 'light' | 'dark') {
  const set = useContext(ToneCtx);
  useEffect(() => { set(tone); return () => set(null); }, [tone, set]);
}

export function HomeBarHost({ fallback, children }: { fallback: 'light' | 'dark'; children: ReactNode }) {
  const [tone, setTone] = useState<Tone>(null);
  return (
    <ToneCtx.Provider value={setTone}>
      {children}
      <HomeBar light={(tone ?? fallback) === 'light'} />
    </ToneCtx.Provider>
  );
}

function HomeBar({ light }: { light: boolean }) {
  const { goHome } = useLauncher();
  const lift = useRef(new Animated.Value(0)).current;
  const home = useRef(goHome);
  home.current = goHome;
  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, g) => g.dy < -4,
    onPanResponderMove: (_, g) => lift.setValue(Math.max(-30, Math.min(0, g.dy * 0.5))),
    onPanResponderRelease: (_, g) => {
      Animated.spring(lift, { toValue: 0, useNativeDriver: true, speed: 30 }).start();
      if (g.dy < -24 || g.vy < -0.4 || (Math.abs(g.dy) < 6 && Math.abs(g.dx) < 6)) home.current();
    },
    onPanResponderTerminate: () => Animated.spring(lift, { toValue: 0, useNativeDriver: true }).start(),
  })).current;

  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center' }}>
      <Animated.View {...pan.panHandlers} accessible accessibilityRole="button" accessibilityLabel="Home"
        style={{ width: 240, height: 30, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 8, transform: [{ translateY: lift }] }}>
        <View style={{ width: 150, height: 5, borderRadius: 3, backgroundColor: light ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.75)' }} />
      </Animated.View>
    </View>
  );
}
