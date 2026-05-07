import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/ui/tokens/colors';
import { radius } from '@/ui/tokens/radius';
import { spacing } from '@/ui/tokens/spacing';
import { typography } from '@/ui/tokens/typography';

type StatusBannerProps = {
  title: string;
  description: string;
  tone?: 'neutral' | 'success' | 'warning';
};

export function StatusBanner({ title, description, tone = 'neutral' }: StatusBannerProps) {
  return (
    <View style={[styles.banner, styles[tone]]} accessibilityRole="summary">
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderRadius: radius.md,
    gap: spacing.xs,
    padding: spacing.md,
  },
  description: {
    ...typography.body,
    color: colors.body,
  },
  neutral: {
    backgroundColor: colors.surfaceSoft,
  },
  success: {
    backgroundColor: colors.signatureMint,
  },
  title: {
    ...typography.label,
    color: colors.ink,
  },
  warning: {
    backgroundColor: colors.signatureCream,
  },
});
