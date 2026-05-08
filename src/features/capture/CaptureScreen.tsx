import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { formatMinorUnitsForInput } from '@/domain/common/money';
import type { MoneyRecordKind, MoneyRecord } from '@/domain/money/types';
import { Button } from '@/ui/primitives/Button';
import { ListRow } from '@/ui/primitives/ListRow';
import { SegmentedControl } from '@/ui/primitives/SegmentedControl';
import { StatusBanner } from '@/ui/primitives/StatusBanner';
import { TextField } from '@/ui/primitives/TextField';
import { colors } from '@/ui/tokens/colors';
import { spacing } from '@/ui/tokens/spacing';
import { typography } from '@/ui/tokens/typography';

import { useManualMoneyCapture } from './useManualMoneyCapture';

const kindOptions: { label: string; value: MoneyRecordKind }[] = [
  { label: 'Expense', value: 'expense' },
  { label: 'Income', value: 'income' },
];

export function CaptureScreen() {
  const capture = useManualMoneyCapture();
  const { state } = capture;
  const saving = state.status === 'saving';
  const isEditing = state.editingRecordId !== null;

  const formatRecordAmount = (record: MoneyRecord) => {
    const formatted = state.preferences
      ? formatMinorUnitsForInput(record.amountMinor, record.currencyCode, {
          locale: state.preferences.locale,
        })
      : { ok: false as const };

    return `${record.kind === 'expense' ? 'Expense' : 'Income'} · ${
      formatted.ok ? formatted.value : record.amountMinor
    } ${record.currencyCode}`;
  };

  const savedTitle =
    state.lastMutation === 'updated'
      ? 'Money record updated'
      : state.lastMutation === 'deleted'
        ? 'Money record removed'
        : 'Money record saved';

  const savedDescription =
    state.lastMutation === 'deleted' && state.deletedRecord
      ? `${formatRecordAmount(state.deletedRecord)} is no longer shown in active records. Planning context was recalculated.`
      : state.lastMutation === 'updated' && state.savedRecord
        ? `${formatRecordAmount(state.savedRecord)} is saved locally. Planning context was recalculated.`
        : state.savedRecord
          ? `${formatRecordAmount(state.savedRecord)} is ready for budget, history, and summary inputs.`
        : '';

  if (state.status === 'loading') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View accessibilityLabel="Loading capture" accessibilityRole="summary" style={styles.centered}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.title}>Loading capture</Text>
          <Text style={styles.description}>Pplant is opening your local money settings.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (state.status === 'failed') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View accessibilityLabel="Capture could not be loaded" accessibilityRole="summary" style={styles.centered}>
          <Text style={styles.eyebrow}>Manual capture</Text>
          <Text style={styles.title}>Capture could not open.</Text>
          <Text style={styles.description}>Your local data is unchanged. Try opening capture again.</Text>
          <Button label="Retry" onPress={capture.reload} variant="secondary" />
        </View>
      </SafeAreaView>
    );
  }

  if (state.status === 'preferences_needed') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View accessibilityLabel="Preferences needed" accessibilityRole="summary" style={styles.centered}>
          <Text style={styles.eyebrow}>Manual capture</Text>
          <Text style={styles.title}>Save preferences first.</Text>
          <Text style={styles.description}>
            Money records use your saved currency and locale so amounts stay consistent.
          </Text>
          <Button label="Retry after saving preferences" onPress={capture.reload} variant="secondary" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Manual capture</Text>
          <Text style={styles.title}>{isEditing ? 'Edit money record' : 'Add money record'}</Text>
          <Text style={styles.description}>
            {isEditing
              ? 'Update the active record. Manual changes become the source of truth.'
              : 'Save a local expense or income record with the context you know now.'}
          </Text>
        </View>

        {(state.status === 'saved' || state.status === 'deleted') && savedDescription ? (
          <StatusBanner
            title={savedTitle}
            description={savedDescription}
          />
        ) : null}

        {state.actionError ? (
          <StatusBanner
            title="Money record action did not finish"
            description="Try again. Current edits are still on screen."
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
          <SegmentedControl
            options={kindOptions}
            selectedValue={state.draft.kind}
            onChange={capture.setKind}
          />

          <TextField
            errorText={state.fieldErrors.amount}
            helperText={state.preferences ? `Uses ${state.preferences.currencyCode}.` : undefined}
            keyboardType="decimal-pad"
            label="Amount"
            onChangeText={(value) => capture.updateField('amount', value)}
            value={state.draft.amount}
          />

          <TextField
            autoCapitalize="none"
            errorText={state.fieldErrors.localDate}
            helperText="Use YYYY-MM-DD."
            label="Date"
            onChangeText={(value) => capture.updateField('localDate', value)}
            value={state.draft.localDate}
          />

          <View style={styles.optionGroup}>
            <Text style={styles.label}>Category</Text>
            <ListRow
              title="No category"
              description="Optional for quick capture."
              meta={state.draft.categoryId === null ? 'Selected' : 'Available'}
              onPress={() => capture.selectCategory(null)}
            />
            {state.categories.map((category) => (
              <ListRow
                key={category.id}
                title={category.name}
                meta={state.draft.categoryId === category.id ? 'Selected' : 'Available'}
                onPress={() => capture.selectCategory(category.id)}
              />
            ))}
            {state.categories.length === 0 ? (
              <Text style={styles.helper}>Categories are optional. Add them later in Settings.</Text>
            ) : null}
            {state.fieldErrors.categoryId ? <Text style={styles.error}>{state.fieldErrors.categoryId}</Text> : null}
          </View>

          <View style={styles.optionGroup}>
            <Text style={styles.label}>Topics</Text>
            {state.topics.length === 0 ? (
              <Text style={styles.helper}>Topics are optional. Add them later in Settings.</Text>
            ) : null}
            {state.topics.map((topic) => {
              const selected = state.draft.topicIds.includes(topic.id);

              return (
                <ListRow
                  key={topic.id}
                  title={topic.name}
                  meta={selected ? 'Selected' : 'Available'}
                  onPress={() => capture.toggleTopic(topic.id)}
                />
              );
            })}
            {state.fieldErrors.topicIds ? <Text style={styles.error}>{state.fieldErrors.topicIds}</Text> : null}
          </View>

          <TextField
            autoCapitalize="words"
            errorText={state.fieldErrors.merchantOrSource}
            helperText={state.draft.kind === 'expense' ? 'Optional merchant.' : 'Optional income source.'}
            label={state.draft.kind === 'expense' ? 'Merchant' : 'Source'}
            onChangeText={(value) => capture.updateField('merchantOrSource', value)}
            value={state.draft.merchantOrSource}
          />

          <TextField
            errorText={state.fieldErrors.note}
            helperText="Optional note, kept local."
            label="Note"
            multiline
            onChangeText={(value) => capture.updateField('note', value)}
            value={state.draft.note}
          />

          <Button
            disabled={saving}
            label={saving ? 'Saving' : isEditing ? 'Save changes' : `Save ${state.draft.kind}`}
            onPress={capture.save}
          />

          {isEditing ? (
            <View style={styles.buttonRow}>
              <Button
                disabled={saving}
                label="Cancel edit"
                onPress={capture.cancelEdit}
                variant="secondary"
              />
              <Button
                disabled={saving}
                label="Remove from active records"
                onPress={capture.deleteEditingRecord}
                variant="danger"
              />
            </View>
          ) : null}
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <View style={styles.header}>
            <Text style={styles.sectionTitle}>Recent money records</Text>
            <Text style={styles.description}>Tap a saved record to edit or remove it from active records.</Text>
          </View>

          {state.recentRecords.length === 0 ? (
            <StatusBanner title="No records yet" description="Save a manual expense or income record above." />
          ) : null}

          <View style={styles.listGroup}>
            {state.recentRecords.map((record) => (
              <ListRow
                key={record.id}
                title={record.merchantOrSource ?? (record.kind === 'expense' ? 'Expense' : 'Income')}
                description={record.note ?? undefined}
                onPress={() => capture.startEdit(record)}
                meta={`${formatRecordAmount(record)} · ${record.localDate}`}
              />
            ))}
          </View>
        </View>
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
  buttonRow: {
    gap: spacing.sm,
  },
  content: {
    gap: spacing.lg,
    padding: spacing.lg,
  },
  description: {
    ...typography.body,
    color: colors.body,
  },
  divider: {
    backgroundColor: colors.hairline,
    height: StyleSheet.hairlineWidth,
  },
  error: {
    ...typography.caption,
    color: colors.signatureCoral,
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
  helper: {
    ...typography.caption,
    color: colors.muted,
  },
  label: {
    ...typography.caption,
    color: colors.ink,
  },
  listGroup: {
    gap: spacing.xs,
  },
  optionGroup: {
    gap: spacing.xs,
  },
  safeArea: {
    backgroundColor: colors.canvas,
    flex: 1,
  },
  section: {
    gap: spacing.md,
  },
  sectionTitle: {
    ...typography.sectionTitle,
    color: colors.ink,
  },
  title: {
    ...typography.screenTitle,
    color: colors.ink,
  },
});
