import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTranslateText } from '@/i18n/strings';
import { colors } from '@/ui/tokens/colors';
import { radius } from '@/ui/tokens/radius';
import { spacing } from '@/ui/tokens/spacing';
import { typography } from '@/ui/tokens/typography';

export type SegmentedControlOption<T extends string> = {
  label: string;
  value: T;
};

type SegmentedControlProps<T extends string> = {
  accessibilityLabel?: string;
  getOptionAccessibilityLabel?: (option: SegmentedControlOption<T>, selected: boolean) => string;
  options: SegmentedControlOption<T>[];
  selectedValue: T;
  onChange: (value: T) => void;
};

export function SegmentedControl<T extends string>({
  accessibilityLabel,
  getOptionAccessibilityLabel,
  options,
  selectedValue,
  onChange,
}: SegmentedControlProps<T>) {
  const translateText = useTranslateText();

  return (
    <View accessibilityLabel={accessibilityLabel} style={styles.container}>
      {options.map((option) => {
        const selected = option.value === selectedValue;
        const translatedLabel = translateText(option.label);

        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityLabel={getOptionAccessibilityLabel?.(option, selected) ?? translatedLabel}
            accessibilityState={{ selected }}
            style={[styles.option, selected && styles.selected]}
            onPress={() => onChange(option.value)}>
            <Text style={[styles.label, selected && styles.selectedLabel]}>{translatedLabel}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.primaryPale,
    borderColor: colors.borderSoft,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: spacing.xs,
    padding: spacing.xs,
  },
  label: {
    ...typography.caption,
    color: colors.body,
  },
  option: {
    alignItems: 'center',
    borderRadius: radius.md,
    flex: 1,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  selected: {
    backgroundColor: colors.canvas,
  },
  selectedLabel: {
    color: colors.primary,
  },
});
