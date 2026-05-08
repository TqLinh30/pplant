import type { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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

  if (state.status === 'ready') {
    return <>{children}</>;
  }

  if (state.status === 'failed') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View
          accessibilityLabel="Local workspace could not be opened"
          accessibilityRole="summary"
          style={styles.container}>
          <Text style={styles.eyebrow}>Local workspace</Text>
          <Text style={styles.title}>Pplant could not open local data.</Text>
          <Text style={styles.description}>
            Your planner stays on this device. Try opening the local workspace again.
          </Text>
          <Button label="Retry" onPress={retry} variant="secondary" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View accessibilityLabel="Opening local workspace" accessibilityRole="summary" style={styles.container}>
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.title}>Opening your local workspace</Text>
        <Text style={styles.description}>No account, cloud sync, or setup is needed.</Text>
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
