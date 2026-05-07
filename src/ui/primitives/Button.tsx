import type { PressableProps, StyleProp, ViewStyle } from 'react-native';
import { Pressable, StyleSheet, Text } from 'react-native';

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
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={pressableProps.accessibilityLabel ?? label}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
      {...pressableProps}>
      <Text style={[styles.label, variant === 'primary' ? styles.primaryLabel : styles.secondaryLabel]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    borderRadius: radius.lg,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  danger: {
    backgroundColor: colors.canvas,
    borderColor: colors.signatureCoral,
    borderWidth: StyleSheet.hairlineWidth,
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
  },
  primaryLabel: {
    color: colors.onPrimary,
  },
  secondary: {
    backgroundColor: colors.canvas,
    borderColor: colors.hairline,
    borderWidth: StyleSheet.hairlineWidth,
  },
  secondaryLabel: {
    color: colors.ink,
  },
});
