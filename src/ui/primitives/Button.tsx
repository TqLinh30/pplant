import type { PressableProps, StyleProp, ViewStyle } from 'react-native';
import { Pressable, StyleSheet, Text } from 'react-native';

import { translateText } from '@/i18n/strings';
import { colors } from '@/ui/tokens/colors';
import { radius } from '@/ui/tokens/radius';
import { spacing } from '@/ui/tokens/spacing';
import { typography } from '@/ui/tokens/typography';

type ButtonVariant = 'primary' | 'secondary' | 'danger';

type ButtonProps = Omit<PressableProps, 'style'> & {
  label: string;
  variant?: ButtonVariant;
  style?: StyleProp<ViewStyle>;
};

export function Button({ label, variant = 'primary', disabled, style, ...pressableProps }: ButtonProps) {
  const labelStyle =
    variant === 'primary'
      ? styles.primaryLabel
      : variant === 'danger'
        ? styles.dangerLabel
        : styles.secondaryLabel;
  const translatedLabel = translateText(label);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={pressableProps.accessibilityLabel ?? translatedLabel}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
      {...pressableProps}>
      <Text style={[styles.label, labelStyle]}>{translatedLabel}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    borderRadius: radius.md,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
  },
  danger: {
    backgroundColor: colors.canvas,
    borderColor: colors.danger,
    borderWidth: 1,
  },
  dangerLabel: {
    color: colors.danger,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    ...typography.button,
  },
  pressed: {
    opacity: 0.78,
  },
  primary: {
    backgroundColor: colors.primary,
    elevation: 3,
    shadowColor: colors.primary,
    shadowOffset: {
      height: 8,
      width: 0,
    },
    shadowOpacity: 0.24,
    shadowRadius: 18,
  },
  primaryLabel: {
    color: colors.onPrimary,
  },
  secondary: {
    backgroundColor: colors.canvas,
    borderColor: colors.primary,
    borderWidth: 1,
  },
  secondaryLabel: {
    color: colors.primary,
  },
});
