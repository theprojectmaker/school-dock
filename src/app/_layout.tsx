// Root: Quill's settings + notes library, School Dock's config, the launcher
// (app zoom), the session layer (setup, lock screen, admin) and the stack.
// The home screen is `/`; every mini app lives in the (apps) group.
import { Stack } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { LauncherProvider } from '@/components/dock/launcher';
import { SessionProvider } from '@/components/dock/session';
import { ToastProvider } from '@/components/ui';
import { DockProvider } from '@/lib/dock';
import { LayoutProvider } from '@/lib/layout';
import { LibraryProvider } from '@/lib/library';
import { EngineHost } from '@/lib/pdf-engine';
import { SettingsProvider } from '@/lib/settings';

// If any screen throws while rendering, show the error (and a retry) instead of closing the app.
export function ErrorBoundary({ error, retry }: { error: Error; retry: () => Promise<void> }) {
  return (
    <View style={{ flex: 1, padding: 32, paddingTop: 80, backgroundColor: '#FFF' }}>
      <Text style={{ fontSize: 22, fontWeight: '700', color: '#111' }}>School Dock hit an error</Text>
      <Text selectable style={{ marginTop: 14, fontSize: 14, color: '#333', fontFamily: 'Menlo' }}>{`${error?.name ?? 'Error'}: ${error?.message ?? String(error)}\n\n${String(error?.stack ?? '').split('\n').slice(0, 10).join('\n')}`}</Text>
      <Pressable onPress={() => { retry(); }} style={{ marginTop: 24, alignSelf: 'flex-start', backgroundColor: '#007AFF', paddingHorizontal: 18, paddingVertical: 12, borderRadius: 10 }}>
        <Text style={{ color: '#FFF', fontWeight: '600', fontSize: 16 }}>Try again</Text>
      </Pressable>
    </View>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <SafeAreaProvider>
      <SettingsProvider>
        <LibraryProvider>
          <DockProvider>
            <LayoutProvider>
            <ToastProvider>
              <View style={{ flex: 1, backgroundColor: '#000' }}>
                <LauncherProvider>
                  <SessionProvider>
                    {/* No stack animation: the launcher's zoom covers every switch. */}
                    <Stack screenOptions={{ headerShown: false, animation: 'none', gestureEnabled: false, contentStyle: { backgroundColor: '#000' } }} />
                  </SessionProvider>
                </LauncherProvider>
                <EngineHost />
              </View>
            </ToastProvider>
            </LayoutProvider>
          </DockProvider>
        </LibraryProvider>
      </SettingsProvider>
    </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
