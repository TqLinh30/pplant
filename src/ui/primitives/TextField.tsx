import type { TextInputProps } from 'react-native';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { colors } from '@/ui/tokens/colors';
import { radius } from '@/ui/tokens/radius';
import { spacing } from '@/ui/tokens/spacing';
import { typography } from '@/ui/tokens/typography';

type TextFieldProps = TextInputProps & {
  errorText?: string;
  helperText?: string;
  label: string;
};

export function TextField({ errorText, helperText, label, ...inputProps }: TextFieldProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={inputProps.accessibilityLabel ?? label}
        accessibilityHint={errorText ?? inputProps.accessibilityHint}
        placeholderTextColor={colors.muted}
        style={[styles.input, errorText && styles.inputError]}
        {...inputProps}
      />
      {errorText ? <Text style={styles.error}>{errorText}</Text> : null}
      {!errorText && helperText ? <Text style={styles.helper}>{helperText}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  input: {
    ...typography.body,
    backgroundColor: colors.canvas,
    borderColor: colors.hairline,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    color: colors.ink,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  inputError: {
    borderColor: colors.signatureCoral,
    borderWidth: 1,
  },
  error: {
    ...typography.caption,
    color: colors.signatureCoral,
  },
  helper: {
    ...typography.caption,
    color: colors.muted,
  },
  label: {
    ...typography.caption,
    color: colors.ink,
  },
});
