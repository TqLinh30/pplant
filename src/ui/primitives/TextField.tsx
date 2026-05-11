import type { TextInputProps } from 'react-native';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { useTranslateText } from '@/i18n/strings';
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
  const translateText = useTranslateText();
  const translatedErrorText = errorText ? translateText(errorText) : undefined;
  const translatedHelperText = helperText ? translateText(helperText) : undefined;
  const translatedLabel = translateText(label);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{translatedLabel}</Text>
      <TextInput
        accessibilityLabel={inputProps.accessibilityLabel ?? translatedLabel}
        accessibilityHint={translatedErrorText ?? inputProps.accessibilityHint}
        placeholderTextColor={colors.muted}
        style={[styles.input, errorText && styles.inputError]}
        {...inputProps}
      />
      {translatedErrorText ? <Text style={styles.error}>{translatedErrorText}</Text> : null}
      {!translatedErrorText && translatedHelperText ? <Text style={styles.helper}>{translatedHelperText}</Text> : null}
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
    borderRadius: radius.md,
    borderWidth: 1,
    color: colors.ink,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    paddingVertical: 13,
  },
  inputError: {
    borderColor: colors.danger,
    borderWidth: 1.5,
  },
  error: {
    ...typography.caption,
    color: colors.danger,
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
