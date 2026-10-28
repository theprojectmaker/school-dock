// Hand-drawn app icon artwork (100 x 100 artboard, drawn over the icon's
// gradient). Vector, so the same art shows at 29 pt in Settings, 80 pt on the
// home screen and in the launch zoom, on the iPad and in the web preview.
import Svg, { Circle, G, Line, Path, Polygon, Rect, Text as SvgText } from 'react-native-svg';

import { Image, Text, View } from 'react-native';

import type { AppId, DockApp } from '@/lib/apps';

const shadow = 'rgba(0,0,0,0.18)';

function Quill() {
  return (
    <>
      <Rect x="25" y="20" width="46" height="60" rx="7" fill={shadow} transform="translate(1.5 3)" />
      <Rect x="25" y="20" width="46" height="60" rx="7" fill="#FFFFFF" />
      <Path d="M33 36h30M33 46h30M33 56h20" stroke="#B9D2FF" strokeWidth="3" strokeLinecap="round" />
      <Path d="M33 67c5-6 8 4 13-2" stroke="#1F5BEA" strokeWidth="3" strokeLinecap="round" fill="none" />
      <G transform="rotate(40 66 50)">
        <Rect x="61" y="18" width="11" height="40" rx="3" fill="#1C1C22" />
        <Rect x="61" y="18" width="11" height="8" rx="3" fill="#FFC53D" />
        <Polygon points="61,58 72,58 66.5,72" fill="#E9EEF7" />
        <Polygon points="64.6,66 68.4,66 66.5,72" fill="#1C1C22" />
      </G>
    </>
  );
}

function Classroom() {
  return (
    <>
      <Rect x="16" y="22" width="68" height="46" rx="6" fill="#F6C76B" />
      <Rect x="20" y="26" width="60" height="38" rx="3" fill="#174D33" />
      <Path d="M28 40l6-6 6 6M34 34v14" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Path d="M48 38h22M48 46h16M48 54h20" stroke="rgba(255,255,255,0.75)" strokeWidth="3" strokeLinecap="round" />
      <Path d="M36 68l-6 14M64 68l6 14" stroke="#F6C76B" strokeWidth="4.5" strokeLinecap="round" />
      <Rect x="56" y="62" width="12" height="3.5" rx="1.5" fill="#FFFFFF" />
    </>
  );
}

function Desmos() {
  return (
    <>
      <Path d="M18 66h64M50 18v64" stroke="rgba(255,255,255,0.45)" strokeWidth="2.5" strokeLinecap="round" />
      <Path d="M24 24Q50 104 76 24" stroke="#3FE08E" strokeWidth="6.5" strokeLinecap="round" fill="none" />
      <Circle cx="63" cy="46" r="6.5" fill="#FFFFFF" />
      <Circle cx="63" cy="46" r="2.8" fill="#3FE08E" />
    </>
  );
}

function Studento() {
  const tile = (x: number, d: string) => (
    <G>
      <Rect x={x} y="24" width="30" height="48" rx="6" fill="#16171B" />
      <Rect x={x} y="24" width="30" height="24" rx="6" fill="#24262C" />
      <SvgText x={x + 15} y="61" fontSize="34" fontWeight="800" fill="#FFF3DE" textAnchor="middle">{d}</SvgText>
      <Line x1={x} y1="48" x2={x + 30} y2="48" stroke="#000" strokeWidth="1.5" />
    </G>
  );
  return (
    <>
      <Rect x="16" y="27" width="68" height="48" rx="8" fill={shadow} />
      {tile(17, '8')}
      {tile(53, '5')}
      <Circle cx="50" cy="41" r="2.6" fill="#FFF3DE" />
      <Circle cx="50" cy="55" r="2.6" fill="#FFF3DE" />
      <Path d="M44 18a6 6 0 0 1 12 0" stroke="#FFF3DE" strokeWidth="3.5" strokeLinecap="round" fill="none" />
    </>
  );
}

function Edpuzzle() {
  return (
    <>
      <Rect x="18" y="26" width="64" height="44" rx="9" fill="#FFFFFF" />
      <Polygon points="44,37 44,59 62,48" fill="#5A3FE6" />
      <Rect x="26" y="76" width="48" height="5" rx="2.5" fill="rgba(255,255,255,0.45)" />
      <Rect x="26" y="76" width="22" height="5" rx="2.5" fill="#FFFFFF" />
      <Circle cx="72" cy="28" r="11" fill="#FFC53D" />
      <SvgText x="72" y="33.5" fontSize="15" fontWeight="900" fill="#4B2FD6" textAnchor="middle">?</SvgText>
    </>
  );
}

function Khan() {
  return (
    <>
      <Polygon points="50,16 79,33 79,67 50,84 21,67 21,33" fill="#FFFFFF" />
      <Circle cx="50" cy="42" r="9" fill="#0B7F72" />
      <Path d="M32 56c4 12 12 17 18 17s14-5 18-17c-6 0-13 3-18 9-5-6-12-9-18-9z" fill="#0B7F72" />
    </>
  );
}

function Quizlet() {
  return (
    <>
      <Rect x="30" y="18" width="46" height="56" rx="8" fill="rgba(255,255,255,0.45)" transform="rotate(10 53 46)" />
      <Rect x="24" y="24" width="46" height="56" rx="8" fill="#FFFFFF" />
      <Circle cx="47" cy="50" r="13" stroke="#2335B8" strokeWidth="6" fill="none" />
      <Path d="M53 56l8 8" stroke="#2335B8" strokeWidth="6" strokeLinecap="round" />
    </>
  );
}

function Kahoot() {
  return (
    <>
      <Rect x="18" y="18" width="30" height="30" rx="6" fill="#FF3355" />
      <Rect x="52" y="18" width="30" height="30" rx="6" fill="#1368CE" />
      <Rect x="18" y="52" width="30" height="30" rx="6" fill="#FFA602" />
      <Rect x="52" y="52" width="30" height="30" rx="6" fill="#26890C" />
      <Polygon points="33,25 42,41 24,41" fill="#FFFFFF" />
      <Polygon points="67,24 76,33 67,42 58,33" fill="#FFFFFF" />
      <Circle cx="33" cy="67" r="8" fill="#FFFFFF" />
      <Rect x="60" y="60" width="14" height="14" rx="2" fill="#FFFFFF" />
    </>
  );
}

function Dictionary() {
  return (
    <>
      <Path d="M50 30c-9-6-20-7-30-5v48c10-2 21-1 30 5 9-6 20-7 30-5V25c-10-2-21-1-30 5z" fill={shadow} transform="translate(0 3)" />
      <Path d="M50 30c-9-6-20-7-30-5v48c10-2 21-1 30 5V30z" fill="#FFFFFF" />
      <Path d="M50 30c9-6 20-7 30-5v48c-10-2-21-1-30 5V30z" fill="#F1E7DA" />
      <SvgText x="35" y="60" fontSize="24" fontWeight="700" fill="#9B1C24" textAnchor="middle" fontFamily="Georgia, serif">A</SvgText>
      <SvgText x="65" y="60" fontSize="22" fontWeight="600" fill="#9B1C24" textAnchor="middle" fontFamily="Georgia, serif">a</SvgText>
    </>
  );
}

function Ray() {
  // Ray's mark: the R's bowl in navy, its leg in amber.
  return (
    <>
      <Path d="M31 78V22h24a17 17 0 0 1 0 34H31" stroke="#14213D" strokeWidth="11" strokeLinejoin="round" strokeLinecap="round" fill="none" />
      <Path d="M57 60l17 17" stroke="#FF9D1A" strokeWidth="11" strokeLinecap="round" />
    </>
  );
}

function Weather() {
  return (
    <>
      <Circle cx="40" cy="40" r="16" fill="#FFD54A" />
      <Path d="M34 74h36a13 13 0 0 0 1-26 18 18 0 0 0-34 4 11 11 0 0 0-3 22z" fill="#FFFFFF" />
    </>
  );
}

/** The Settings gear: twelve teeth, a ring and a hub, in two greys like iOS. */
function Settings() {
  const teeth = 12, R = 36, r = 29;
  let d = '';
  for (let k = 0; k < teeth; k++) {
    const a0 = (k / teeth) * Math.PI * 2, a1 = a0 + (Math.PI * 2) / teeth;
    const p = (a: number, rad: number) => `${(50 + Math.cos(a) * rad).toFixed(2)} ${(50 + Math.sin(a) * rad).toFixed(2)}`;
    const w = (Math.PI * 2) / teeth;
    d += (k ? 'L' : 'M') + p(a0 + w * 0.12, r) + 'L' + p(a0 + w * 0.28, R) + 'L' + p(a0 + w * 0.62, R) + 'L' + p(a0 + w * 0.78, r) + 'L' + p(a1 + w * 0.12, r);
  }
  return (
    <>
      <Path d={d + 'Z'} fill="#3A3A3E" />
      <Circle cx="50" cy="50" r="22" fill="#C7C7CC" />
      <Circle cx="50" cy="50" r="15" fill="#3A3A3E" />
      <Circle cx="50" cy="50" r="7" fill="#8E8E93" />
    </>
  );
}

const ART: Record<AppId, () => React.JSX.Element> = {
  quill: Quill, classroom: Classroom, desmos: Desmos, studento: Studento,
  edpuzzle: Edpuzzle, khan: Khan, quizlet: Quizlet, kahoot: Kahoot, dictionary: Dictionary, weather: Weather, ray: Ray, settings: Settings,
};

/** The app's artwork on a transparent background, `size` points square. Website apps show the site's own icon. */
export function IconGlyph({ app, size }: { app: DockApp; size: number }) {
  const Art = ART[app.id as AppId];
  if (!Art) {
    const host = app.web?.hosts[0] ?? '';
    return (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ position: 'absolute', color: '#fff', fontSize: size * 0.42, fontWeight: '700' }}>{app.name.slice(0, 1).toUpperCase()}</Text>
        {host ? <Image source={{ uri: `https://icons.duckduckgo.com/ip3/${host}.ico` }} style={{ width: size * 0.5, height: size * 0.5, borderRadius: size * 0.1 }} /> : null}
      </View>
    );
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Art />
    </Svg>
  );
}
