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

import { useReminderCapture } from './useReminderCapture';

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
  if (state === 'scheduled') {
    return 'success';
  }

  if (state === 'failed' || state === 'unavailable') {
    return 'warning';
  }

  return 'neutral';
}

export function ReminderForm() {
  const reminders = useReminderCapture();
  const { state } = reminders;
  const saving = state.status === 'saving';

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
          title={state.lastMutation === 'skipped' ? 'Reminder occurrence skipped' : 'Reminder saved'}
          description={savedDescription}
          tone={state.savedReminder ? scheduleTone(state.savedReminder.scheduleState) : 'neutral'}
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
          <Button disabled={saving} label={saving ? 'Saving' : 'Save reminder'} onPress={() => reminders.save()} />
          <Button
            disabled={saving}
            label="Save local-only"
            onPress={reminders.saveLocalOnly}
            variant="secondary"
          />
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
              <Button
                disabled={saving}
                label="Skip next occurrence"
                onPress={() => reminders.skipNextOccurrence(reminder.id)}
                variant="secondary"
              />
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
