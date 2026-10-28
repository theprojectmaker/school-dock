// Built-in wallpapers: quiet, flat colours, some with a topographic map
// texture (contour lines drawn from a fixed seed, so every iPad gets the same
// picture). A school can also pick a photo.
export type Wallpaper = {
  id: string; name: string;
  top: string; bottom: string;   // a very gentle vertical gradient
  lines?: string;                 // contour line colour, if this one has the map texture
  dark: boolean;
};

export const WALLPAPERS: Wallpaper[] = [
  { id: 'north', name: 'North', top: '#15305A', bottom: '#0B1A33', lines: 'rgba(160,190,235,0.13)', dark: true },
  { id: 'pine', name: 'Pine', top: '#1F4436', bottom: '#11271F', lines: 'rgba(170,220,190,0.12)', dark: true },
  { id: 'harbor', name: 'Harbor', top: '#2E5D6E', bottom: '#183743', dark: true },
  { id: 'slate', name: 'Slate', top: '#4A5260', bottom: '#2C313A', dark: true },
  { id: 'graphite', name: 'Graphite', top: '#26272B', bottom: '#151619', lines: 'rgba(255,255,255,0.06)', dark: true },
];

export const wallpaperById = (id: string) => WALLPAPERS.find((w) => w.id === id) ?? WALLPAPERS[0];

/**
 * Contour lines as SVG paths in a 1000 x 1000 box, traced (marching squares)
 * from one made-up height map, so like a real topographic map the lines never
 * cross. One path per height level.
 */
export function contourPaths(): string[] {
  const hills = [
    { x: 230, y: 280, h: 1.0, r: 260 }, { x: 820, y: 210, h: 0.75, r: 200 },
    { x: 690, y: 780, h: 1.1, r: 300 }, { x: 140, y: 880, h: 0.6, r: 180 }, { x: 470, y: 520, h: -0.45, r: 220 },
  ];
  const height = (x: number, y: number) => {
    let v = 0.18 * Math.sin(x / 140 + Math.cos(y / 210)) + 0.12 * Math.cos(y / 120 - x / 400);
    for (const p of hills) v += p.h * Math.exp(-((x - p.x) ** 2 + (y - p.y) ** 2) / (2 * p.r * p.r));
    return v;
  };
  const N = 90, cell = 1000 / N;
  const g: number[][] = [];
  for (let j = 0; j <= N; j++) { g.push([]); for (let i = 0; i <= N; i++) g[j].push(height(i * cell, j * cell)); }
  const out: string[] = [];
  for (let level = -0.5; level <= 1.3; level += 0.055) {
    let d = '';
    const lerp = (a: number, b: number) => (level - a) / (b - a);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const a = g[j][i], b = g[j][i + 1], c = g[j + 1][i + 1], e = g[j + 1][i];
      const x0 = i * cell, y0 = j * cell;
      const pts: [number, number][] = [];
      if ((a < level) !== (b < level)) pts.push([x0 + lerp(a, b) * cell, y0]);
      if ((b < level) !== (c < level)) pts.push([x0 + cell, y0 + lerp(b, c) * cell]);
      if ((e < level) !== (c < level)) pts.push([x0 + lerp(e, c) * cell, y0 + cell]);
      if ((a < level) !== (e < level)) pts.push([x0, y0 + lerp(a, e) * cell]);
      for (let k = 0; k + 1 < pts.length; k += 2) d += `M${pts[k][0].toFixed(1)} ${pts[k][1].toFixed(1)}L${pts[k + 1][0].toFixed(1)} ${pts[k + 1][1].toFixed(1)}`;
    }
    if (d) out.push(d);
  }
  return out;
}
