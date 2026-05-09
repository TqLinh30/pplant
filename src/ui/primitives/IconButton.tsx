import type { PressableProps } from 'react-native';
import { Pressable, StyleSheet, Text } from 'react-native';

import { useTranslateText } from '@/i18n/strings';
import { colors } from '@/ui/tokens/colors';
import { radius } from '@/ui/tokens/radius';
import { typography } from '@/ui/tokens/typography';

type IconButtonProps = PressableProps & {
  icon: string;
  label: string;
};

export function IconButton({ icon, label, disabled, ...pressableProps }: IconButtonProps) {
  const translateText = useTranslateText();

  return (
    <Pressable
      accessibilityLabel={translateText(label)}
      accessibilityRole="button"
      disabled={disabled}
      style={({ pressed }) => [styles.button, pressed && styles.pressed, disabled && styles.disabled]}
      {...pressableProps}>
      <Text style={styles.icon}>{icon}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: colors.primaryPale,
    borderColor: colors.borderSoft,
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  disabled: {
    opacity: 0.5,
  },
  icon: {
    ...typography.label,
    color: colors.primary,
  },
  pressed: {
    opacity: 0.78,
  },
});
