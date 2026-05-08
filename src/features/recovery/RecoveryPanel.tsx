import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { RecoveryTargetKind } from '@/domain/recovery/types';
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
import { useRecoveryHandoff } from './recovery-handoff';
import { useRecovery } from './useRecovery';

type RecoveryPanelProps = {
  targetKinds?: RecoveryTargetKind[];
};

export function RecoveryPanel({ targetKinds }: RecoveryPanelProps = {}) {
  const { runAction, state } = useRecovery();
  const { startHandoff } = useRecoveryHandoff();

  useEffect(() => {
    if (!state.editingTarget || (state.lastAction !== 'edit' && state.lastAction !== 'reschedule')) {
      return;
    }

    startHandoff(state.editingTarget, state.lastAction);
  }, [startHandoff, state.editingTarget, state.lastAction]);

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

  const items = targetKinds ? state.items.filter((item) => targetKinds.includes(item.targetKind)) : state.items;

  if (items.length === 0) {
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
      {items.map((item) => {
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
