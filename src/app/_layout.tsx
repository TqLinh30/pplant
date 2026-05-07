import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import React from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { WorkspaceGate } from '@/features/workspace/WorkspaceGate';
import { colors } from '@/ui/tokens/colors';

const pplantTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.canvas,
    border: colors.hairline,
    card: colors.canvas,
    primary: colors.primary,
    text: colors.ink,
  },
};

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <ThemeProvider value={pplantTheme}>
        <WorkspaceGate>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="receipt/[receiptDraftId]" />
            <Stack.Screen name="reminder/[reminderId]" />
            <Stack.Screen name="task/[taskId]" />
            <Stack.Screen name="money/[moneyRecordId]" />
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
