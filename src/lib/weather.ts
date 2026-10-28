// Weather from Open-Meteo (free, no key). The place defaults to Great Neck, NY;
// the admin can change it. Forecasts are cached for ten minutes so the lock
// screen, the widget and the app share one request.
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Place = { name: string; lat: number; lon: number; tz: string };
export const GREAT_NECK: Place = { name: 'Great Neck', lat: 40.8007, lon: -73.7285, tz: 'America/New_York' };

export type Hour = { t: number; temp: number; code: number; pop: number; day: boolean };
export type Day = { t: number; hi: number; lo: number; code: number; pop: number; sunrise: number; sunset: number };
export type Forecast = {
  place: string; fetched: number;
  now: { temp: number; feels: number; code: number; day: boolean; wind: number; humidity: number };
  hours: Hour[]; days: Day[];
};

const CACHE = 'dock.weather.v1';
let mem: Forecast | null = null;

/** WMO weather code -> words + SF Symbol (day / night). */
export function condition(code: number, day = true): { text: string; icon: string } {
  if (code === 0) return { text: day ? 'Sunny' : 'Clear', icon: day ? 'sun.max.fill' : 'moon.stars.fill' };
  if (code === 1) return { text: 'Mostly Clear', icon: day ? 'sun.max.fill' : 'moon.fill' };
  if (code === 2) return { text: 'Partly Cloudy', icon: day ? 'cloud.sun.fill' : 'cloud.moon.fill' };
  if (code === 3) return { text: 'Cloudy', icon: 'cloud.fill' };
  if (code === 45 || code === 48) return { text: 'Foggy', icon: 'cloud.fog.fill' };
  if (code >= 51 && code <= 57) return { text: 'Drizzle', icon: 'cloud.drizzle.fill' };
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return { text: code >= 65 && code !== 80 ? 'Heavy Rain' : 'Rain', icon: code >= 65 ? 'cloud.heavyrain.fill' : 'cloud.rain.fill' };
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return { text: 'Snow', icon: 'cloud.snow.fill' };
  if (code >= 95) return { text: 'Thunderstorms', icon: 'cloud.bolt.rain.fill' };
  return { text: 'Cloudy', icon: 'cloud.fill' };
}

const ms = (s: string) => new Date(s).getTime();

export async function getForecast(place: Place, force = false): Promise<Forecast> {
  if (!mem) { try { mem = JSON.parse((await AsyncStorage.getItem(CACHE)) ?? 'null'); } catch {} }
  if (!force && mem && mem.place === place.name && Date.now() - mem.fetched < 10 * 60_000) return mem;
  const q = new URLSearchParams({
    latitude: String(place.lat), longitude: String(place.lon), timezone: place.tz || 'auto',
    temperature_unit: 'fahrenheit', wind_speed_unit: 'mph', forecast_days: '10',
    current: 'temperature_2m,apparent_temperature,weather_code,is_day,wind_speed_10m,relative_humidity_2m',
    hourly: 'temperature_2m,weather_code,precipitation_probability,is_day',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset',
  });
  const r = await fetch(`https://api.open-meteo.com/v1/forecast?${q}`);
  if (!r.ok) throw new Error('The weather service did not answer.');
  const j = await r.json();
  // Times come back in the place's local time without an offset; keep them as wall-clock times.
  const now = Date.now();
  const hours: Hour[] = j.hourly.time.map((t: string, i: number) => ({
    t: ms(t), temp: Math.round(j.hourly.temperature_2m[i]), code: j.hourly.weather_code[i], pop: j.hourly.precipitation_probability[i] ?? 0, day: !!j.hourly.is_day[i],
  })).filter((h: Hour) => h.t > now - 3600_000).slice(0, 25);
  const days: Day[] = j.daily.time.map((t: string, i: number) => ({
    t: ms(t + 'T12:00'), hi: Math.round(j.daily.temperature_2m_max[i]), lo: Math.round(j.daily.temperature_2m_min[i]), code: j.daily.weather_code[i],
    pop: j.daily.precipitation_probability_max[i] ?? 0, sunrise: ms(j.daily.sunrise[i]), sunset: ms(j.daily.sunset[i]),
  }));
  const c = j.current;
  mem = {
    place: place.name, fetched: now, hours, days,
    now: { temp: Math.round(c.temperature_2m), feels: Math.round(c.apparent_temperature), code: c.weather_code, day: !!c.is_day, wind: Math.round(c.wind_speed_10m), humidity: Math.round(c.relative_humidity_2m) },
  };
  AsyncStorage.setItem(CACHE, JSON.stringify(mem)).catch(() => {});
  return mem;
}

/** Finds a town for the admin's "Weather location" setting (US first). */
export async function findPlace(name: string): Promise<Place | null> {
  const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name.trim())}&count=5`);
  const j = await r.json();
  const hit = (j.results ?? []).sort((a: any, b: any) => Number(b.country_code === 'US') - Number(a.country_code === 'US'))[0];
  return hit ? { name: hit.name, lat: hit.latitude, lon: hit.longitude, tz: hit.timezone } : null;
}
