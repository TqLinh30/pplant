import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/ui/primitives/Button';
import { StatusBanner } from '@/ui/primitives/StatusBanner';
import { TextField } from '@/ui/primitives/TextField';
import { colors } from '@/ui/tokens/colors';
import { spacing } from '@/ui/tokens/spacing';
import { typography } from '@/ui/tokens/typography';

import { usePreferenceSettings } from './usePreferenceSettings';

export function SettingsScreen() {
  const { reload, save, state, updateField } = usePreferenceSettings();

  if (state.status === 'loading') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View accessibilityLabel="Loading preferences" accessibilityRole="summary" style={styles.centered}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.title}>Loading preferences</Text>
          <Text style={styles.description}>Pplant is opening your local settings.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (state.status === 'failed') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View
          accessibilityLabel="Preferences could not be loaded"
          accessibilityRole="summary"
          style={styles.centered}>
          <Text style={styles.eyebrow}>Preferences</Text>
          <Text style={styles.title}>Settings could not open.</Text>
          <Text style={styles.description}>
            Your preferences stay on this device. Try loading them again.
          </Text>
          <Button label="Retry" onPress={reload} variant="secondary" />
        </View>
      </SafeAreaView>
    );
  }

  const saving = state.status === 'saving';

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Local workspace controls</Text>
          <Text style={styles.title}>Preferences</Text>
          <Text style={styles.description}>
            Set the local defaults Pplant uses for money, calendar grouping, and work-time context.
          </Text>
        </View>

        {!state.hasSavedPreferences ? (
          <StatusBanner
            title="Ready to set up"
            description="These defaults are editable and stay local until you save them."
          />
        ) : null}

        {state.status === 'saved' ? (
          <StatusBanner
            title="Preferences saved"
            description="Money, locale, reset-day, and wage defaults are ready for future records."
            tone="success"
          />
        ) : null}

        {state.saveError ? (
          <StatusBanner
            title="Preferences were not saved"
            description="Try saving again. Your current edits are still on screen."
            tone="warning"
          />
        ) : null}

        {Object.keys(state.fieldErrors).length > 0 ? (
          <StatusBanner
            title="Check highlighted fields"
            description="Each highlighted field includes the next correction to make."
            tone="warning"
          />
        ) : null}

        <View style={styles.form}>
          <TextField
            autoCapitalize="characters"
            autoCorrect={false}
            errorText={state.fieldErrors.currencyCode}
            helperText="Use a 3-letter code such as USD, TWD, JPY, or VND."
            label="Currency"
            onChangeText={(value) => updateField('currencyCode', value)}
            value={state.form.currencyCode}
          />
          <TextField
            autoCapitalize="none"
            autoCorrect={false}
            errorText={state.fieldErrors.locale}
            helperText="Use a locale tag such as en-US or vi-VN."
            label="Locale"
            onChangeText={(value) => updateField('locale', value)}
            value={state.form.locale}
          />
          <TextField
            errorText={state.fieldErrors.monthlyBudgetResetDay}
            helperText="Choose a day from 1 to 31. Short months use their last day."
            keyboardType="number-pad"
            label="Monthly reset day"
            onChangeText={(value) => updateField('monthlyBudgetResetDay', value)}
            value={state.form.monthlyBudgetResetDay}
          />
          <TextField
            errorText={state.fieldErrors.defaultHourlyWage}
            helperText="Stored as integer minor units so wage math stays exact."
            keyboardType="decimal-pad"
            label="Default hourly wage"
            onChangeText={(value) => updateField('defaultHourlyWage', value)}
            value={state.form.defaultHourlyWage}
          />
        </View>

        <Button
          accessibilityLabel="Save preferences"
          disabled={saving}
          label={saving ? 'Saving preferences' : 'Save preferences'}
          onPress={save}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  centered: {
    alignItems: 'flex-start',
    flex: 1,
    gap: spacing.md,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  content: {
    gap: spacing.lg,
    padding: spacing.lg,
  },
  description: {
    ...typography.body,
    color: colors.body,
  },
  eyebrow: {
    ...typography.caption,
    color: colors.muted,
  },
  form: {
    gap: spacing.md,
  },
  header: {
    gap: spacing.sm,
  },
  safeArea: {
    backgroundColor: colors.canvas,
    flex: 1,
  },
  title: {
    ...typography.screenTitle,
    color: colors.ink,
  },
});
