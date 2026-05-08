import { StyleSheet, Text, View } from 'react-native';

import { RecoveryActions } from '@/ui/components/RecoveryActions';
import { ListRow } from '@/ui/primitives/ListRow';
import { StatusBanner } from '@/ui/primitives/StatusBanner';
import { colors } from '@/ui/tokens/colors';
import { spacing } from '@/ui/tokens/spacing';
import { typography } from '@/ui/tokens/typography';

import {
  getRecoveryActionLabel,
  getRecoveryItemCopy,
  recoveryPanelDescription,
  recoveryPanelTitle,
} from './recovery-copy';
import { useRecovery } from './useRecovery';

export function RecoveryPanel() {
  const { runAction, state } = useRecovery();

  if (state.status === 'loading') {
    return (
      <StatusBanner
        title="Checking recovery options"
        description="Pplant is looking for items that may need a next step."
      />
    );
  }

  if (state.status === 'failed') {
    return (
      <StatusBanner
        title="Recovery options are not available right now"
        description="You can still add, edit, or complete items manually."
        tone="warning"
      />
    );
  }

  if (state.items.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{recoveryPanelTitle}</Text>
        <Text style={styles.description}>{recoveryPanelDescription}</Text>
      </View>
      {state.actionError ? (
        <StatusBanner
          title="That change was not saved"
          description="Try again or choose another step."
          tone="warning"
        />
      ) : null}
      {state.items.map((item) => {
        const copy = getRecoveryItemCopy(item);

        return (
          <View key={item.id} style={styles.item}>
            <ListRow
              title={item.title}
              description={copy.description}
              meta={copy.status}
              accessibilityLabel={`${item.title}. ${copy.status}. ${copy.description}`}
            />
            <RecoveryActions
              actions={item.availableActions.map((action) => ({
                label: getRecoveryActionLabel(action),
                onPress: () => runAction(item, action),
              }))}
            />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderColor: colors.hairline,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: spacing.md,
    paddingTop: spacing.lg,
  },
  description: {
    ...typography.body,
    color: colors.body,
  },
  header: {
    gap: spacing.xs,
  },
  item: {
    gap: spacing.sm,
  },
  title: {
    ...typography.sectionTitle,
    color: colors.ink,
  },
});
