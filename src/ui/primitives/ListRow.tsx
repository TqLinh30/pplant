import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/ui/tokens/colors';
import { spacing } from '@/ui/tokens/spacing';
import { typography } from '@/ui/tokens/typography';

type ListRowProps = {
  title: string;
  description?: string;
  meta?: string;
  right?: ReactNode;
  onPress?: () => void;
};

export function ListRow({ title, description, meta, right, onPress }: ListRowProps) {
  const content = (
    <>
      <View style={styles.textGroup}>
        <Text style={styles.title}>{title}</Text>
        {description ? <Text style={styles.description}>{description}</Text> : null}
        {meta ? <Text style={styles.meta}>{meta}</Text> : null}
      </View>
      {right}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={title}
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}
        onPress={onPress}>
        {content}
      </Pressable>
    );
  }

  return <View style={styles.row}>{content}</View>;
}

const styles = StyleSheet.create({
  description: {
    ...typography.body,
    color: colors.body,
  },
  meta: {
    ...typography.caption,
    color: colors.muted,
  },
  pressed: {
    opacity: 0.78,
  },
  row: {
    borderColor: colors.hairline,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
    minHeight: 44,
    paddingVertical: spacing.md,
  },
  textGroup: {
    flex: 1,
    gap: spacing.xxs,
  },
  title: {
    ...typography.label,
    color: colors.ink,
  },
});
