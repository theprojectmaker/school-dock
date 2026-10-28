// A school website (Edpuzzle, Khan Academy, Quizlet, Kahoot!) as an app: a
// slim Safari-style bar and a browser that only goes to that site and the
// sign-in pages it needs (Google, Microsoft, Clever). Anything else is
// blocked in place, so a link can't wander off to the rest of the web.
import { useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { Platform, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

import { AppIconArt } from '@/components/dock/app-icon';
import { Icon, IconButton, useToast } from '@/components/ui';
import { appById, hostAllowed, SIGN_IN_HOSTS } from '@/lib/apps';
import { useDock } from '@/lib/dock';
import { useTheme } from '@/lib/settings';

// Google refuses to sign in inside an app's web view unless it looks like Safari.
const SAFARI = 'Version/17.0 Mobile/15E148 Safari/604.1';

export default function WebAppScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { cfg } = useDock();
  const app = appById(id, cfg.webApps);
  const t = useTheme();
  const ins = useSafeAreaInsets();
  const { toast } = useToast();
  const view = useRef<WebView>(null);
  const [nav, setNav] = useState({ back: false, fwd: false, url: app?.web?.url ?? '', loading: true, progress: 0 });

  if (!app?.web) return <View style={{ flex: 1, backgroundColor: t.bg }} />;
  const web = app.web;
  const allowed = [...web.hosts, ...SIGN_IN_HOSTS];
  let host = '';
  try { host = new URL(nav.url).hostname.replace(/^www\./, ''); } catch {}

  return (
    <View style={{ flex: 1, backgroundColor: t.bar, paddingTop: ins.top }}>
      <View style={{ height: 50, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, gap: 2 }}>
        <IconButton name="chevron.left" label="Back" disabled={!nav.back} onPress={() => view.current?.goBack()} />
        <IconButton name="chevron.right" label="Forward" disabled={!nav.fwd} onPress={() => view.current?.goForward()} />
        <View style={{ flex: 1, alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, height: 34, paddingHorizontal: 14, borderRadius: 10, backgroundColor: t.chip, maxWidth: 460, minWidth: 220, justifyContent: 'center' }}>
            <Icon name="lock.fill" size={11} color={t.faint} />
            <Text numberOfLines={1} style={{ color: t.text, fontSize: 15, fontWeight: '500' }}>{host || app.name}</Text>
          </View>
        </View>
        <IconButton name="house" label={`${app.name} home`} onPress={() => view.current?.injectJavaScript(`location.href=${JSON.stringify(web.url)};true;`)} />
        <IconButton name={nav.loading ? 'xmark' : 'arrow.clockwise'} label={nav.loading ? 'Stop' : 'Reload'}
          onPress={() => (nav.loading ? view.current?.stopLoading() : view.current?.reload())} />
      </View>
      <View style={{ height: 2, backgroundColor: 'transparent' }}>
        {nav.loading ? <View style={{ height: 2, width: `${Math.max(8, nav.progress * 100)}%`, backgroundColor: t.accent }} /> : null}
      </View>

      {Platform.OS === 'web' ? (
        // Most of these sites refuse to load inside another page, so the preview just says what it is.
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, backgroundColor: t.bg }}>
          <AppIconArt app={app} size={88} />
          <Text style={{ color: t.text, fontSize: 24, fontWeight: '700' }}>{app.name}</Text>
          <Text style={{ color: t.sub, fontSize: 15 }}>{web.blurb}. Opens {web.hosts[0]} on the iPad.</Text>
        </View>
      ) : (
        <WebView
          ref={view}
          source={{ uri: web.url }}
          style={{ flex: 1, backgroundColor: '#fff' }}
          applicationNameForUserAgent={SAFARI}
          sharedCookiesEnabled
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          allowsBackForwardNavigationGestures
          setSupportMultipleWindows={false}
          pullToRefreshEnabled
          onShouldStartLoadWithRequest={(r) => {
            // Videos and widgets inside the page (YouTube players etc.) may load; only whole-page moves are checked.
            if (r.isTopFrame === false) return true;
            if (/^(about|blob|data):/.test(r.url) || hostAllowed(r.url, allowed)) return true;
            let to = r.url;
            try { to = new URL(r.url).hostname; } catch {}
            toast(`${to} isn't part of ${app.name}, so it was blocked.`);
            return false;
          }}
          onNavigationStateChange={(s) => setNav((n) => ({ ...n, back: s.canGoBack, fwd: s.canGoForward, url: s.url || n.url }))}
          onLoadStart={() => setNav((n) => ({ ...n, loading: true }))}
          onLoadProgress={(e) => setNav((n) => ({ ...n, progress: e.nativeEvent.progress }))}
          onLoadEnd={() => setNav((n) => ({ ...n, loading: false }))}
        />
      )}
    </View>
  );
}
