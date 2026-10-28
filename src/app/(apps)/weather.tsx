// Weather, laid out like Apple's: the place, a big temperature and the sky
// over a gradient that follows the conditions; then the next 24 hours, ten
// days with temperature bars, and the details students actually check
// (feels like, rain chance, wind, sunrise and sunset).
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useHomeBarTone } from '@/components/dock/home-bar';
import { Icon } from '@/components/ui';
import { useDock } from '@/lib/dock';
import { condition, type Forecast, getForecast } from '@/lib/weather';

function sky(code: number, day: boolean): [string, string] {
  if (!day) return ['#0B1730', '#26365C'];
  if (code >= 95) return ['#2B3245', '#5A6378'];
  if (code >= 51) return ['#4B5D73', '#8A9AAD'];
  if (code === 3 || code === 45 || code === 48) return ['#5E7C99', '#A3B6C8'];
  return ['#2C6BC0', '#7DB3E8'];
}

const hourLabel = (t: number, i: number) => (i === 0 ? 'Now' : new Date(t).toLocaleTimeString([], { hour: 'numeric' }).replace(':00', '').replace(' ', ''));
const dayLabel = (t: number, i: number) => (i === 0 ? 'Today' : new Date(t).toLocaleDateString([], { weekday: 'short' }));
const clock = (t: number) => new Date(t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

function Card({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <View style={{ backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: 16, padding: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.18)' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <Icon name={icon} size={12} color="rgba(255,255,255,0.7)" />
        <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '700', letterSpacing: 0.4 }}>{title.toUpperCase()}</Text>
      </View>
      {children}
    </View>
  );
}

export default function WeatherScreen() {
  useHomeBarTone('light');
  const { cfg } = useDock();
  const ins = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [f, setF] = useState<Forecast | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (force = false) => {
    setBusy(true);
    try { setF(await getForecast(cfg.place, force)); setErr(''); }
    catch (e) { setErr(String((e as Error)?.message ?? e)); }
    finally { setBusy(false); }
  }, [cfg.place]);
  useEffect(() => { load(); }, [load]);

  const [top, bottom] = f ? sky(f.now.code, f.now.day) : ['#2C6BC0', '#7DB3E8'];
  const wide = width >= 900;

  if (!f) {
    return (
      <View style={{ flex: 1 }}>
        <LinearGradient colors={[top, bottom]} style={StyleSheet.absoluteFill} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          {err ? (
            <>
              <Text style={{ color: '#fff', fontSize: 20, fontWeight: '600' }}>Couldn't load the weather</Text>
              <Pressable onPress={() => load(true)} style={{ paddingHorizontal: 18, height: 40, borderRadius: 20, justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.2)' }}>
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Try again</Text>
              </Pressable>
            </>
          ) : <ActivityIndicator color="#fff" />}
        </View>
      </View>
    );
  }

  const now = condition(f.now.code, f.now.day);
  const today = f.days[0];
  const lo = Math.min(...f.days.map((d) => d.lo)), hi = Math.max(...f.days.map((d) => d.hi));
  const span = Math.max(1, hi - lo);

  const hourly = (
    <Card title="Next 24 hours" icon="clock">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 18, paddingRight: 6 }}>
        {f.hours.map((h, i) => (
          <View key={h.t} style={{ alignItems: 'center', gap: 8, minWidth: 40 }}>
            <Text style={{ color: '#fff', fontSize: 14, fontWeight: i === 0 ? '700' : '500' }}>{hourLabel(h.t, i)}</Text>
            <Icon name={condition(h.code, h.day).icon} size={22} color="#fff" />
            {h.pop >= 30 ? <Text style={{ color: '#9FD3FF', fontSize: 11.5, fontWeight: '700', marginTop: -6 }}>{h.pop}%</Text> : null}
            <Text style={{ color: '#fff', fontSize: 17, fontWeight: '600' }}>{h.temp}°</Text>
          </View>
        ))}
      </ScrollView>
    </Card>
  );

  const daily = (
    <Card title="10-day forecast" icon="calendar">
      {f.days.map((d, i) => (
        <View key={d.t} style={{ flexDirection: 'row', alignItems: 'center', height: 44, borderTopWidth: i ? StyleSheet.hairlineWidth : 0, borderTopColor: 'rgba(255,255,255,0.22)' }}>
          <Text style={{ width: 62, color: '#fff', fontSize: 17, fontWeight: '600' }}>{dayLabel(d.t, i)}</Text>
          <View style={{ width: 52, alignItems: 'center' }}>
            <Icon name={condition(d.code).icon} size={20} color="#fff" />
            {d.pop >= 30 ? <Text style={{ color: '#9FD3FF', fontSize: 10.5, fontWeight: '700' }}>{d.pop}%</Text> : null}
          </View>
          <Text style={{ width: 40, textAlign: 'right', color: 'rgba(255,255,255,0.6)', fontSize: 17, fontWeight: '600' }}>{d.lo}°</Text>
          <View style={{ flex: 1, height: 5, borderRadius: 3, marginHorizontal: 12, backgroundColor: 'rgba(0,0,0,0.18)' }}>
            <LinearGradient colors={['#7CD4F5', '#FFD15C']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={{ position: 'absolute', left: `${((d.lo - lo) / span) * 100}%`, width: `${Math.max(6, ((d.hi - d.lo) / span) * 100)}%`, height: 5, borderRadius: 3 }} />
          </View>
          <Text style={{ width: 36, color: '#fff', fontSize: 17, fontWeight: '600' }}>{d.hi}°</Text>
        </View>
      ))}
    </Card>
  );

  const tile = (title: string, icon: string, big: string, sub: string) => (
    <View style={{ flexBasis: '47%', flexGrow: 1 }}>
      <Card title={title} icon={icon}>
        <Text style={{ color: '#fff', fontSize: 30, fontWeight: '500' }}>{big}</Text>
        <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 4 }}>{sub}</Text>
      </Card>
    </View>
  );
  const details = (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
      {tile('Feels like', 'thermometer.medium', `${f.now.feels}°`, f.now.feels < f.now.temp - 2 ? 'Wind makes it feel colder.' : f.now.feels > f.now.temp + 2 ? 'Humidity makes it feel warmer.' : 'Close to the actual temperature.')}
      {tile('Rain today', 'umbrella.fill', `${today?.pop ?? 0}%`, (today?.pop ?? 0) >= 50 ? 'Bring an umbrella.' : 'Unlikely to need an umbrella.')}
      {tile('Wind', 'wind', `${f.now.wind} mph`, `Humidity ${f.now.humidity}%`)}
      {tile('Sun', 'sunrise.fill', today ? clock(today.sunset) : '-', today ? `Sunrise ${clock(today.sunrise)}` : '')}
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient colors={[top, bottom]} style={StyleSheet.absoluteFill} />
      <ScrollView contentContainerStyle={{ paddingTop: ins.top + 40, paddingHorizontal: 20, paddingBottom: 60, alignItems: 'center' }}
        refreshControl={<RefreshControl refreshing={busy} onRefresh={() => load(true)} tintColor="#fff" />}>
        <Text style={{ color: '#fff', fontSize: 32, fontWeight: '500' }}>{f.place}</Text>
        <Text style={{ color: '#fff', fontSize: 96, fontWeight: '200', lineHeight: 104, marginLeft: 24 }}>{f.now.temp}°</Text>
        <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 20, fontWeight: '500' }}>{now.text}</Text>
        {today ? <Text style={{ color: '#fff', fontSize: 20, fontWeight: '500', marginTop: 2 }}>H:{today.hi}°  L:{today.lo}°</Text> : null}

        <View style={{ width: '100%', maxWidth: wide ? 980 : 560, marginTop: 36, flexDirection: wide ? 'row' : 'column', gap: 14 }}>
          <View style={{ flex: wide ? 1 : undefined, gap: 14 }}>
            {hourly}
            {details}
          </View>
          <View style={{ flex: wide ? 1 : undefined }}>{daily}</View>
        </View>
        <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, marginTop: 20 }}>Weather data by Open-Meteo.com</Text>
      </ScrollView>
    </View>
  );
}
