import { StyleSheet, Text, View } from 'react-native';

import { Button } from './Button';
import { translateText } from '@/i18n/strings';
import { colors } from '@/ui/tokens/colors';
import { spacing } from '@/ui/tokens/spacing';
import { typography } from '@/ui/tokens/typography';

type EmptyStateProps = {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({ title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{translateText(title)}</Text>
      <Text style={styles.description}>{translateText(description)}</Text>
      {actionLabel && onAction ? <Button label={actionLabel} onPress={onAction} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
    paddingVertical: spacing.xl,
  },
  description: {
    ...typography.body,
    color: colors.body,
  },
  title: {
    ...typography.sectionTitle,
    color: colors.ink,
  },
});
