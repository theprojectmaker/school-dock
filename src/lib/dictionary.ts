// Word lookups for the Dictionary app, from Datamuse (free, no key):
// definitions (WordNet + Wiktionary), synonyms, antonyms and spelling
// suggestions. Recent lookups stay on the iPad.
import AsyncStorage from '@react-native-async-storage/async-storage';

const API = 'https://api.datamuse.com';
const RECENT = 'dock.dictionary.recent';

export type Sense = { pos: string; defs: string[] };
export type Entry = { word: string; senses: Sense[]; syllables?: number; synonyms: string[]; antonyms: string[] };

const POS: Record<string, string> = { n: 'noun', v: 'verb', adj: 'adjective', adv: 'adverb', u: 'other' };

async function get<T>(path: string): Promise<T> {
  const r = await fetch(API + path);
  if (!r.ok) throw new Error(`The dictionary didn't answer (${r.status}).`);
  return r.json();
}

/** Spellings that start like what's typed (for the list under the search field). */
export async function suggest(prefix: string): Promise<string[]> {
  const q = prefix.trim();
  if (!q) return [];
  const list = await get<{ word: string }[]>(`/sug?s=${encodeURIComponent(q)}&max=8`);
  return list.map((x) => x.word);
}

/** A word's meanings grouped by part of speech; null when it isn't in the dictionary. */
export async function lookup(word: string): Promise<Entry | null> {
  const w = word.trim().toLowerCase();
  if (!w) return null;
  const q = encodeURIComponent(w);
  const [main, syn, ant] = await Promise.all([
    get<{ word: string; defs?: string[]; numSyllables?: number }[]>(`/words?sp=${q}&md=ds&max=1`),
    get<{ word: string }[]>(`/words?rel_syn=${q}&max=14`).catch(() => []),
    get<{ word: string }[]>(`/words?rel_ant=${q}&max=8`).catch(() => []),
  ]);
  const hit = main[0];
  if (!hit || hit.word.toLowerCase() !== w || !hit.defs?.length) return null;
  const by = new Map<string, string[]>();
  for (const d of hit.defs) {
    const [tag, ...rest] = d.split('\t');
    const text = rest.join('\t').trim().replace(/\s+/g, ' ');
    if (!text) continue;
    const pos = POS[tag] ?? 'other';
    const list = by.get(pos) ?? [];
    if (!list.some((x) => x.toLowerCase() === text.toLowerCase())) list.push(text);
    by.set(pos, list);
  }
  const order = ['noun', 'verb', 'adjective', 'adverb', 'other'];
  const senses = order.filter((p) => by.has(p)).map((pos) => ({ pos, defs: by.get(pos)!.slice(0, 8) }));
  return { word: hit.word, senses, syllables: hit.numSyllables, synonyms: syn.map((x) => x.word), antonyms: ant.map((x) => x.word) };
}

export async function recents(): Promise<string[]> {
  try { return JSON.parse((await AsyncStorage.getItem(RECENT)) ?? '[]'); } catch { return []; }
}

export async function remember(word: string): Promise<string[]> {
  const list = [word, ...(await recents()).filter((w) => w !== word)].slice(0, 30);
  AsyncStorage.setItem(RECENT, JSON.stringify(list)).catch(() => {});
  return list;
}
