// The iOS passcode screen: a row of dots and a keypad of frosted round keys.
// Used for the student passcode on the lock screen, the admin PIN, and setup.
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { Animated, Platform, Pressable, Text, View } from 'react-native';

import { Icon } from '@/components/ui';

const KEYS: [string, string][] = [
  ['1', ''], ['2', 'A B C'], ['3', 'D E F'],
  ['4', 'G H I'], ['5', 'J K L'], ['6', 'M N O'],
  ['7', 'P Q R S'], ['8', 'T U V'], ['9', 'W X Y Z'],
];

export function PasscodePad({ title, subtitle, length = 4, onSubmit, onCancel, light }: {
  title: string;
  subtitle?: string;
  length?: number;
  /** Return false to shake and clear (wrong code). */
  onSubmit: (code: string) => boolean | Promise<boolean>;
  onCancel?: () => void;
  /** Dark text on a light background (admin screens) instead of white on the wallpaper. */
  light?: boolean;
}) {
  const [code, setCode] = useState('');
  const shake = useRef(new Animated.Value(0)).current;
  const checking = useRef(false);
  const fg = light ? '#000' : '#fff';

  useEffect(() => { setCode(''); }, [title]);

  const wrong = () => {
    if (Platform.OS === 'ios') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    // Keys are ignored while it shakes; then the dots clear (a timer, so a throttled frame clock can't strand it).
    checking.current = true;
    Animated.sequence([10, -10, 8, -8, 4, -4, 0].map((v) => Animated.timing(shake, { toValue: v, duration: 45, useNativeDriver: true }))).start();
    setTimeout(() => { setCode(''); checking.current = false; }, 340);
  };

  const press = async (d: string) => {
    if (checking.current || code.length >= length) return;
    if (Platform.OS === 'ios') Haptics.selectionAsync().catch(() => {});
    const next = code + d;
    setCode(next);
    if (next.length === length) {
      checking.current = true;
      await new Promise((r) => setTimeout(r, 90));   // let the last dot fill in
      const ok = await onSubmit(next);
      if (!ok) wrong(); else { setCode(''); checking.current = false; }
    }
  };

  const key = (d: string, letters: string) => (
    <Pressable key={d} onPress={() => press(d)} accessibilityLabel={d} style={{ width: 80, height: 80 }}>
      {({ pressed }) => (
        <View style={{ flex: 1, borderRadius: 40, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
          {light ? (
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: pressed ? '#C7C7CC' : '#E5E5EA' }} />
          ) : (
            <>
              <BlurView intensity={30} tint="light" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
              <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: pressed ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.16)' }} />
            </>
          )}
          <Text style={{ color: fg, fontSize: 36, fontWeight: '400', lineHeight: 40, fontVariant: ['tabular-nums'] }}>{d}</Text>
          {letters ? <Text style={{ color: fg, fontSize: 10, fontWeight: '700', letterSpacing: 2, marginTop: -1 }}>{letters}</Text> : null}
        </View>
      )}
    </Pressable>
  );

  return (
    <View style={{ alignItems: 'center' }}>
      <Icon name="lock.fill" size={20} color={fg} />
      <Text style={{ color: fg, fontSize: 20, fontWeight: '500', marginTop: 12 }}>{title}</Text>
      {subtitle ? <Text style={{ color: light ? '#6C6C70' : 'rgba(255,255,255,0.75)', fontSize: 14, marginTop: 6, textAlign: 'center', maxWidth: 320 }}>{subtitle}</Text> : null}
      <Animated.View style={{ flexDirection: 'row', gap: 22, marginTop: 22, marginBottom: 40, transform: [{ translateX: shake }] }}>
        {Array.from({ length }, (_, i) => (
          <View key={i} style={{ width: 13, height: 13, borderRadius: 7, borderWidth: 1.4, borderColor: fg, backgroundColor: i < code.length ? fg : 'transparent' }} />
        ))}
      </Animated.View>
      <View style={{ width: 80 * 3 + 26 * 2, flexDirection: 'row', flexWrap: 'wrap', columnGap: 26, rowGap: 16 }}>
        {KEYS.map(([d, l]) => key(d, l))}
        <View style={{ width: 80, height: 80 }} />
        {key('0', '')}
        <Pressable onPress={() => (code ? setCode(code.slice(0, -1)) : onCancel?.())} style={{ width: 80, height: 80, alignItems: 'center', justifyContent: 'center' }}
          accessibilityLabel={code ? 'Delete' : 'Cancel'}>
          <Text style={{ color: fg, fontSize: 17, fontWeight: '400' }}>{code ? 'Delete' : onCancel ? 'Cancel' : ''}</Text>
        </Pressable>
      </View>
    </View>
  );
}
