import { StyleSheet, Text, View } from 'react-native';

import { translateText } from '@/i18n/strings';
import { colors } from '@/ui/tokens/colors';
import { radius } from '@/ui/tokens/radius';
import { spacing } from '@/ui/tokens/spacing';
import { typography } from '@/ui/tokens/typography';

type ChipProps = {
  label: string;
  tone?: 'neutral' | 'success' | 'warning';
};

export function Chip({ label, tone = 'neutral' }: ChipProps) {
  return (
    <View style={[styles.chip, styles[tone]]}>
      <Text style={styles.label}>{translateText(label)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  label: {
    ...typography.caption,
    color: colors.ink,
  },
  neutral: {
    backgroundColor: colors.primaryPale,
  },
  success: {
    backgroundColor: colors.successSoft,
  },
  warning: {
    backgroundColor: colors.warningSoft,
  },
});
