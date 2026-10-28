// Lock screen styles: the clock fonts and colours, and the controls to pick
// them and the lock screen widgets. Used by the lock screen's own Customize
// mode and by Settings > Lock Screen.
import { Platform, Pressable, ScrollView, Switch, Text, View, type TextStyle } from 'react-native';

import { Icon } from '@/components/ui';
import type { LockFont, LockStyle, LockWidget } from '@/lib/layout';

export const LOCK_FONTS: { id: LockFont; name: string }[] = [
  { id: 'bold', name: 'Bold' }, { id: 'rounded', name: 'Rounded' }, { id: 'thin', name: 'Thin' },
  { id: 'serif', name: 'Serif' }, { id: 'condensed', name: 'Condensed' },
];
export const LOCK_COLORS = ['#FFFFFF', '#FFE7A8', '#FFC1C1', '#C9F0D6', '#BFE3FF', '#D9CCFF', '#1C1C1E'];
export const LOCK_WIDGETS: { id: LockWidget; name: string; icon: string }[] = [
  { id: 'weather', name: 'Weather', icon: 'cloud.sun.fill' },
  { id: 'class', name: 'Next Class', icon: 'bell.fill' },
  { id: 'due', name: 'Due Soon', icon: 'graduationcap.fill' },
  { id: 'date', name: 'Calendar', icon: 'calendar' },
  { id: 'notes', name: 'Notes', icon: 'pencil.and.scribble' },
];
export const MAX_LOCK_WIDGETS = 4;

/** The clock's typeface: iOS system faces on the iPad, close web stand-ins in the preview. */
export function clockFont(font: LockFont): TextStyle {
  const ios = Platform.OS === 'ios';
  switch (font) {
    case 'rounded': return { fontFamily: ios ? 'ui-rounded' : 'ui-rounded, "SF Pro Rounded", system-ui', fontWeight: '700' };
    case 'thin': return { fontWeight: '200' };
    case 'serif': return { fontFamily: ios ? 'ui-serif' : 'ui-serif, Georgia, serif', fontWeight: '600' };
    case 'condensed': return { fontFamily: ios ? 'AvenirNextCondensed-Heavy' : '"Arial Narrow", sans-serif-condensed, sans-serif', fontWeight: '800' };
    default: return { fontWeight: '700' };
  }
}

/** Font tiles, colour dots, widget picks and the notifications switch. `dark` = white text on a dark sheet. */
export function LockStyleControls({ style, onChange, dark }: { style: LockStyle; onChange: (p: Partial<LockStyle>) => void; dark?: boolean }) {
  const fg = dark ? '#fff' : '#000';
  const sub = dark ? 'rgba(255,255,255,0.6)' : '#6C6C70';
  const tileBg = dark ? 'rgba(255,255,255,0.12)' : '#fff';
  const label = (t: string) => <Text style={{ color: sub, fontSize: 13, fontWeight: '600', letterSpacing: 0.3, marginBottom: 10, marginTop: 4 }}>{t.toUpperCase()}</Text>;
  const toggleWidget = (w: LockWidget) => {
    const has = style.widgets.includes(w);
    if (has) onChange({ widgets: style.widgets.filter((x) => x !== w) });
    else if (style.widgets.length < MAX_LOCK_WIDGETS) onChange({ widgets: [...style.widgets, w] });
  };
  return (
    <View style={{ gap: 18 }}>
      <View>
        {label('Font')}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
          {LOCK_FONTS.map((f) => (
            <Pressable key={f.id} onPress={() => onChange({ font: f.id })}
              style={{ width: 92, height: 74, borderRadius: 14, backgroundColor: tileBg, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: style.font === f.id ? '#007AFF' : 'transparent' }}>
              <Text style={[{ color: fg, fontSize: 30, lineHeight: 36 }, clockFont(f.id)]}>9:41</Text>
              <Text style={{ color: sub, fontSize: 11, fontWeight: '600', marginTop: 2 }}>{f.name}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
      <View>
        {label('Color')}
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {LOCK_COLORS.map((c) => (
            <Pressable key={c} onPress={() => onChange({ color: c })} accessibilityLabel={`Clock color ${c}`}
              style={{ width: 34, height: 34, borderRadius: 17, padding: 3, borderWidth: 2, borderColor: style.color === c ? '#007AFF' : 'transparent' }}>
              <View style={{ flex: 1, borderRadius: 14, backgroundColor: c, borderWidth: 1, borderColor: 'rgba(0,0,0,0.12)' }} />
            </Pressable>
          ))}
        </View>
      </View>
      <View>
        {label(`Widgets (up to ${MAX_LOCK_WIDGETS})`)}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {LOCK_WIDGETS.map((w) => {
            const on = style.widgets.includes(w.id);
            return (
              <Pressable key={w.id} onPress={() => toggleWidget(w.id)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 34, paddingHorizontal: 12, borderRadius: 17, backgroundColor: on ? '#007AFF' : tileBg }}>
                <Icon name={w.icon} size={13} color={on ? '#fff' : fg} />
                <Text style={{ color: on ? '#fff' : fg, fontSize: 14, fontWeight: '600' }}>{w.name}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View>
          <Text style={{ color: fg, fontSize: 16 }}>Show assignments as notifications</Text>
          <Text style={{ color: sub, fontSize: 13, marginTop: 2 }}>Due soon from Classroom, at the bottom of the lock screen.</Text>
        </View>
        <Switch trackColor={{ false: '#E9E9EB', true: '#34C759' }} ios_backgroundColor="#E9E9EB" value={style.notifications} onValueChange={(v) => onChange({ notifications: v })} />
      </View>
    </View>
  );
}
