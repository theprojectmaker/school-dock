// Every home screen widget by type and size (small 2x2, medium 4x2, large
// 4x4 cells), built on the cards in widgets.tsx. Clock, Calendar and Weather
// are new here; Up Next, Due Soon and Recent Notes reuse their medium layouts.
import { Text, View } from 'react-native';
import Svg, { Circle, Line, Text as SvgText } from 'react-native-svg';

import { Icon } from '@/components/ui';
import type { WidgetSize, WidgetType } from '@/lib/layout';
import { fmtTime, whereNow } from '@/lib/schedule';
import { condition } from '@/lib/weather';
import { Card, DueSoonWidget, type HomeData, mmss, NotesWidget, UpNextWidget, useWidgetColors } from './widgets';

type Props = { type: WidgetType; size: WidgetSize; w: number; h: number; data: HomeData; refKey: string;
  onPress: () => void; onLongPress?: () => void; register: (key: string, v: any) => void };

/** Light iOS clock face: hour marks, the four numerals, black hands, orange second hand. */
function AnalogClock({ size, now, dark }: { size: number; now: Date; dark: boolean }) {
  const hr = (now.getHours() % 12) + now.getMinutes() / 60, mn = now.getMinutes() + now.getSeconds() / 60, sc = now.getSeconds();
  const hand = (angle: number, len: number) => ({ x2: 50 + Math.sin(angle) * len, y2: 50 - Math.cos(angle) * len });
  const ink = dark ? '#FFFFFF' : '#000000';
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Circle cx="50" cy="50" r="49" fill={dark ? '#1C1C1E' : '#FFFFFF'} />
      {Array.from({ length: 60 }, (_, i) => {
        const a = (i / 60) * Math.PI * 2, big = i % 5 === 0;
        return <Line key={i} x1={50 + Math.sin(a) * 46} y1={50 - Math.cos(a) * 46} x2={50 + Math.sin(a) * (big ? 41 : 44)} y2={50 - Math.cos(a) * (big ? 41 : 44)}
          stroke={ink} strokeOpacity={big ? 0.9 : 0.3} strokeWidth={big ? 1.6 : 0.8} />;
      })}
      {[12, 3, 6, 9].map((n) => {
        const a = (n / 12) * Math.PI * 2;
        return <SvgText key={n} x={50 + Math.sin(a) * 33} y={50 - Math.cos(a) * 33 + 5} fontSize="13" fontWeight="600" fill={ink} textAnchor="middle">{n}</SvgText>;
      })}
      <Line x1="50" y1="50" {...hand((hr / 12) * Math.PI * 2, 22)} stroke={ink} strokeWidth="4.2" strokeLinecap="round" />
      <Line x1="50" y1="50" {...hand((mn / 60) * Math.PI * 2, 34)} stroke={ink} strokeWidth="3" strokeLinecap="round" />
      <Line x1="50" y1="50" {...hand((sc / 60) * Math.PI * 2, 38)} stroke="#FF9500" strokeWidth="1.3" strokeLinecap="round" />
      <Circle cx="50" cy="50" r="2.6" fill="#FF9500" />
    </Svg>
  );
}

export function WidgetView({ type, size, w, h, data, refKey, onPress, onLongPress, register }: Props) {
  const c = useWidgetColors();
  const base = { w, h, onPress, onLongPress, register, refKey };
  const now = data.now;

  if (type === 'clock') {
    if (size === 's') {
      return (
        <Card {...base} pad={10}>
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><AnalogClock size={Math.min(w, h) - 20} now={now} dark={c.dark} /></View>
        </Card>
      );
    }
    return (
      <Card {...base}>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 18 }}>
          <AnalogClock size={h - 32} now={now} dark={c.dark} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: c.sub, fontSize: 13, fontWeight: '600' }}>{now.toLocaleDateString([], { weekday: 'long' })}</Text>
            <Text style={{ color: c.text, fontSize: 40, fontWeight: '600', fontVariant: ['tabular-nums'], letterSpacing: -1 }}>
              {now.getHours() % 12 || 12}:{String(now.getMinutes()).padStart(2, '0')}
            </Text>
            <Text style={{ color: c.sub, fontSize: 13 }}>{now.toLocaleDateString([], { month: 'long', day: 'numeric' })}</Text>
          </View>
        </View>
      </Card>
    );
  }

  if (type === 'date') {
    const at = whereNow(data.schedule, now);
    return (
      <Card {...base}>
        <Text style={{ color: '#FF3B30', fontSize: 13, fontWeight: '700', letterSpacing: 0.4 }}>{now.toLocaleDateString([], { weekday: 'long' }).toUpperCase()}</Text>
        <Text style={{ color: c.text, fontSize: 50, fontWeight: '300', lineHeight: 56, letterSpacing: -1.5 }}>{now.getDate()}</Text>
        <View style={{ flex: 1 }} />
        <Text numberOfLines={2} style={{ color: c.sub, fontSize: 13, fontWeight: '500' }}>
          {at.kind === 'class' ? `${at.period.name} until ${fmtTime(at.period.end)}` : at.kind === 'passing' ? `${at.next.name} at ${fmtTime(at.next.start)}` : 'No classes now'}
        </Text>
      </Card>
    );
  }

  if (type === 'weather') {
    const f = data.weather;
    const sky: [string, string] = f && !f.now.day ? ['#0B1730', '#2D3E66'] : ['#2C6BC0', '#6FA9E3'];
    if (!f) {
      return <Card {...base} bg={sky}><Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>Weather</Text><Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 4 }}>Loading…</Text></Card>;
    }
    const cond = condition(f.now.code, f.now.day);
    const today = f.days[0];
    return (
      <Card {...base} bg={sky}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <View>
            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>{f.place}</Text>
            <Text style={{ color: '#fff', fontSize: 42, fontWeight: '300', lineHeight: 48 }}>{f.now.temp}°</Text>
          </View>
          {size === 'm' ? (
            <View style={{ alignItems: 'flex-end' }}>
              <Icon name={cond.icon} size={20} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600', marginTop: 4 }}>{cond.text}</Text>
              {today ? <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>H:{today.hi}° L:{today.lo}°</Text> : null}
            </View>
          ) : null}
        </View>
        <View style={{ flex: 1 }} />
        {size === 's' ? (
          <View>
            <Icon name={cond.icon} size={16} color="#fff" />
            <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600', marginTop: 3 }}>{cond.text}</Text>
            {today ? <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>H:{today.hi}° L:{today.lo}°</Text> : null}
          </View>
        ) : (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            {f.hours.slice(0, 6).map((hh, i) => (
              <View key={hh.t} style={{ alignItems: 'center', gap: 4 }}>
                <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '600' }}>{i === 0 ? 'Now' : new Date(hh.t).toLocaleTimeString([], { hour: 'numeric' }).replace(' ', '')}</Text>
                <Icon name={condition(hh.code, hh.day).icon} size={16} color="#fff" />
                <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>{hh.temp}°</Text>
              </View>
            ))}
          </View>
        )}
      </Card>
    );
  }

  if (type === 'upnext' && size === 's') {
    const at = whereNow(data.schedule, now);
    const orange = '#FF8A1F';
    const frac = at.kind === 'class' ? 1 - at.left / at.total : 0;
    const R = 26, C = 2 * Math.PI * R;
    return (
      <Card {...base}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <Icon name="bell.fill" size={12} color={orange} />
          <Text style={{ color: orange, fontSize: 12, fontWeight: '700' }}>{at.kind === 'class' ? 'IN CLASS' : at.kind === 'passing' ? 'UP NEXT' : 'STUDENTO'}</Text>
        </View>
        {at.kind === 'free' ? (
          <View style={{ flex: 1, justifyContent: 'flex-end' }}>
            <Text style={{ color: c.text, fontSize: 17, fontWeight: '600' }}>{data.schedule.periods.length ? 'No class now' : 'No schedule'}</Text>
            <Text style={{ color: c.sub, fontSize: 12.5, marginTop: 2 }}>{data.schedule.periods.length ? 'Enjoy the break.' : 'Add it in Studento.'}</Text>
          </View>
        ) : (
          <View style={{ flex: 1, justifyContent: 'space-between' }}>
            <Text numberOfLines={1} style={{ color: c.text, fontSize: 17, fontWeight: '700', marginTop: 4 }}>{at.kind === 'class' ? at.period.name : at.next.name}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Svg width={60} height={60} viewBox="0 0 60 60">
                <Circle cx="30" cy="30" r={R} stroke={c.track} strokeWidth="6" fill="none" />
                {at.kind === 'class' ? <Circle cx="30" cy="30" r={R} stroke={orange} strokeWidth="6" fill="none" strokeDasharray={`${C * frac} ${C}`} strokeLinecap="round" transform="rotate(-90 30 30)" /> : null}
              </Svg>
              <Text style={{ color: c.text, fontSize: 20, fontWeight: '600', fontVariant: ['tabular-nums'] }}>{mmss(at.left)}</Text>
            </View>
          </View>
        )}
      </Card>
    );
  }

  if (type === 'upnext') return <UpNextWidget {...base} data={data} />;
  if (type === 'due') return <DueSoonWidget {...base} data={data} />;
  return <NotesWidget {...base} />;
}

export const WIDGET_INFO: Record<WidgetType, { name: string; blurb: string }> = {
  clock: { name: 'Clock', blurb: 'The time, at a glance.' },
  date: { name: 'Calendar', blurb: "Today's date and your next class." },
  weather: { name: 'Weather', blurb: 'Conditions and the next few hours.' },
  upnext: { name: 'Up Next', blurb: 'Time left in class and the next bell.' },
  due: { name: 'Due Soon', blurb: 'Classroom assignments coming up.' },
  notes: { name: 'Recent Notes', blurb: 'Jump back into your Quill notes.' },
};
