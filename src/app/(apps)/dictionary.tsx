// Dictionary: look a word up, hear it said, and jump through synonyms.
// Wide screens show the search list beside the entry, like the Mac app.
import * as Speech from 'expo-speech';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, Platform, Pressable, ScrollView, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/ui';
import { type Entry, lookup, recents, remember, suggest } from '@/lib/dictionary';
import { useTheme } from '@/lib/settings';

const SERIF = Platform.select({ ios: 'Georgia', default: 'Georgia, "Times New Roman", serif' });
const RED = '#B3262E';

export default function DictionaryScreen() {
  const t = useTheme();
  const ins = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const wide = width >= 820;
  const [q, setQ] = useState('');
  const [list, setList] = useState<string[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [entry, setEntry] = useState<Entry | null>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'missing' | 'error'>('idle');
  const [missing, setMissing] = useState('');
  const req = useRef(0);

  useEffect(() => { recents().then(setRecent); }, []);
  useEffect(() => {
    const n = ++req.current;
    if (!q.trim()) { setList([]); return; }
    const timer = setTimeout(() => suggest(q).then((s) => { if (n === req.current) setList(s); }).catch(() => {}), 160);
    return () => clearTimeout(timer);
  }, [q]);

  const open = async (word: string) => {
    Keyboard.dismiss();
    setState('loading');
    if (!wide) setQ('');
    try {
      const e = await lookup(word);
      if (!e) { setEntry(null); setMissing(word); setState('missing'); return; }
      setEntry(e); setState('idle');
      setRecent(await remember(e.word));
    } catch { setState('error'); }
  };

  const say = (w: string) => { Speech.stop(); Speech.speak(w, { language: 'en-US', rate: 0.9 }); };

  const rows = q.trim() ? list : recent;
  const searchPane = (
    <View style={{ flex: wide ? undefined : 0, width: wide ? 320 : undefined, borderRightWidth: wide ? 1 : 0, borderRightColor: t.line, backgroundColor: wide ? t.side : t.bg }}>
      <View style={{ padding: 14, paddingBottom: 8 }}>
        {wide ? <Text style={{ color: t.text, fontSize: 28, fontWeight: '800', letterSpacing: -0.6, marginBottom: 10 }}>Dictionary</Text> : null}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, height: 40, paddingHorizontal: 12, borderRadius: 11, backgroundColor: t.chip }}>
          <Icon name="magnifyingglass" size={15} color={t.faint} />
          <TextInput value={q} onChangeText={setQ} placeholder="Look up a word" placeholderTextColor={t.faint} autoCapitalize="none" autoCorrect={false}
            returnKeyType="search" onSubmitEditing={() => q.trim() && open(q.trim())} style={{ flex: 1, color: t.text, fontSize: 16, height: 40 }} />
          {q ? <Pressable onPress={() => setQ('')} hitSlop={8}><Icon name="xmark.circle.fill" size={16} color={t.faint} /></Pressable> : null}
        </View>
      </View>
      {wide || q.trim() ? (
        <ScrollView keyboardShouldPersistTaps="handled" style={{ flexGrow: wide ? 1 : 0, maxHeight: wide ? undefined : 320 }} contentContainerStyle={{ paddingHorizontal: 8, paddingBottom: 30 }}>
          {!q.trim() && recent.length ? <Text style={{ color: t.faint, fontSize: 12, fontWeight: '700', letterSpacing: 0.6, margin: 8 }}>RECENT</Text> : null}
          {rows.map((w) => (
            <Pressable key={w} onPress={() => open(w)} style={({ pressed }) => ({ paddingHorizontal: 12, height: 42, justifyContent: 'center', borderRadius: 9,
              backgroundColor: entry?.word === w ? t.accent + '22' : pressed ? t.chip : 'transparent' })}>
              <Text style={{ color: t.text, fontSize: 16 }}>{w}</Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}
    </View>
  );

  const body = (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: wide ? 44 : 22, paddingBottom: 80, maxWidth: 760 }}>
      {state === 'loading' ? <ActivityIndicator color={RED} style={{ marginTop: 60 }} />
        : state === 'missing' ? <Empty t={t} title={`No entry for "${missing}"`} sub="Check the spelling, or pick a word from the list." />
        : state === 'error' ? <Empty t={t} title="Couldn't reach the dictionary" sub="Check the Wi-Fi and try again." />
        : !entry ? <Empty t={t} title="Look up any word" sub="Type above. Meanings, synonyms and opposites show here." />
        : (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <Text style={{ color: t.text, fontSize: 44, fontFamily: SERIF, fontWeight: '700' }}>{entry.word}</Text>
              <Pressable onPress={() => say(entry.word)} accessibilityLabel={`Say ${entry.word}`}
                style={({ pressed }) => ({ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? RED + '33' : RED + '1A' })}>
                <Icon name="speaker.wave.2.fill" size={17} color={RED} />
              </Pressable>
            </View>
            {entry.syllables ? <Text style={{ color: t.sub, fontSize: 14, marginTop: 2 }}>{entry.syllables} syllable{entry.syllables > 1 ? 's' : ''}</Text> : null}

            {entry.senses.map((s) => (
              <View key={s.pos} style={{ marginTop: 26 }}>
                <Text style={{ color: RED, fontSize: 17, fontStyle: 'italic', fontFamily: SERIF, marginBottom: 8 }}>{s.pos}</Text>
                {s.defs.map((d, i) => (
                  <View key={i} style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
                    <Text style={{ color: t.faint, fontSize: 16, fontWeight: '700', width: 20, textAlign: 'right' }}>{i + 1}</Text>
                    <Text style={{ flex: 1, color: t.text, fontSize: 17, lineHeight: 24, fontFamily: SERIF }}>{d}</Text>
                  </View>
                ))}
              </View>
            ))}

            <Chips t={t} title="SYNONYMS" words={entry.synonyms} onPress={open} />
            <Chips t={t} title="OPPOSITES" words={entry.antonyms} onPress={open} />
          </>
        )}
    </ScrollView>
  );

  return (
    <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: ins.top, flexDirection: wide ? 'row' : 'column' }}>
      {searchPane}
      {body}
    </View>
  );
}

function Empty({ t, title, sub }: { t: ReturnType<typeof useTheme>; title: string; sub: string }) {
  return (
    <View style={{ alignItems: 'center', marginTop: 80, gap: 8 }}>
      <Text style={{ color: t.text, fontSize: 22, fontFamily: SERIF, fontWeight: '700', textAlign: 'center' }}>{title}</Text>
      <Text style={{ color: t.sub, fontSize: 15, textAlign: 'center' }}>{sub}</Text>
    </View>
  );
}

function Chips({ t, title, words, onPress }: { t: ReturnType<typeof useTheme>; title: string; words: string[]; onPress: (w: string) => void }) {
  if (!words.length) return null;
  return (
    <View style={{ marginTop: 28 }}>
      <Text style={{ color: t.faint, fontSize: 12, fontWeight: '800', letterSpacing: 0.8, marginBottom: 10 }}>{title}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {words.map((w) => (
          <Pressable key={w} onPress={() => onPress(w)} style={({ pressed }) => ({ paddingHorizontal: 13, height: 32, borderRadius: 16, justifyContent: 'center', backgroundColor: pressed ? t.line : t.chip })}>
            <Text style={{ color: t.text, fontSize: 15 }}>{w}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
