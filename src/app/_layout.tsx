import {
  Montserrat_400Regular,
  Montserrat_500Medium,
  Montserrat_600SemiBold,
  Montserrat_700Bold,
  Montserrat_800ExtraBold,
} from '@expo-google-fonts/montserrat';
import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import React, { useEffect, useMemo } from 'react';
import { StyleSheet, Text, TextInput } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { WorkspaceGate } from '@/features/workspace/WorkspaceGate';
import { loadStoredAppLanguage } from '@/i18n/language-storage';
import { loadStoredAppBackground, useAppBackground } from '@/features/settings/app-background';
import { colors } from '@/ui/tokens/colors';

type FontScalingDefaults = {
  defaultProps?: {
    maxFontSizeMultiplier?: number;
  };
};

// Keep MoneyNote typography close to DESIGN.md while still allowing a small accessibility bump.
const maxDesignFontScale = 1.08;

(Text as unknown as FontScalingDefaults).defaultProps = {
  ...(Text as unknown as FontScalingDefaults).defaultProps,
  maxFontSizeMultiplier: maxDesignFontScale,
};
(TextInput as unknown as FontScalingDefaults).defaultProps = {
  ...(TextInput as unknown as FontScalingDefaults).defaultProps,
  maxFontSizeMultiplier: maxDesignFontScale,
};

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Montserrat_400Regular,
    Montserrat_500Medium,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
    Montserrat_800ExtraBold,
  });
  const appBackground = useAppBackground();
  const pplantTheme = useMemo(
    () => ({
      ...DefaultTheme,
      colors: {
        ...DefaultTheme.colors,
        background: appBackground.colors.appBackground,
        border: colors.hairline,
        card: colors.canvas,
        primary: colors.primary,
        text: colors.ink,
      },
    }),
    [appBackground.colors.appBackground],
  );

  useEffect(() => {
    void loadStoredAppLanguage();
    void loadStoredAppBackground();
  }, []);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <ThemeProvider value={pplantTheme}>
        <WorkspaceGate>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="receipt/[receiptDraftId]" />
            <Stack.Screen name="journal/new" />
            <Stack.Screen name="reminder/[reminderId]" />
            <Stack.Screen name="task/[taskId]" />
            <Stack.Screen name="money/[moneyRecordId]" />
            <Stack.Screen name="report-all-time" />
            <Stack.Screen name="report-category-all-time" />
            <Stack.Screen name="report-category-year" />
            <Stack.Screen name="report-year" />
            <Stack.Screen name="+not-found" />
          </Stack>
        </WorkspaceGate>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
