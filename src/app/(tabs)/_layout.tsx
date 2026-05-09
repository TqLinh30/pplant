import { Tabs } from 'expo-router';

import { translateText } from '@/i18n/strings';
import { colors } from '@/ui/tokens/colors';
import { typography } from '@/ui/tokens/typography';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarIcon: () => null,
        tabBarIconStyle: {
          display: 'none',
        },
        tabBarInactiveTintColor: colors.body,
        tabBarItemStyle: {
          justifyContent: 'center',
          paddingVertical: 8,
        },
        tabBarLabelStyle: {
          ...typography.tabLabel,
          marginTop: 0,
        },
        tabBarStyle: {
          backgroundColor: colors.canvas,
          borderTopColor: colors.hairline,
          height: 68,
          paddingBottom: 8,
          paddingTop: 8,
        },
      }}>
      <Tabs.Screen name="index" options={{ title: translateText('Today') }} />
      <Tabs.Screen name="capture" options={{ title: translateText('Capture') }} />
      <Tabs.Screen name="history" options={{ title: translateText('History') }} />
      <Tabs.Screen name="review" options={{ title: translateText('Review') }} />
      <Tabs.Screen name="settings" options={{ title: translateText('Settings') }} />
    </Tabs>
  );
}
