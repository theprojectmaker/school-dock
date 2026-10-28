// Ray, school edition: the look of Ray (the private search browser) with none
// of the proxy. It searches DuckDuckGo with strict SafeSearch straight from
// the iPad, so the school's own web filter still applies. By default only the
// school's approved sites can be opened: other results are greyed out on the
// page and any link to them is blocked. The admin can instead allow any site
// (SafeSearch stays on).
import { useRef, useState } from 'react';
import { Image, Keyboard, Platform, Pressable, ScrollView, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { WebView } from 'react-native-webview';

import { Icon, IconButton, useToast } from '@/components/ui';
import { hostAllowed } from '@/lib/apps';
import { useDock } from '@/lib/dock';
import { groupSites } from '@/lib/sites';

const DDG = ['duckduckgo.com'];
const SAFARI = 'Version/17.0 Mobile/15E148 Safari/604.1';
// Ray's colours (tests/veil/ui).
const R = { canvas: '#F6EDD9', bg: '#FFFAF0', pill: '#F1E7D0', line: '#E4D7BB', ink: '#14213D', sub: '#6B6250', link: '#2338B8', amber: '#FF9D1A' };

const searchUrl = (q: string) => `https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}&kp=1&kl=us-en`;

/** Page script: tidy DuckDuckGo's plain results page and grey out sites the school hasn't allowed. */
function pageScript(sites: string[], anySite: boolean) {
  return `(function(){
  if(!/duckduckgo[.]com$/.test(location.hostname))return;
  var allowed=${JSON.stringify(sites)}, any=${anySite ? 'true' : 'false'};
  function ok(u){try{var h=new URL(u,location.href).hostname.toLowerCase();return any||allowed.some(function(d){return h===d||h.endsWith('.'+d)})}catch(e){return false}}
  function real(u){try{var x=new URL(u,location.href);var d=x.searchParams.get('uddg');return d?decodeURIComponent(d):x.href}catch(e){return u}}
  // DuckDuckGo's content policy blocks <style> tags, so styles are set on the elements (CSSOM is allowed).
  function st(el,o){for(var k in o)el.style.setProperty(k,o[k],'important')}
  document.querySelectorAll('#header,.header,.header__form,.feedback-btn,.result--ad,.badge--ad,.zci-wrapper,.result__icon').forEach(function(e){st(e,{display:'none'})});
  st(document.body,{font:'16px -apple-system,system-ui,sans-serif',background:'${R.bg}',color:'${R.ink}',margin:'0',padding:'6px 18px 40px'});
  var n=0;
  document.querySelectorAll('.result').forEach(function(r){
    var a=r.querySelector('a.result__a'); if(!a)return;
    var u=real(a.getAttribute('href')); r.querySelectorAll('a').forEach(function(x){x.setAttribute('href',u)});
    st(r,{border:'0',padding:'14px 4px',margin:'0','border-bottom':'1px solid ${R.line}',background:'transparent'});
    st(a,{'font-size':'18px','font-weight':'600',color:'${R.link}','text-decoration':'none'});
    r.querySelectorAll('.result__snippet').forEach(function(x){st(x,{color:'#3d3a33','font-size':'15px','line-height':'1.4'})});
    if(!ok(u)){
      st(r,{opacity:'.38','pointer-events':'none'});
      var t=document.createElement('div');t.textContent='Not on your school list';
      st(t,{display:'inline-block','margin-top':'6px','font-size':'12px','font-weight':'600',color:'${R.sub}',background:'${R.pill}','border-radius':'6px',padding:'2px 8px'});
      r.appendChild(t);
    } else n++;
  });
  window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify({open:n}));
})();true;`;
}

/** Ray's wordmark: the R drawn as a mark, then "ay". */
function Wordmark({ size }: { size: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 1 }}>
      <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
        <Path d="M13 41V9h13a9.5 9.5 0 0 1 0 19H13" stroke={R.ink} strokeWidth={7.5} strokeLinejoin="round" />
        <Path d="M27.5 30.5L40 42" stroke={R.amber} strokeWidth={7.5} strokeLinecap="round" />
      </Svg>
      <Text style={{ color: R.ink, fontSize: size * 1.02, fontWeight: '700', letterSpacing: -size * 0.04, lineHeight: size * 1.05, marginBottom: -size * 0.12 }}>ay</Text>
    </View>
  );
}

export default function RayScreen() {
  const ins = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { cfg } = useDock();
  const { toast } = useToast();
  const view = useRef<WebView>(null);
  const [text, setText] = useState('');
  const [url, setUrl] = useState<string | null>(null);
  const [nav, setNav] = useState({ back: false, fwd: false, at: '' });
  const [hint, setHint] = useState<string | null>(null);

  const sites = cfg.sites;
  const canOpen = (u: string) => cfg.searchAnySite || hostAllowed(u, sites);

  const go = (q: string) => {
    const s = q.trim();
    if (!s) return;
    Keyboard.dismiss();
    setHint(null);
    // A typed address goes straight there (if it's allowed); anything else is a search.
    const looksLikeSite = /^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(s) && !s.includes(' ');
    if (looksLikeSite) {
      const u = 'https://' + s.replace(/^https?:\/\//, '');
      if (canOpen(u)) { setUrl(u); return; }
      toast(`${s} isn't on your school's list.`);
      return;
    }
    setUrl(searchUrl(s));
  };

  let host = '';
  try { host = new URL(nav.at).hostname.replace(/^www\./, ''); } catch {}
  const onResults = host.endsWith('duckduckgo.com');

  const field = (big: boolean) => (
    <View style={{ width: '100%', maxWidth: big ? 620 : 640, flexDirection: 'row', alignItems: 'center', gap: 10, height: big ? 54 : 38,
      paddingHorizontal: big ? 20 : 12, borderRadius: big ? 27 : 12, backgroundColor: big ? R.bg : R.pill, borderWidth: big ? 1 : 0, borderColor: R.line,
      shadowColor: '#5A4520', shadowOpacity: big ? 0.08 : 0, shadowRadius: 14, shadowOffset: { width: 0, height: 4 } }}>
      <Icon name={url && !onResults ? 'lock.fill' : 'magnifyingglass'} size={big ? 18 : 14} color={R.sub} />
      <TextInput value={text} onChangeText={setText} placeholder={url && !onResults ? host : 'Search with Ray'} placeholderTextColor={url && !onResults ? R.ink : R.sub}
        autoCapitalize="none" autoCorrect={false} returnKeyType="search" onSubmitEditing={() => go(text)} selectTextOnFocus
        style={{ flex: 1, color: R.ink, fontSize: big ? 18 : 16, height: big ? 54 : 38 }} />
      {text ? <Pressable onPress={() => setText('')} hitSlop={8}><Icon name="xmark.circle.fill" size={16} color={R.sub} /></Pressable> : null}
    </View>
  );

  const badge = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center', paddingHorizontal: 12, height: 28, borderRadius: 14, backgroundColor: R.pill }}>
      <Icon name="checkmark.shield.fill" size={13} color={R.ink} />
      <Text style={{ color: R.ink, fontSize: 13, fontWeight: '600' }}>{cfg.searchAnySite ? 'SafeSearch on' : `SafeSearch on · ${sites.length} school-approved sites`}</Text>
    </View>
  );

  const cols = width >= 1000 ? 4 : width >= 700 ? 3 : 2;
  const tileW = `${(100 - (cols - 1) * 1.4) / cols}%` as const;

  return (
    <View style={{ flex: 1, backgroundColor: R.canvas, paddingTop: ins.top }}>
      {url ? (
        <View style={{ height: 54, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, gap: 2 }}>
          <IconButton name="chevron.left" label="Back" color={R.ink} disabled={!nav.back} onPress={() => view.current?.goBack()} />
          <IconButton name="chevron.right" label="Forward" color={R.ink} disabled={!nav.fwd} onPress={() => view.current?.goForward()} />
          <Pressable onPress={() => { setUrl(null); setText(''); }} accessibilityLabel="Ray home" style={{ paddingHorizontal: 8 }}><Wordmark size={22} /></Pressable>
          <View style={{ flex: 1, alignItems: 'center', paddingHorizontal: 6 }}>{field(false)}</View>
        </View>
      ) : null}
      {url ? (
        Platform.OS === 'web' ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: R.bg, gap: 10 }}>
            {badge}
            <Text style={{ color: R.sub, fontSize: 15 }}>Results open on the iPad.</Text>
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            {hint ? <Text style={{ color: R.sub, fontSize: 13, textAlign: 'center', paddingVertical: 6 }}>{hint}</Text> : null}
            <WebView
              ref={view}
              source={{ uri: url }}
              style={{ flex: 1, backgroundColor: R.bg }}
              applicationNameForUserAgent={SAFARI}
              injectedJavaScript={pageScript(sites, cfg.searchAnySite)}
              setSupportMultipleWindows={false}
              allowsInlineMediaPlayback
              onMessage={(e) => {
                try {
                  const m = JSON.parse(e.nativeEvent.data);
                  if (typeof m.open === 'number' && !cfg.searchAnySite) setHint(m.open ? null : "None of these results are on your school's list. Try other words.");
                } catch {}
              }}
              onShouldStartLoadWithRequest={(r) => {
                if (r.isTopFrame === false) return true;
                if (/^(about|blob|data):/.test(r.url)) return true;
                if (hostAllowed(r.url, DDG)) {
                  // Keep SafeSearch strict on every results page.
                  if (/[?&]kp=(-1|-2)/.test(r.url)) return false;
                  return true;
                }
                if (canOpen(r.url)) return true;
                let to = r.url;
                try { to = new URL(r.url).hostname; } catch {}
                toast(`${to} isn't on your school's list, so it was blocked.`);
                return false;
              }}
              onNavigationStateChange={(s) => setNav({ back: s.canGoBack, fwd: s.canGoForward, at: s.url })}
            />
          </View>
        )
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ alignItems: 'center', paddingHorizontal: 24, paddingTop: 64, paddingBottom: 70 }} keyboardShouldPersistTaps="handled">
          <Wordmark size={64} />
          <View style={{ height: 28 }} />
          {field(true)}
          <View style={{ marginTop: 14 }}>{badge}</View>
          {!cfg.searchAnySite ? groupSites(sites).map((g) => (
            <View key={g.name} style={{ width: '100%', maxWidth: 900, marginTop: 34 }}>
              <Text style={{ color: R.sub, fontSize: 12, fontWeight: '800', letterSpacing: 0.9, marginBottom: 10 }}>{g.name.toUpperCase()}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {g.sites.map((s) => (
                  <Pressable key={s.domain} onPress={() => setUrl('https://' + s.domain)}
                    style={({ pressed }) => ({ width: tileW, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 14,
                      backgroundColor: pressed ? R.pill : R.bg, borderWidth: 1, borderColor: R.line })}>
                    <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: R.pill, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                      <Text style={{ position: 'absolute', color: R.ink, fontSize: 14, fontWeight: '800' }}>{s.label[0].toUpperCase()}</Text>
                      <Image source={{ uri: `https://icons.duckduckgo.com/ip3/${s.domain}.ico` }} style={{ width: 20, height: 20 }} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text numberOfLines={1} style={{ color: R.ink, fontSize: 14, fontWeight: '600' }}>{s.label}</Text>
                      <Text numberOfLines={1} style={{ color: R.sub, fontSize: 11.5 }}>{s.domain}</Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            </View>
          )) : null}
        </ScrollView>
      )}
    </View>
  );
}
