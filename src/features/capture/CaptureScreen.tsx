import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { formatMinorUnitsForInput } from '@/domain/common/money';
import type { MoneyRecordKind, MoneyRecord } from '@/domain/money/types';
import type { RecurrenceFrequency } from '@/domain/recurrence/types';
import { Button } from '@/ui/primitives/Button';
import { ListRow } from '@/ui/primitives/ListRow';
import { SegmentedControl } from '@/ui/primitives/SegmentedControl';
import { StatusBanner } from '@/ui/primitives/StatusBanner';
import { TextField } from '@/ui/primitives/TextField';
import { colors } from '@/ui/tokens/colors';
import { spacing } from '@/ui/tokens/spacing';
import { typography } from '@/ui/tokens/typography';
import { TaskForm } from '@/features/tasks/TaskForm';
import { WorkEntryForm } from '@/features/work/WorkEntryForm';
import { buildExpenseWorkTimeContextText } from '@/features/work/workTimeContextText';
import { CaptureDraftRecoveryPanel } from '@/features/capture-drafts/CaptureDraftRecoveryPanel';
import { parseCaptureDraftResumeParam } from '@/features/capture-drafts/capture-draft-recovery';
import { parseMoneyCaptureDraftPayload } from '@/features/capture-drafts/captureDraftPayloads';
import { getActiveCaptureDraft } from '@/services/capture-drafts/capture-draft.service';

import { parseMoneyQuickCaptureParam } from './quickCaptureParams';
import {
  createDefaultManualMoneyCaptureDraft,
  useManualMoneyCapture,
} from './useManualMoneyCapture';
import { useRecurringMoney } from './useRecurringMoney';

const kindOptions: { label: string; value: MoneyRecordKind }[] = [
  { label: 'Expense', value: 'expense' },
  { label: 'Income', value: 'income' },
];

const frequencyOptions: { label: string; value: RecurrenceFrequency }[] = [
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
];

function formatFrequency(frequency: RecurrenceFrequency): string {
  switch (frequency) {
    case 'daily':
      return 'Daily';
    case 'weekly':
      return 'Weekly';
    case 'monthly':
      return 'Monthly';
    default:
      return frequency;
  }
}

export function CaptureScreen() {
  const capture = useManualMoneyCapture();
  const recurring = useRecurringMoney();
  const { draft, draftSeq, quick, quickSeq } = useLocalSearchParams();
  const { state } = capture;
  const recurringState = recurring.state;
  const appliedQuickKind = useRef<string | null>(null);
  const appliedDraftKind = useRef<string | null>(null);
  const quickKind = parseMoneyQuickCaptureParam(
    typeof quick === 'string' || Array.isArray(quick) ? quick : undefined,
  );
  const resumeDraftKind = parseCaptureDraftResumeParam(
    typeof draft === 'string' || Array.isArray(draft) ? draft : undefined,
  );
  const quickSequence = Array.isArray(quickSeq) ? quickSeq[0] : quickSeq;
  const draftSequence = Array.isArray(draftSeq) ? draftSeq[0] : draftSeq;
  const saving = state.status === 'saving';
  const isEditing = state.editingRecordId !== null;
  const recurringSaving = recurringState.status === 'saving';
  const isEditingRecurring = recurringState.editingRuleId !== null;

  useEffect(() => {
    const handoffKey = quickSequence ? `${quickKind}:${quickSequence}` : quickKind;

    if (resumeDraftKind || !quickKind || appliedQuickKind.current === handoffKey) {
      return;
    }

    appliedQuickKind.current = handoffKey;
    capture.setKind(quickKind);
  }, [capture, quickKind, quickSequence, resumeDraftKind]);

  useEffect(() => {
    if (resumeDraftKind !== 'expense' && resumeDraftKind !== 'income') {
      return;
    }

    const handoffKey = draftSequence ? `${resumeDraftKind}:${draftSequence}` : resumeDraftKind;

    if (appliedDraftKind.current === handoffKey) {
      return;
    }

    appliedDraftKind.current = handoffKey;
    void getActiveCaptureDraft(resumeDraftKind).then((result) => {
      if (!result.ok || !result.value) {
        return;
      }

      capture.applyDraft(
        parseMoneyCaptureDraftPayload(
          resumeDraftKind,
          result.value.payload,
          createDefaultManualMoneyCaptureDraft(),
        ),
      );
    });
  }, [capture, draftSequence, resumeDraftKind]);

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

  const formatRecurringAmount = (amountMinor: number, currencyCode: string) => {
    const formatted = recurringState.preferences
      ? formatMinorUnitsForInput(amountMinor, currencyCode, {
          locale: recurringState.preferences.locale,
        })
      : { ok: false as const };

    return `${formatted.ok ? formatted.value : amountMinor} ${currencyCode}`;
  };

  const formatSavedExpenseContext = (record: MoneyRecord | null) => {
    if (!record) {
      return '';
    }

    const context = buildExpenseWorkTimeContextText(record, state.preferences);

    return context ? ` ${context}.` : '';
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
        ? `${formatRecordAmount(state.savedRecord)} is saved locally. Planning context was recalculated.${formatSavedExpenseContext(
            state.savedRecord,
          )}`
        : state.savedRecord
          ? `${formatRecordAmount(state.savedRecord)} is ready for budget, history, and summary inputs.${formatSavedExpenseContext(
              state.savedRecord,
            )}`
        : '';

  const recurringSavedDescription =
    recurringState.lastMutation === 'generated'
      ? recurringState.generatedCount && recurringState.generatedCount > 0
        ? `${recurringState.generatedCount} due occurrence${
            recurringState.generatedCount === 1 ? '' : 's'
          } materialized as money records.`
        : 'No due occurrences were available to generate.'
      : recurringState.lastMutation === 'skipped' && recurringState.skippedDate
        ? `Skipped next occurrence on ${recurringState.skippedDate}.`
        : recurringState.lastMutation === 'paused'
          ? 'Series paused. No new occurrences will generate until resumed.'
          : recurringState.lastMutation === 'resumed'
            ? 'Series resumed. Future due occurrences can generate again.'
            : recurringState.lastMutation === 'stopped'
              ? 'Series stopped. Already materialized records stay unchanged.'
              : recurringState.lastMutation === 'deleted'
                ? 'Series deleted from active recurring money.'
                : recurringState.lastMutation === 'updated'
                  ? 'Recurring money template updated for future unmaterialized occurrences.'
                  : recurringState.lastMutation === 'created'
                    ? 'Recurring money item saved. Future occurrences are previewed until generated.'
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
        <CaptureDraftRecoveryPanel />

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

        <View style={styles.divider} />

        <View style={styles.section}>
          <View style={styles.header}>
            <Text style={styles.sectionTitle}>Recurring money</Text>
            <Text style={styles.description}>
              Save predictable expenses or income as templates, then materialize only due occurrences.
            </Text>
          </View>

          {recurringState.status === 'loading' ? (
            <View accessibilityLabel="Loading recurring money" accessibilityRole="summary" style={styles.inlineLoading}>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.helper}>Loading recurring money.</Text>
            </View>
          ) : null}

          {recurringState.status === 'failed' ? (
            <StatusBanner
              title="Recurring money could not load"
              description="Your local money records are unchanged. Try again when local data is available."
              tone="warning"
            />
          ) : null}

          {recurringState.status === 'preferences_needed' ? (
            <StatusBanner
              title="Preferences needed"
              description="Recurring money uses your saved currency and locale."
              tone="warning"
            />
          ) : null}

          {recurringState.status !== 'loading' &&
          recurringState.status !== 'failed' &&
          recurringState.status !== 'preferences_needed' ? (
            <>
              {recurringState.status === 'saved' && recurringSavedDescription ? (
                <StatusBanner title="Recurring money updated" description={recurringSavedDescription} />
              ) : null}

              {recurringState.actionError ? (
                <StatusBanner
                  title="Recurring money action did not finish"
                  description="Try again. Current recurring edits are still on screen."
                  tone="warning"
                />
              ) : null}

              {Object.keys(recurringState.fieldErrors).length > 0 ? (
                <StatusBanner
                  title="Check recurring fields"
                  description="Each highlighted field includes the next correction to make."
                  tone="warning"
                />
              ) : null}

              <View style={styles.form}>
                <SegmentedControl
                  options={kindOptions}
                  selectedValue={recurringState.draft.kind}
                  onChange={recurring.setKind}
                />

                <SegmentedControl
                  options={frequencyOptions}
                  selectedValue={recurringState.draft.frequency}
                  onChange={recurring.setFrequency}
                />

                <TextField
                  errorText={recurringState.fieldErrors.amount}
                  helperText={
                    recurringState.preferences ? `Uses ${recurringState.preferences.currencyCode}.` : undefined
                  }
                  keyboardType="decimal-pad"
                  label="Recurring amount"
                  onChangeText={(value) => recurring.updateField('amount', value)}
                  value={recurringState.draft.amount}
                />

                <TextField
                  autoCapitalize="none"
                  errorText={recurringState.fieldErrors.startsOnLocalDate}
                  helperText="Use YYYY-MM-DD."
                  label="Starts on"
                  onChangeText={(value) => recurring.updateField('startsOnLocalDate', value)}
                  value={recurringState.draft.startsOnLocalDate}
                />

                <TextField
                  autoCapitalize="none"
                  errorText={recurringState.fieldErrors.endsOnLocalDate}
                  helperText="Optional. Use YYYY-MM-DD."
                  label="Ends on"
                  onChangeText={(value) => recurring.updateField('endsOnLocalDate', value)}
                  value={recurringState.draft.endsOnLocalDate}
                />

                <View style={styles.optionGroup}>
                  <Text style={styles.label}>Recurring category</Text>
                  <ListRow
                    title="No category"
                    description="Optional for quick setup."
                    meta={recurringState.draft.categoryId === null ? 'Selected' : 'Available'}
                    onPress={() => recurring.selectCategory(null)}
                  />
                  {recurringState.categories.map((category) => (
                    <ListRow
                      key={category.id}
                      title={category.name}
                      meta={recurringState.draft.categoryId === category.id ? 'Selected' : 'Available'}
                      onPress={() => recurring.selectCategory(category.id)}
                    />
                  ))}
                  {recurringState.fieldErrors.categoryId ? (
                    <Text style={styles.error}>{recurringState.fieldErrors.categoryId}</Text>
                  ) : null}
                </View>

                <View style={styles.optionGroup}>
                  <Text style={styles.label}>Recurring topics</Text>
                  {recurringState.topics.length === 0 ? (
                    <Text style={styles.helper}>Topics are optional. Add them later in Settings.</Text>
                  ) : null}
                  {recurringState.topics.map((topic) => {
                    const selected = recurringState.draft.topicIds.includes(topic.id);

                    return (
                      <ListRow
                        key={topic.id}
                        title={topic.name}
                        meta={selected ? 'Selected' : 'Available'}
                        onPress={() => recurring.toggleTopic(topic.id)}
                      />
                    );
                  })}
                  {recurringState.fieldErrors.topicIds ? (
                    <Text style={styles.error}>{recurringState.fieldErrors.topicIds}</Text>
                  ) : null}
                </View>

                <TextField
                  autoCapitalize="words"
                  errorText={recurringState.fieldErrors.merchantOrSource}
                  helperText={
                    recurringState.draft.kind === 'expense'
                      ? 'Optional recurring merchant.'
                      : 'Optional recurring income source.'
                  }
                  label={recurringState.draft.kind === 'expense' ? 'Merchant' : 'Source'}
                  onChangeText={(value) => recurring.updateField('merchantOrSource', value)}
                  value={recurringState.draft.merchantOrSource}
                />

                <TextField
                  errorText={recurringState.fieldErrors.note}
                  helperText="Optional note, kept local."
                  label="Recurring note"
                  multiline
                  onChangeText={(value) => recurring.updateField('note', value)}
                  value={recurringState.draft.note}
                />

                <Button
                  disabled={recurringSaving}
                  label={
                    recurringSaving
                      ? 'Saving'
                      : isEditingRecurring
                        ? 'Save series changes'
                        : `Save recurring ${recurringState.draft.kind}`
                  }
                  onPress={recurring.save}
                />

                {isEditingRecurring ? (
                  <Button
                    disabled={recurringSaving}
                    label="Cancel recurring edit"
                    onPress={recurring.cancelEdit}
                    variant="secondary"
                  />
                ) : null}
              </View>

              <View style={styles.ruleToolbar}>
                <Button
                  disabled={recurringSaving}
                  label={recurringSaving ? 'Working' : 'Generate due'}
                  onPress={recurring.generateDueOccurrences}
                  variant="secondary"
                />
              </View>

              {recurringState.rules.length === 0 ? (
                <StatusBanner
                  title="No recurring money yet"
                  description="Save a recurring expense or income template above."
                />
              ) : null}

              <View style={styles.listGroup}>
                {recurringState.rules.map((view) => {
                  const rule = view.rule;
                  const paused = rule.pausedAt !== null;
                  const stopped = rule.stoppedAt !== null;
                  const status = paused
                    ? 'Paused'
                    : stopped
                      ? 'Stopped'
                      : view.nextOccurrences.length > 0
                        ? `Next: ${view.nextOccurrences.join(', ')}`
                        : 'No due preview';

                  return (
                    <View key={rule.id} style={styles.ruleBlock}>
                      <ListRow
                        title={rule.merchantOrSource ?? (rule.moneyKind === 'expense' ? 'Recurring expense' : 'Recurring income')}
                        description={`${formatFrequency(rule.frequency)} from ${rule.startsOnLocalDate}${
                          rule.endsOnLocalDate ? ` until ${rule.endsOnLocalDate}` : ''
                        }`}
                        meta={`${formatRecurringAmount(rule.amountMinor, rule.currencyCode)} - ${status}`}
                        onPress={() => recurring.startEdit(view)}
                      />
                      <View style={styles.ruleActions}>
                        <Button
                          disabled={recurringSaving || stopped}
                          label={paused ? 'Resume' : 'Pause'}
                          onPress={() => (paused ? recurring.resumeRule(rule.id) : recurring.pauseRule(rule.id))}
                          variant="secondary"
                        />
                        <Button
                          disabled={recurringSaving || paused || stopped}
                          label="Skip next"
                          onPress={() => recurring.skipNextOccurrence(rule.id)}
                          variant="secondary"
                        />
                        <Button
                          disabled={recurringSaving || stopped}
                          label="Stop series"
                          onPress={() => recurring.stopRule(rule.id)}
                          variant="secondary"
                        />
                        <Button
                          disabled={recurringSaving}
                          label="Delete series"
                          onPress={() => recurring.deleteRule(rule.id)}
                          variant="danger"
                        />
                      </View>
                    </View>
                  );
                })}
              </View>
            </>
          ) : null}
        </View>

        <View style={styles.divider} />

        <TaskForm />

        <View style={styles.divider} />

        <WorkEntryForm />
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
  inlineLoading: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
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
  ruleActions: {
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  ruleBlock: {
    gap: spacing.xs,
  },
  ruleToolbar: {
    gap: spacing.sm,
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
