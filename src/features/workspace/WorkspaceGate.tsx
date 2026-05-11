import type { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { translateText } from '@/i18n/strings';
import { useAppBackground } from '@/features/settings/app-background';
import { Button } from '@/ui/primitives/Button';
import { colors } from '@/ui/tokens/colors';
import { spacing } from '@/ui/tokens/spacing';
import { typography } from '@/ui/tokens/typography';

import { useWorkspaceInitialization, type WorkspaceInitializer } from './useWorkspaceInitialization';

type WorkspaceGateProps = {
  children: ReactNode;
  initializer?: WorkspaceInitializer;
};

export function WorkspaceGate({ children, initializer }: WorkspaceGateProps) {
  const { retry, state } = useWorkspaceInitialization(initializer);
  const appBackground = useAppBackground();
  const safeAreaStyle = [styles.safeArea, { backgroundColor: appBackground.colors.appBackground }];

  if (state.status === 'ready') {
    return <>{children}</>;
  }

  if (state.status === 'failed') {
    return (
      <SafeAreaView style={safeAreaStyle}>
        <View
          accessibilityLabel={translateText('Local workspace could not be opened')}
          accessibilityRole="summary"
          style={styles.container}>
          <Text style={styles.eyebrow}>{translateText('Local workspace')}</Text>
          <Text style={styles.title}>{translateText('Pplant could not open local data.')}</Text>
          <Text style={styles.description}>
            {translateText('Your planner stays on this device. Try opening the local workspace again.')}
          </Text>
          <Button label="Retry" onPress={retry} variant="secondary" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={safeAreaStyle}>
      <View accessibilityLabel={translateText('Opening local workspace')} accessibilityRole="summary" style={styles.container}>
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.title}>{translateText('Opening your local workspace')}</Text>
        <Text style={styles.description}>{translateText('No account, cloud sync, or setup is needed.')}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-start',
    flex: 1,
    gap: spacing.md,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  description: {
    ...typography.body,
    color: colors.body,
  },
  eyebrow: {
    ...typography.caption,
    color: colors.muted,
  },
  safeArea: {
    backgroundColor: colors.appBackground,
    flex: 1,
  },
  title: {
    ...typography.screenTitle,
    color: colors.ink,
  },
});
