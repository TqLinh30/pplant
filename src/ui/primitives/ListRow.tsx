import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTranslateText } from '@/i18n/strings';
import { colors } from '@/ui/tokens/colors';
import { radius } from '@/ui/tokens/radius';
import { spacing } from '@/ui/tokens/spacing';
import { typography } from '@/ui/tokens/typography';

type ListRowProps = {
  title: string;
  description?: string;
  meta?: string;
  right?: ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
};

export function ListRow({ title, description, meta, right, onPress, accessibilityLabel }: ListRowProps) {
  const translateText = useTranslateText();
  const translatedDescription = description ? translateText(description) : undefined;
  const translatedMeta = meta ? translateText(meta) : undefined;
  const translatedTitle = translateText(title);
  const content = (
    <>
      <View style={styles.textGroup}>
        <Text style={styles.title}>{translatedTitle}</Text>
        {translatedDescription ? <Text style={styles.description}>{translatedDescription}</Text> : null}
        {translatedMeta ? <Text style={styles.meta}>{translatedMeta}</Text> : null}
      </View>
      {right}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? translatedTitle}
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}
        onPress={onPress}>
        {content}
      </Pressable>
    );
  }

  return (
    <View
      accessible={Boolean(accessibilityLabel) && !right}
      accessibilityLabel={accessibilityLabel}
      style={styles.row}>
      {content}
    </View>
  );
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
    backgroundColor: colors.canvas,
    borderColor: colors.hairline,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
    minHeight: 56,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
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
