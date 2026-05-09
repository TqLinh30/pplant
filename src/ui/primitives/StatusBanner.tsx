import { StyleSheet, Text, View } from 'react-native';

import { translateText } from '@/i18n/strings';
import { colors } from '@/ui/tokens/colors';
import { radius } from '@/ui/tokens/radius';
import { spacing } from '@/ui/tokens/spacing';
import { typography } from '@/ui/tokens/typography';

type StatusBannerProps = {
  accessibilityLabel?: string;
  title: string;
  description: string;
  tone?: 'neutral' | 'success' | 'warning';
};

function defaultAccessibilityLabel(title: string, description: string): string {
  return `${title}. ${description}`;
}

export function StatusBanner({ accessibilityLabel, title, description, tone = 'neutral' }: StatusBannerProps) {
  const translatedDescription = translateText(description);
  const translatedTitle = translateText(title);

  return (
    <View
      accessibilityLabel={accessibilityLabel ?? defaultAccessibilityLabel(translatedTitle, translatedDescription)}
      accessibilityRole="summary"
      style={[styles.banner, styles[tone]]}>
      <Text style={styles.title}>{translatedTitle}</Text>
      <Text style={styles.description}>{translatedDescription}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderColor: colors.hairline,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.xs,
    padding: spacing.md,
  },
  description: {
    ...typography.body,
    color: colors.body,
  },
  neutral: {
    backgroundColor: colors.primaryPale,
  },
  success: {
    backgroundColor: colors.successSoft,
  },
  title: {
    ...typography.label,
    color: colors.ink,
  },
  warning: {
    backgroundColor: colors.warningSoft,
  },
});
