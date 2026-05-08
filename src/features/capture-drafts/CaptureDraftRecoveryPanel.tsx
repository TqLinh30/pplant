import { router } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/ui/primitives/Button';
import { ListRow } from '@/ui/primitives/ListRow';
import { StatusBanner } from '@/ui/primitives/StatusBanner';
import { colors } from '@/ui/tokens/colors';
import { spacing } from '@/ui/tokens/spacing';
import { typography } from '@/ui/tokens/typography';

import {
  describeCaptureDraft,
  routeForCaptureDraftResume,
} from './capture-draft-recovery';
import { useCaptureDraftRecovery } from './useCaptureDraftRecovery';

export function CaptureDraftRecoveryPanel() {
  const recovery = useCaptureDraftRecovery();
  const { state } = recovery;

  if (state.status === 'loading') {
    return (
      <View accessibilityLabel="Loading saved drafts" accessibilityRole="summary" style={styles.inlineLoading}>
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.helper}>Checking saved drafts.</Text>
      </View>
    );
  }

  if (state.status === 'failed') {
    return (
      <StatusBanner
        title="Drafts could not load"
        description="Your saved records are unchanged. Try opening this screen again."
        tone="warning"
      />
    );
  }

  if (state.items.length === 0) {
    return null;
  }

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>Saved drafts</Text>
        <Text style={styles.description}>Resume an unfinished capture, discard it, or keep it for later.</Text>
      </View>

      {state.actionError ? (
        <StatusBanner
          title="Draft action did not finish"
          description="Try again. The draft is still saved locally."
          tone="warning"
        />
      ) : null}

      <View style={styles.listGroup}>
        {state.items.map((item) => {
          const description = describeCaptureDraft(item);

          return (
            <View key={item.draft.id} style={styles.draftBlock}>
              <ListRow
                accessibilityLabel={description.accessibilityLabel}
                description={description.description}
                meta={description.meta}
                title={description.title}
              />
              <View style={styles.actionGroup}>
                <Button
                  accessibilityLabel={`Resume ${description.title}`}
                  label="Resume"
                  onPress={() => router.push(routeForCaptureDraftResume(item.draft))}
                  variant="secondary"
                />
                <Button
                  accessibilityLabel={`Keep ${description.title} for later`}
                  label="Keep"
                  onPress={() => recovery.keepDraft(item.draft.id)}
                  variant="secondary"
                />
                <Button
                  accessibilityLabel={`Discard ${description.title}`}
                  label="Discard"
                  onPress={() => recovery.discardDraft(item.draft.id)}
                  variant="danger"
                />
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  actionGroup: {
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  description: {
    ...typography.body,
    color: colors.body,
  },
  draftBlock: {
    gap: spacing.xs,
  },
  header: {
    gap: spacing.xs,
  },
  helper: {
    ...typography.caption,
    color: colors.muted,
  },
  inlineLoading: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  listGroup: {
    gap: spacing.sm,
  },
  section: {
    gap: spacing.md,
  },
  sectionTitle: {
    ...typography.sectionTitle,
    color: colors.ink,
  },
});
