import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import type { RecurrenceFrequency } from '@/domain/recurrence/types';
import type {
  TaskPriority,
  TaskRecurrenceKind,
  TaskRecurrenceOccurrence,
} from '@/domain/tasks/types';
import { Button } from '@/ui/primitives/Button';
import { ListRow } from '@/ui/primitives/ListRow';
import { SegmentedControl } from '@/ui/primitives/SegmentedControl';
import { StatusBanner } from '@/ui/primitives/StatusBanner';
import { TextField } from '@/ui/primitives/TextField';
import { colors } from '@/ui/tokens/colors';
import { spacing } from '@/ui/tokens/spacing';
import { typography } from '@/ui/tokens/typography';

import { isRecoveryHandoffForTarget, useRecoveryHandoff } from '../recovery/recovery-handoff';
import { useTaskRecurrence } from './useTaskRecurrence';

const kindOptions: { label: string; value: TaskRecurrenceKind }[] = [
  { label: 'Task', value: 'task' },
  { label: 'Habit', value: 'habit' },
];

const frequencyOptions: { label: string; value: RecurrenceFrequency }[] = [
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
];

const priorityOptions: { label: string; value: TaskPriority }[] = [
  { label: 'High', value: 'high' },
  { label: 'Low', value: 'low' },
];

function formatKind(kind: TaskRecurrenceKind): string {
  return kind === 'habit' ? 'Habit' : 'Task';
}

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

function formatOccurrenceState(occurrence: TaskRecurrenceOccurrence): string {
  switch (occurrence.state) {
    case 'completed':
      return 'Completed for this day';
    case 'skipped':
      return 'Skipped';
    case 'open':
    default:
      return 'Open';
  }
}

export function TaskRecurrenceForm() {
  const recurrence = useTaskRecurrence();
  const { state } = recurrence;
  const startEdit = recurrence.startEdit;
  const { consumeHandoff, handoff } = useRecoveryHandoff();
  const saving = state.status === 'saving';
  const isEditing = state.editingRuleId !== null;

  useEffect(() => {
    if (!handoff) {
      return;
    }

    const view = state.rules.find((item) =>
      isRecoveryHandoffForTarget(handoff, 'task_recurrence_occurrence', item.rule.id, ['edit']),
    );

    if (!view) {
      return;
    }

    startEdit(view);
    consumeHandoff(handoff.sequence);
  }, [consumeHandoff, handoff, startEdit, state.rules]);

  if (state.status === 'loading') {
    return (
      <View accessibilityLabel="Loading recurring tasks" accessibilityRole="summary" style={styles.inlineLoading}>
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.helper}>Loading recurring tasks and habits.</Text>
      </View>
    );
  }

  if (state.status === 'failed') {
    return (
      <View style={styles.section}>
        <StatusBanner
          title="Recurring tasks could not load"
          description="Your local task data is unchanged. Try loading recurring tasks again."
          tone="warning"
        />
        <Button label="Retry recurring tasks" onPress={recurrence.reload} variant="secondary" />
      </View>
    );
  }

  const savedDescription =
    state.lastMutation === 'created'
      ? 'Recurring task or habit saved.'
      : state.lastMutation === 'updated'
        ? 'Recurring task or habit updated.'
        : state.lastMutation === 'paused'
          ? 'Series paused.'
          : state.lastMutation === 'resumed'
            ? 'Series resumed.'
            : state.lastMutation === 'skipped' && state.occurrenceDate
              ? `Occurrence skipped on ${state.occurrenceDate}.`
              : state.lastMutation === 'completed' && state.occurrenceDate
                ? `Completed for ${state.occurrenceDate}.`
                : state.lastMutation === 'undone' && state.occurrenceDate
                  ? `Completion reopened for ${state.occurrenceDate}.`
                  : state.lastMutation === 'stopped'
                    ? 'Series stopped.'
                    : state.lastMutation === 'deleted'
                      ? 'Series removed from active recurring tasks.'
                      : '';

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>Recurring tasks and habits</Text>
        <Text style={styles.description}>Set a simple daily, weekly, or monthly routine with completion by day.</Text>
      </View>

      {state.status === 'saved' && savedDescription ? (
        <StatusBanner title="Recurring task updated" description={savedDescription} />
      ) : null}

      {state.actionError ? (
        <StatusBanner
          title="Recurring task action did not finish"
          description="Try again. Current edits are still on screen."
          tone="warning"
        />
      ) : null}

      {Object.keys(state.fieldErrors).length > 0 ? (
        <StatusBanner
          title="Check recurring task fields"
          description="Each highlighted field includes the next correction to make."
          tone="warning"
        />
      ) : null}

      <View style={styles.form}>
        <SegmentedControl options={kindOptions} selectedValue={state.draft.kind} onChange={recurrence.setKind} />
        <SegmentedControl
          options={frequencyOptions}
          selectedValue={state.draft.frequency}
          onChange={recurrence.setFrequency}
        />
        <SegmentedControl
          options={priorityOptions}
          selectedValue={state.draft.priority}
          onChange={recurrence.setPriority}
        />

        <TextField
          errorText={state.fieldErrors.title}
          label="Recurring title"
          onChangeText={(value) => recurrence.updateField('title', value)}
          value={state.draft.title}
        />

        <TextField
          autoCapitalize="none"
          errorText={state.fieldErrors.startsOnLocalDate}
          helperText="Use YYYY-MM-DD."
          label="Starts on"
          onChangeText={(value) => recurrence.updateField('startsOnLocalDate', value)}
          value={state.draft.startsOnLocalDate}
        />

        <TextField
          autoCapitalize="none"
          errorText={state.fieldErrors.endsOnLocalDate}
          helperText="Optional. Use YYYY-MM-DD."
          label="Ends on"
          onChangeText={(value) => recurrence.updateField('endsOnLocalDate', value)}
          value={state.draft.endsOnLocalDate}
        />

        <TextField
          errorText={state.fieldErrors.notes}
          helperText="Optional note, kept local."
          label="Recurring notes"
          multiline
          onChangeText={(value) => recurrence.updateField('notes', value)}
          value={state.draft.notes}
        />

        <View style={styles.optionGroup}>
          <Text style={styles.label}>Recurring category</Text>
          <ListRow
            title="No category"
            description="Optional for quick setup."
            meta={state.draft.categoryId === null ? 'Selected' : 'Available'}
            onPress={() => recurrence.selectCategory(null)}
          />
          {state.categories.map((category) => (
            <ListRow
              key={category.id}
              title={category.name}
              meta={state.draft.categoryId === category.id ? 'Selected' : 'Available'}
              onPress={() => recurrence.selectCategory(category.id)}
            />
          ))}
          {state.fieldErrors.categoryId ? <Text style={styles.error}>{state.fieldErrors.categoryId}</Text> : null}
        </View>

        <View style={styles.optionGroup}>
          <Text style={styles.label}>Recurring topics</Text>
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
                onPress={() => recurrence.toggleTopic(topic.id)}
              />
            );
          })}
          {state.fieldErrors.topicIds ? <Text style={styles.error}>{state.fieldErrors.topicIds}</Text> : null}
        </View>

        <Button
          disabled={saving}
          label={saving ? 'Saving' : isEditing ? 'Save recurring changes' : 'Save recurring item'}
          onPress={recurrence.save}
        />

        {isEditing ? (
          <Button disabled={saving} label="Cancel recurring edit" onPress={recurrence.cancelEdit} variant="secondary" />
        ) : null}
      </View>

      {state.rules.length === 0 ? (
        <StatusBanner
          title="No recurring tasks yet"
          description="Save a recurring task or habit above when a routine should repeat."
        />
      ) : null}

      <View style={styles.listGroup}>
        {state.rules.map((view) => {
          const rule = view.rule;
          const paused = rule.pausedAt !== null;
          const stopped = rule.stoppedAt !== null;
          const status = paused
            ? 'Paused'
            : stopped
              ? 'Series stopped'
              : view.occurrences.length > 0
                ? `Next: ${view.occurrences.map((occurrence) => `${occurrence.localDate} ${formatOccurrenceState(occurrence)}`).join(', ')}`
                : 'No upcoming occurrences';

          return (
            <View key={rule.id} style={styles.ruleBlock}>
              <ListRow
                title={rule.title}
                description={rule.notes ?? undefined}
                meta={`${formatKind(rule.kind)} - ${formatFrequency(rule.frequency)} from ${rule.startsOnLocalDate}${
                  rule.endsOnLocalDate ? ` until ${rule.endsOnLocalDate}` : ''
                } - ${status}`}
                onPress={() => recurrence.startEdit(view)}
              />
              <View style={styles.ruleActions}>
                <Button
                  disabled={saving || stopped}
                  label={paused ? 'Resume' : 'Pause'}
                  onPress={() => (paused ? recurrence.resumeRule(rule.id) : recurrence.pauseRule(rule.id))}
                  variant="secondary"
                />
                <Button
                  disabled={saving || paused || stopped}
                  label="Skip next"
                  onPress={() => recurrence.skipNextOccurrence(rule.id)}
                  variant="secondary"
                />
                <Button
                  disabled={saving || stopped}
                  label="Stop series"
                  onPress={() => recurrence.stopRule(rule.id)}
                  variant="secondary"
                />
                <Button
                  disabled={saving}
                  label="Delete series"
                  onPress={() => recurrence.deleteRule(rule.id)}
                  variant="danger"
                />
              </View>
              <View style={styles.occurrenceGroup}>
                {view.occurrences.map((occurrence) => (
                  <ListRow
                    key={`${rule.id}-${occurrence.localDate}`}
                    title={occurrence.localDate}
                    meta={formatOccurrenceState(occurrence)}
                    onPress={
                      occurrence.state === 'open'
                        ? () => recurrence.completeOccurrence(rule.id, occurrence.localDate)
                        : occurrence.state === 'completed'
                          ? () => recurrence.undoCompletion(rule.id, occurrence.localDate)
                          : undefined
                    }
                  />
                ))}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
  occurrenceGroup: {
    gap: spacing.xs,
    paddingBottom: spacing.sm,
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
  section: {
    gap: spacing.md,
  },
  sectionTitle: {
    ...typography.sectionTitle,
    color: colors.ink,
  },
});
