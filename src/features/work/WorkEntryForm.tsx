import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { formatMinorUnitsForInput } from '@/domain/common/money';
import type { WorkEntry, WorkEntryMode } from '@/domain/work/types';
import { Button } from '@/ui/primitives/Button';
import { ListRow } from '@/ui/primitives/ListRow';
import { SegmentedControl } from '@/ui/primitives/SegmentedControl';
import { StatusBanner } from '@/ui/primitives/StatusBanner';
import { TextField } from '@/ui/primitives/TextField';
import { colors } from '@/ui/tokens/colors';
import { spacing } from '@/ui/tokens/spacing';
import { typography } from '@/ui/tokens/typography';
import { parseCaptureDraftResumeParam } from '@/features/capture-drafts/capture-draft-recovery';
import { parseWorkCaptureDraftPayload } from '@/features/capture-drafts/captureDraftPayloads';
import { getActiveCaptureDraft } from '@/services/capture-drafts/capture-draft.service';

import { createDefaultWorkEntryDraft, useWorkEntryCapture } from './useWorkEntryCapture';

const modeOptions: { label: string; value: WorkEntryMode }[] = [
  { label: 'Hours', value: 'hours' },
  { label: 'Shift', value: 'shift' },
];

const paidOptions: { label: string; value: 'paid' | 'unpaid' }[] = [
  { label: 'Paid', value: 'paid' },
  { label: 'Unpaid', value: 'unpaid' },
];

function formatDuration(minutes: number): string {
  const hours = minutes / 60;

  return Number.isInteger(hours) ? `${hours}h` : `${hours.toFixed(2)}h`;
}

export function WorkEntryForm() {
  const work = useWorkEntryCapture();
  const { state } = work;
  const { draft, draftSeq } = useLocalSearchParams();
  const appliedDraft = useRef<string | null>(null);
  const resumeDraftKind = parseCaptureDraftResumeParam(
    typeof draft === 'string' || Array.isArray(draft) ? draft : undefined,
  );
  const draftSequence = Array.isArray(draftSeq) ? draftSeq[0] : draftSeq;
  const saving = state.status === 'saving';
  const isEditing = state.editingEntryId !== null;

  const formatEntryAmount = (entry: WorkEntry) => {
    const formatted = state.preferences
      ? formatMinorUnitsForInput(entry.earnedIncomeMinor, entry.wageCurrencyCode, {
          locale: state.preferences.locale,
        })
      : { ok: false as const };

    return `${formatted.ok ? formatted.value : entry.earnedIncomeMinor} ${entry.wageCurrencyCode}`;
  };

  const savedDescription =
    state.lastMutation === 'deleted' && state.deletedEntry
      ? `${formatDuration(state.deletedEntry.durationMinutes)} entry removed from active work entries.`
      : state.savedEntry
        ? `${formatDuration(state.savedEntry.durationMinutes)} saved with ${formatEntryAmount(state.savedEntry)} earned.`
        : '';

  useEffect(() => {
    if (resumeDraftKind !== 'work') {
      return;
    }

    const handoffKey = draftSequence ? `${resumeDraftKind}:${draftSequence}` : resumeDraftKind;

    if (appliedDraft.current === handoffKey) {
      return;
    }

    appliedDraft.current = handoffKey;
    void getActiveCaptureDraft('work').then((result) => {
      if (!result.ok || !result.value) {
        return;
      }

      work.applyDraft(parseWorkCaptureDraftPayload(result.value.payload, createDefaultWorkEntryDraft()));
    });
  }, [draftSequence, resumeDraftKind, work]);

  if (state.status === 'loading') {
    return (
      <View accessibilityLabel="Loading work entries" accessibilityRole="summary" style={styles.inlineLoading}>
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.helper}>Loading work entry capture.</Text>
      </View>
    );
  }

  if (state.status === 'failed') {
    return (
      <StatusBanner
        title="Work entry capture could not load"
        description="Your local data is unchanged. Try opening Capture again."
        tone="warning"
      />
    );
  }

  if (state.status === 'preferences_needed') {
    return (
      <StatusBanner
        title="Preferences needed"
        description="Work entries use your saved default hourly wage and locale."
        tone="warning"
      />
    );
  }

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>Work entry</Text>
        <Text style={styles.description}>Record direct hours or a shift with a wage snapshot for this entry.</Text>
      </View>

      {(state.status === 'saved' || state.status === 'deleted') && savedDescription ? (
        <StatusBanner title="Work entry updated" description={savedDescription} />
      ) : null}

      {state.actionError ? (
        <StatusBanner
          title="Work entry action did not finish"
          description="Try again. Current edits are still on screen."
          tone="warning"
        />
      ) : null}

      {Object.keys(state.fieldErrors).length > 0 ? (
        <StatusBanner
          title="Check work fields"
          description="Each highlighted field includes the next correction to make."
          tone="warning"
        />
      ) : null}

      <View style={styles.form}>
        <SegmentedControl options={modeOptions} selectedValue={state.draft.entryMode} onChange={work.setEntryMode} />

        <SegmentedControl
          options={paidOptions}
          selectedValue={state.draft.paid ? 'paid' : 'unpaid'}
          onChange={(value) => work.setPaid(value === 'paid')}
        />

        {state.draft.entryMode === 'hours' ? (
          <>
            <TextField
              autoCapitalize="none"
              errorText={state.fieldErrors.localDate}
              helperText="Use YYYY-MM-DD."
              label="Work date"
              onChangeText={(value) => work.updateField('localDate', value)}
              value={state.draft.localDate}
            />
            <TextField
              errorText={state.fieldErrors.durationHours}
              helperText="Enter hours, like 2 or 1.5."
              keyboardType="decimal-pad"
              label="Hours"
              onChangeText={(value) => work.updateField('durationHours', value)}
              value={state.draft.durationHours}
            />
          </>
        ) : (
          <>
            <TextField
              autoCapitalize="none"
              errorText={state.fieldErrors.startedAtLocalDate}
              helperText="Use YYYY-MM-DD."
              label="Start date"
              onChangeText={(value) => work.updateField('startedAtLocalDate', value)}
              value={state.draft.startedAtLocalDate}
            />
            <TextField
              autoCapitalize="none"
              errorText={state.fieldErrors.startedAtLocalTime}
              helperText="Use HH:MM."
              label="Start time"
              onChangeText={(value) => work.updateField('startedAtLocalTime', value)}
              value={state.draft.startedAtLocalTime}
            />
            <TextField
              autoCapitalize="none"
              errorText={state.fieldErrors.endedAtLocalDate}
              helperText="Use YYYY-MM-DD. Use the next date for overnight shifts."
              label="End date"
              onChangeText={(value) => work.updateField('endedAtLocalDate', value)}
              value={state.draft.endedAtLocalDate}
            />
            <TextField
              autoCapitalize="none"
              errorText={state.fieldErrors.endedAtLocalTime}
              helperText="Use HH:MM."
              label="End time"
              onChangeText={(value) => work.updateField('endedAtLocalTime', value)}
              value={state.draft.endedAtLocalTime}
            />
            <TextField
              errorText={state.fieldErrors.breakMinutes}
              helperText="Optional unpaid break minutes."
              keyboardType="number-pad"
              label="Break"
              onChangeText={(value) => work.updateField('breakMinutes', value)}
              value={state.draft.breakMinutes}
            />
          </>
        )}

        <TextField
          errorText={state.fieldErrors.wageOverride}
          helperText={state.preferences ? 'Blank uses saved default wage.' : undefined}
          keyboardType="decimal-pad"
          label="Wage override"
          onChangeText={(value) => work.updateField('wageOverride', value)}
          value={state.draft.wageOverride}
        />

        <View style={styles.optionGroup}>
          <Text style={styles.label}>Work category</Text>
          <ListRow
            title="No category"
            description="Optional for quick capture."
            meta={state.draft.categoryId === null ? 'Selected' : 'Available'}
            onPress={() => work.selectCategory(null)}
          />
          {state.categories.map((category) => (
            <ListRow
              key={category.id}
              title={category.name}
              meta={state.draft.categoryId === category.id ? 'Selected' : 'Available'}
              onPress={() => work.selectCategory(category.id)}
            />
          ))}
          {state.fieldErrors.categoryId ? <Text style={styles.error}>{state.fieldErrors.categoryId}</Text> : null}
        </View>

        <View style={styles.optionGroup}>
          <Text style={styles.label}>Work topics</Text>
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
                onPress={() => work.toggleTopic(topic.id)}
              />
            );
          })}
          {state.fieldErrors.topicIds ? <Text style={styles.error}>{state.fieldErrors.topicIds}</Text> : null}
        </View>

        <TextField
          errorText={state.fieldErrors.note}
          helperText="Optional note, kept local."
          label="Work note"
          multiline
          onChangeText={(value) => work.updateField('note', value)}
          value={state.draft.note}
        />

        <Button
          disabled={saving}
          label={saving ? 'Saving' : isEditing ? 'Save work changes' : 'Save work entry'}
          onPress={work.save}
        />

        {isEditing ? (
          <View style={styles.buttonRow}>
            <Button disabled={saving} label="Cancel edit" onPress={work.cancelEdit} variant="secondary" />
            <Button
              disabled={saving}
              label="Remove from active work"
              onPress={work.deleteEditingEntry}
              variant="danger"
            />
          </View>
        ) : null}
      </View>

      <View style={styles.header}>
        <Text style={styles.subsectionTitle}>Recent work entries</Text>
        <Text style={styles.description}>Tap an entry to edit or remove it from active work entries.</Text>
      </View>

      {state.recentEntries.length === 0 ? (
        <StatusBanner title="No work entries yet" description="Save direct hours or a shift above." />
      ) : null}

      <View style={styles.listGroup}>
        {state.recentEntries.map((entry) => (
          <ListRow
            key={entry.id}
            title={entry.entryMode === 'hours' ? 'Direct hours' : 'Shift'}
            description={entry.note ?? undefined}
            meta={`${entry.localDate} - ${formatDuration(entry.durationMinutes)} - ${
              entry.paid ? formatEntryAmount(entry) : 'Unpaid'
            } - ${entry.wageSource === 'override' ? 'Override wage' : 'Default wage'}`}
            onPress={() => work.startEdit(entry)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  buttonRow: {
    gap: spacing.sm,
  },
  description: {
    ...typography.body,
    color: colors.body,
  },
  error: {
    ...typography.caption,
    color: colors.signatureCoral,
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
  section: {
    gap: spacing.md,
  },
  sectionTitle: {
    ...typography.sectionTitle,
    color: colors.ink,
  },
  subsectionTitle: {
    ...typography.label,
    color: colors.ink,
  },
});
