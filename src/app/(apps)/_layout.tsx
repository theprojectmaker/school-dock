// Every mini app runs inside this layout, which adds the home bar along the
// bottom edge (see components/dock/home-bar.tsx).
import { Stack, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';

import { HomeBarHost } from '@/components/dock/home-bar';
import { useTheme } from '@/lib/settings';

export default function AppsLayout() {
  const t = useTheme();
  const path = usePathname();
  // Studento is dark; the others follow Quill's light / dark theme.
  const darkScreen = path.startsWith('/clock') || t.dark;
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <StatusBar style={darkScreen ? 'light' : 'dark'} />
      <HomeBarHost fallback={darkScreen ? 'light' : 'dark'}>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.bg }, animation: 'fade', gestureEnabled: false }} />
      </HomeBarHost>
    </View>
  );
}
