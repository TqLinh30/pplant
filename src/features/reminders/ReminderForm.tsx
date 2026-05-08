import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import type {
  ReminderFrequency,
  ReminderOwnerKind,
  ReminderScheduleState,
} from '@/domain/reminders/types';
import { Button } from '@/ui/primitives/Button';
import { ListRow } from '@/ui/primitives/ListRow';
import { SegmentedControl } from '@/ui/primitives/SegmentedControl';
import { StatusBanner } from '@/ui/primitives/StatusBanner';
import { TextField } from '@/ui/primitives/TextField';
import { colors } from '@/ui/tokens/colors';
import { spacing } from '@/ui/tokens/spacing';
import { typography } from '@/ui/tokens/typography';
import { parseCaptureDraftResumeParam } from '@/features/capture-drafts/capture-draft-recovery';
import { parseReminderCaptureDraftPayload } from '@/features/capture-drafts/captureDraftPayloads';
import { getActiveCaptureDraft } from '@/services/capture-drafts/capture-draft.service';

import { isRecoveryHandoffForTarget, useRecoveryHandoff } from '../recovery/recovery-handoff';
import {
  createDefaultReminderCaptureDraft,
  useReminderCapture,
  type ReminderCaptureMutation,
} from './useReminderCapture';

const ownerOptions: { label: string; value: ReminderOwnerKind }[] = [
  { label: 'Standalone', value: 'standalone' },
  { label: 'Task', value: 'task' },
  { label: 'Routine', value: 'task_recurrence' },
];

const frequencyOptions: { label: string; value: ReminderFrequency }[] = [
  { label: 'Once', value: 'once' },
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
];

function formatFrequency(frequency: ReminderFrequency): string {
  switch (frequency) {
    case 'daily':
      return 'Daily';
    case 'monthly':
      return 'Monthly';
    case 'weekly':
      return 'Weekly';
    case 'once':
    default:
      return 'Once';
  }
}

function formatScheduleState(state: ReminderScheduleState): string {
  switch (state) {
    case 'scheduled':
      return 'Scheduled';
    case 'snoozed':
      return 'Snoozed';
    case 'paused':
      return 'Paused';
    case 'disabled':
      return 'Disabled';
    case 'permission_denied':
      return 'Notifications are off';
    case 'unavailable':
      return 'Scheduling unavailable';
    case 'failed':
      return 'Scheduling needs attention';
    case 'local_only':
    default:
      return 'Reminder saved locally';
  }
}

function scheduleDescription(state: ReminderScheduleState): string {
  switch (state) {
    case 'scheduled':
      return 'Local notifications are scheduled for the upcoming reminder window.';
    case 'snoozed':
      return 'The next reminder moved later. The original repeat pattern is unchanged.';
    case 'paused':
      return 'Notifications are paused. Reminder details are still saved and can be resumed.';
    case 'disabled':
      return 'Notifications are disabled. Reminder details are still saved and can be enabled.';
    case 'permission_denied':
      return 'Notifications are off. You can still use this reminder in Pplant.';
    case 'unavailable':
      return 'Scheduling is unavailable right now. You can still use this reminder in Pplant.';
    case 'failed':
      return 'Pplant saved the reminder and recorded a safe diagnostic event.';
    case 'local_only':
    default:
      return 'Reminder saved locally. You can still use this reminder in Pplant.';
  }
}

function scheduleTone(state: ReminderScheduleState): 'neutral' | 'success' | 'warning' {
  if (state === 'scheduled' || state === 'snoozed') {
    return 'success';
  }

  if (state === 'failed' || state === 'unavailable') {
    return 'warning';
  }

  return 'neutral';
}

function savedMutationTitle(lastMutation: ReminderCaptureMutation | null): string {
  switch (lastMutation) {
    case 'deleted':
      return 'Reminder deleted';
    case 'disabled':
      return 'Reminder disabled';
    case 'enabled':
      return 'Reminder enabled';
    case 'paused':
      return 'Reminder paused';
    case 'resumed':
      return 'Reminder resumed';
    case 'skipped':
      return 'Reminder occurrence skipped';
    case 'snoozed':
      return 'Reminder snoozed';
    case 'updated':
      return 'Reminder updated';
    case 'local_only':
    case 'created':
    default:
      return 'Reminder saved';
  }
}

export function ReminderForm() {
  const reminders = useReminderCapture();
  const { state } = reminders;
  const startEdit = reminders.startEdit;
  const { consumeHandoff, handoff } = useRecoveryHandoff();
  const { draft, draftSeq } = useLocalSearchParams();
  const appliedDraft = useRef<string | null>(null);
  const resumeDraftKind = parseCaptureDraftResumeParam(
    typeof draft === 'string' || Array.isArray(draft) ? draft : undefined,
  );
  const draftSequence = Array.isArray(draftSeq) ? draftSeq[0] : draftSeq;
  const saving = state.status === 'saving';

  useEffect(() => {
    if (!handoff) {
      return;
    }

    const view = state.reminders.find((item) =>
      isRecoveryHandoffForTarget(handoff, 'reminder_occurrence', item.reminder.id),
    );

    if (!view) {
      return;
    }

    startEdit(view);
    consumeHandoff(handoff.sequence);
  }, [consumeHandoff, handoff, startEdit, state.reminders]);

  useEffect(() => {
    if (resumeDraftKind !== 'reminder') {
      return;
    }

    const handoffKey = draftSequence ? `${resumeDraftKind}:${draftSequence}` : resumeDraftKind;

    if (appliedDraft.current === handoffKey) {
      return;
    }

    appliedDraft.current = handoffKey;
    void getActiveCaptureDraft('reminder').then((result) => {
      if (!result.ok || !result.value) {
        return;
      }

      reminders.applyDraft(
        parseReminderCaptureDraftPayload(
          result.value.payload,
          createDefaultReminderCaptureDraft(),
        ),
      );
    });
  }, [draftSequence, reminders, resumeDraftKind]);

  if (state.status === 'loading') {
    return (
      <View accessibilityLabel="Loading reminders" accessibilityRole="summary" style={styles.inlineLoading}>
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.helper}>Loading reminders.</Text>
      </View>
    );
  }

  if (state.status === 'failed') {
    return (
      <View style={styles.section}>
        <StatusBanner
          title="Reminders could not load"
          description="Your local data is unchanged. Try loading reminders again."
          tone="warning"
        />
        <Button label="Retry reminders" onPress={reminders.reload} variant="secondary" />
      </View>
    );
  }

  const savedDescription =
    state.lastMutation === 'skipped' && state.occurrenceDate
      ? `Skipped reminder occurrence on ${state.occurrenceDate}.`
      : state.lastMutation === 'deleted'
        ? 'Reminder removed. Linked task and routine data were not changed.'
      : state.savedReminder
        ? scheduleDescription(state.savedReminder.scheduleState)
        : '';

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>Reminders</Text>
        <Text style={styles.description}>Create one-time or repeating reminders with local notification fallback.</Text>
      </View>

      {state.status === 'saved' && savedDescription ? (
        <StatusBanner
          title={savedMutationTitle(state.lastMutation)}
          description={savedDescription}
          tone={
            state.lastMutation === 'deleted'
              ? 'neutral'
              : state.savedReminder
                ? scheduleTone(state.savedReminder.scheduleState)
                : 'neutral'
          }
        />
      ) : null}

      {state.actionError ? (
        <StatusBanner
          title="Reminder action did not finish"
          description="Try again. Current edits are still on screen."
          tone="warning"
        />
      ) : null}

      {Object.keys(state.fieldErrors).length > 0 ? (
        <StatusBanner
          title="Check reminder fields"
          description="Each highlighted field includes the next correction to make."
          tone="warning"
        />
      ) : null}

      {state.editingReminderId ? (
        <StatusBanner
          title="Editing reminder timing"
          description="Save changes to update the reminder schedule, or cancel to leave it unchanged."
        />
      ) : null}

      <View style={styles.form}>
        <SegmentedControl options={ownerOptions} selectedValue={state.draft.ownerKind} onChange={reminders.setOwnerKind} />
        <SegmentedControl
          options={frequencyOptions}
          selectedValue={state.draft.frequency}
          onChange={reminders.setFrequency}
        />

        <TextField
          errorText={state.fieldErrors.title}
          label="Reminder title"
          onChangeText={(value) => reminders.updateField('title', value)}
          value={state.draft.title}
        />

        <View style={styles.dateRow}>
          <View style={styles.dateField}>
            <TextField
              autoCapitalize="none"
              errorText={state.fieldErrors.startsOnLocalDate}
              helperText="Use YYYY-MM-DD."
              label="Starts on"
              onChangeText={(value) => reminders.updateField('startsOnLocalDate', value)}
              value={state.draft.startsOnLocalDate}
            />
          </View>
          <View style={styles.timeField}>
            <TextField
              autoCapitalize="none"
              errorText={state.fieldErrors.reminderLocalTime}
              helperText="HH:mm."
              label="Time"
              onChangeText={(value) => reminders.updateField('reminderLocalTime', value)}
              value={state.draft.reminderLocalTime}
            />
          </View>
        </View>

        <TextField
          autoCapitalize="none"
          errorText={state.fieldErrors.endsOnLocalDate}
          helperText="Optional for repeating reminders. Use YYYY-MM-DD."
          label="Ends on"
          onChangeText={(value) => reminders.updateField('endsOnLocalDate', value)}
          value={state.draft.endsOnLocalDate}
        />

        <TextField
          autoCapitalize="none"
          errorText={state.fieldErrors.skipLocalDate}
          helperText="Optional occurrence to skip. Use YYYY-MM-DD."
          label="Skip occurrence"
          onChangeText={(value) => reminders.updateField('skipLocalDate', value)}
          value={state.draft.skipLocalDate}
        />

        <TextField
          errorText={state.fieldErrors.notes}
          helperText="Optional note, kept local."
          label="Notes"
          multiline
          onChangeText={(value) => reminders.updateField('notes', value)}
          value={state.draft.notes}
        />

        {state.draft.ownerKind === 'task' ? (
          <View style={styles.optionGroup}>
            <Text style={styles.label}>Task link</Text>
            {state.recentTasks.length === 0 ? (
              <Text style={styles.helper}>Save a task first, or switch this reminder to standalone.</Text>
            ) : null}
            {state.recentTasks.map((task) => (
              <ListRow
                key={task.id}
                title={task.title}
                description={task.notes ?? undefined}
                meta={state.draft.taskId === task.id ? 'Selected task' : task.deadlineLocalDate ? `Due ${task.deadlineLocalDate}` : 'Available task'}
                onPress={() => reminders.selectTaskOwner(task.id)}
              />
            ))}
            {state.fieldErrors.taskId ? <Text style={styles.error}>{state.fieldErrors.taskId}</Text> : null}
          </View>
        ) : null}

        {state.draft.ownerKind === 'task_recurrence' ? (
          <View style={styles.optionGroup}>
            <Text style={styles.label}>Routine link</Text>
            {state.taskRecurrenceRules.length === 0 ? (
              <Text style={styles.helper}>Save a recurring task or habit first, or switch this reminder to standalone.</Text>
            ) : null}
            {state.taskRecurrenceRules.map((rule) => (
              <ListRow
                key={rule.id}
                title={rule.title}
                description={rule.notes ?? undefined}
                meta={
                  state.draft.taskRecurrenceRuleId === rule.id
                    ? 'Selected routine'
                    : `${formatFrequency(rule.frequency)} from ${rule.startsOnLocalDate}`
                }
                onPress={() => reminders.selectTaskRecurrenceOwner(rule.id)}
              />
            ))}
            {state.fieldErrors.taskRecurrenceRuleId ? (
              <Text style={styles.error}>{state.fieldErrors.taskRecurrenceRuleId}</Text>
            ) : null}
          </View>
        ) : null}

        <View style={styles.buttonRow}>
          <Button
            disabled={saving}
            label={saving ? 'Saving' : state.editingReminderId ? 'Save reminder changes' : 'Save reminder'}
            onPress={() => reminders.save()}
          />
          <Button
            disabled={saving}
            label={state.editingReminderId ? 'Save local-only changes' : 'Save local-only'}
            onPress={reminders.saveLocalOnly}
            variant="secondary"
          />
          {state.editingReminderId ? (
            <Button
              disabled={saving}
              label="Cancel reminder edit"
              onPress={reminders.cancelEdit}
              variant="secondary"
            />
          ) : null}
        </View>
      </View>

      {state.reminders.length === 0 ? (
        <StatusBanner
          title="No reminders yet"
          description="Save a reminder above when something should come back to attention."
        />
      ) : null}

      <View style={styles.listGroup}>
        {state.reminders.map((view) => {
          const reminder = view.reminder;
          const reminderPaused = reminder.scheduleState === 'paused';
          const reminderDisabled = reminder.scheduleState === 'disabled';

          return (
            <View key={reminder.id} style={styles.reminderBlock}>
              <ListRow
                title={reminder.title}
                description={reminder.notes ?? undefined}
                meta={`${formatFrequency(reminder.frequency)} from ${reminder.startsOnLocalDate} at ${reminder.reminderLocalTime} - ${formatScheduleState(reminder.scheduleState)}`}
              />
              <StatusBanner
                title={formatScheduleState(reminder.scheduleState)}
                description={scheduleDescription(reminder.scheduleState)}
                tone={scheduleTone(reminder.scheduleState)}
              />
              <View style={styles.occurrenceGroup}>
                {view.occurrences.map((occurrence) => (
                  <ListRow
                    key={`${reminder.id}-${occurrence.localDate}`}
                    title={occurrence.localDate}
                    meta={occurrence.state === 'skipped' ? 'Skipped' : occurrence.fireAtLocal}
                  />
                ))}
              </View>
              <View style={styles.reminderActions}>
                <Button
                  disabled={saving}
                  label="Edit reminder timing"
                  onPress={() => reminders.startEdit(view)}
                  variant="secondary"
                />
                <Button
                  disabled={saving || reminderPaused || reminderDisabled}
                  label="Snooze reminder 30 min"
                  onPress={() => reminders.snoozeNextOccurrence(reminder.id)}
                  variant="secondary"
                />
                <Button
                  disabled={saving || reminderDisabled}
                  label={reminderPaused ? 'Resume reminder' : 'Pause reminder'}
                  onPress={() =>
                    reminderPaused ? reminders.resumeReminder(reminder.id) : reminders.pauseReminder(reminder.id)
                  }
                  variant="secondary"
                />
                <Button
                  disabled={saving}
                  label={reminderDisabled ? 'Enable reminder' : 'Disable reminder'}
                  onPress={() =>
                    reminderDisabled ? reminders.enableReminder(reminder.id) : reminders.disableReminder(reminder.id)
                  }
                  variant="secondary"
                />
                <Button
                  disabled={saving || reminderDisabled}
                  label="Skip next occurrence"
                  onPress={() => reminders.skipNextOccurrence(reminder.id)}
                  variant="secondary"
                />
                <Button
                  disabled={saving}
                  label="Delete reminder"
                  onPress={() => reminders.deleteReminder(reminder.id)}
                  variant="danger"
                />
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  buttonRow: {
    gap: spacing.sm,
  },
  dateField: {
    flex: 1.4,
  },
  dateRow: {
    flexDirection: 'row',
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
    gap: spacing.md,
  },
  occurrenceGroup: {
    gap: spacing.xs,
  },
  optionGroup: {
    gap: spacing.xs,
  },
  reminderBlock: {
    gap: spacing.sm,
  },
  reminderActions: {
    gap: spacing.sm,
  },
  section: {
    gap: spacing.md,
  },
  sectionTitle: {
    ...typography.sectionTitle,
    color: colors.ink,
  },
  timeField: {
    flex: 1,
  },
});
