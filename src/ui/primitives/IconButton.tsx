import type { PressableProps } from 'react-native';
import { Pressable, StyleSheet, Text } from 'react-native';

import { colors } from '@/ui/tokens/colors';
import { radius } from '@/ui/tokens/radius';
import { typography } from '@/ui/tokens/typography';

type IconButtonProps = PressableProps & {
  icon: string;
  label: string;
};

export function IconButton({ icon, label, ...pressableProps }: IconButtonProps) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      {...pressableProps}>
      <Text style={styles.icon}>{icon}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: colors.canvas,
    borderColor: colors.hairline,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  icon: {
    ...typography.label,
    color: colors.ink,
  },
  pressed: {
    opacity: 0.78,
  },
});
