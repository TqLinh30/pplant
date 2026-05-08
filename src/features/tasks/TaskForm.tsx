import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import type { TaskPriority, TaskState } from '@/domain/tasks/types';
import { Button } from '@/ui/primitives/Button';
import { ListRow } from '@/ui/primitives/ListRow';
import { SegmentedControl } from '@/ui/primitives/SegmentedControl';
import { StatusBanner } from '@/ui/primitives/StatusBanner';
import { TextField } from '@/ui/primitives/TextField';
import { colors } from '@/ui/tokens/colors';
import { spacing } from '@/ui/tokens/spacing';
import { typography } from '@/ui/tokens/typography';
import { parseCaptureDraftResumeParam } from '@/features/capture-drafts/capture-draft-recovery';
import { parseTaskCaptureDraftPayload } from '@/features/capture-drafts/captureDraftPayloads';
import { getActiveCaptureDraft } from '@/services/capture-drafts/capture-draft.service';

import { ReminderForm } from '../reminders/ReminderForm';
import { isRecoveryHandoffForTarget, useRecoveryHandoff } from '../recovery/recovery-handoff';
import { createDefaultTaskCaptureDraft, useTaskCapture } from './useTaskCapture';
import { TaskRecurrenceForm } from './TaskRecurrenceForm';

const stateOptions: { label: string; value: TaskState }[] = [
  { label: 'To Do', value: 'todo' },
  { label: 'Doing', value: 'doing' },
  { label: 'Done', value: 'done' },
];

const priorityOptions: { label: string; value: TaskPriority }[] = [
  { label: 'High', value: 'high' },
  { label: 'Low', value: 'low' },
];

function formatTaskState(state: TaskState): string {
  switch (state) {
    case 'doing':
      return 'Doing';
    case 'done':
      return 'Done';
    case 'todo':
    default:
      return 'To Do';
  }
}

export function TaskForm() {
  const tasks = useTaskCapture();
  const { state } = tasks;
  const startEdit = tasks.startEdit;
  const { consumeHandoff, handoff } = useRecoveryHandoff();
  const { draft, draftSeq } = useLocalSearchParams();
  const appliedDraft = useRef<string | null>(null);
  const resumeDraftKind = parseCaptureDraftResumeParam(
    typeof draft === 'string' || Array.isArray(draft) ? draft : undefined,
  );
  const draftSequence = Array.isArray(draftSeq) ? draftSeq[0] : draftSeq;
  const saving = state.status === 'saving';
  const isEditing = state.editingTaskId !== null;

  useEffect(() => {
    if (!handoff) {
      return;
    }

    const task = state.recentTasks.find((item) =>
      isRecoveryHandoffForTarget(handoff, 'task', item.id, ['edit']),
    );

    if (!task) {
      return;
    }

    startEdit(task);
    consumeHandoff(handoff.sequence);
  }, [consumeHandoff, handoff, startEdit, state.recentTasks]);

  useEffect(() => {
    if (resumeDraftKind !== 'task') {
      return;
    }

    const handoffKey = draftSequence ? `${resumeDraftKind}:${draftSequence}` : resumeDraftKind;

    if (appliedDraft.current === handoffKey) {
      return;
    }

    appliedDraft.current = handoffKey;
    void getActiveCaptureDraft('task').then((result) => {
      if (!result.ok || !result.value) {
        return;
      }

      tasks.applyDraft(parseTaskCaptureDraftPayload(result.value.payload, createDefaultTaskCaptureDraft()));
    });
  }, [draftSequence, resumeDraftKind, tasks]);

  if (state.status === 'loading') {
    return (
      <View accessibilityLabel="Loading tasks" accessibilityRole="summary" style={styles.inlineLoading}>
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.helper}>Loading tasks.</Text>
      </View>
    );
  }

  if (state.status === 'failed') {
    return (
      <View style={styles.section}>
        <StatusBanner
          title="Tasks could not load"
          description="Your local data is unchanged. Try loading tasks again."
          tone="warning"
        />
        <Button label="Retry tasks" onPress={tasks.reload} variant="secondary" />
      </View>
    );
  }

  const savedDescription =
    state.lastMutation === 'deleted' && state.deletedTask
      ? `${state.deletedTask.title} is no longer shown in active tasks.`
      : state.savedTask
        ? `${state.savedTask.title} is saved as ${formatTaskState(state.savedTask.state)}.`
        : '';

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>Daily tasks</Text>
        <Text style={styles.description}>Plan school and personal work with simple state, priority, and deadline context.</Text>
      </View>

      {(state.status === 'saved' || state.status === 'deleted') && savedDescription ? (
        <StatusBanner title={state.lastMutation === 'deleted' ? 'Task removed' : 'Task saved'} description={savedDescription} />
      ) : null}

      {state.actionError ? (
        <StatusBanner
          title="Task action did not finish"
          description="Try again. Current edits are still on screen."
          tone="warning"
        />
      ) : null}

      {Object.keys(state.fieldErrors).length > 0 ? (
        <StatusBanner title="Check task fields" description="Each highlighted field includes the next correction to make." tone="warning" />
      ) : null}

      <View style={styles.summaryRow}>
        <Text style={styles.summaryText}>{state.summary.openCount} open</Text>
        <Text style={styles.summaryText}>{state.summary.doingCount} doing</Text>
        <Text style={styles.summaryText}>{state.summary.doneCount} done</Text>
        <Text style={styles.summaryText}>{state.summary.overdueOpenCount} overdue</Text>
      </View>

      <View style={styles.form}>
        <SegmentedControl options={stateOptions} selectedValue={state.draft.state} onChange={tasks.setState} />
        <SegmentedControl options={priorityOptions} selectedValue={state.draft.priority} onChange={tasks.setPriority} />

        <TextField
          errorText={state.fieldErrors.title}
          label="Task title"
          onChangeText={(value) => tasks.updateField('title', value)}
          value={state.draft.title}
        />

        <TextField
          autoCapitalize="none"
          errorText={state.fieldErrors.deadlineLocalDate}
          helperText="Optional. Use YYYY-MM-DD."
          label="Deadline"
          onChangeText={(value) => tasks.updateField('deadlineLocalDate', value)}
          value={state.draft.deadlineLocalDate}
        />

        <TextField
          errorText={state.fieldErrors.notes}
          helperText="Optional note, kept local."
          label="Notes"
          multiline
          onChangeText={(value) => tasks.updateField('notes', value)}
          value={state.draft.notes}
        />

        <View style={styles.optionGroup}>
          <Text style={styles.label}>Task category</Text>
          <ListRow
            title="No category"
            description="Optional for quick planning."
            meta={state.draft.categoryId === null ? 'Selected' : 'Available'}
            onPress={() => tasks.selectCategory(null)}
          />
          {state.categories.map((category) => (
            <ListRow
              key={category.id}
              title={category.name}
              meta={state.draft.categoryId === category.id ? 'Selected' : 'Available'}
              onPress={() => tasks.selectCategory(category.id)}
            />
          ))}
          {state.fieldErrors.categoryId ? <Text style={styles.error}>{state.fieldErrors.categoryId}</Text> : null}
        </View>

        <View style={styles.optionGroup}>
          <Text style={styles.label}>Task topics</Text>
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
                onPress={() => tasks.toggleTopic(topic.id)}
              />
            );
          })}
          {state.fieldErrors.topicIds ? <Text style={styles.error}>{state.fieldErrors.topicIds}</Text> : null}
        </View>

        <Button disabled={saving} label={saving ? 'Saving' : isEditing ? 'Save task changes' : 'Save task'} onPress={tasks.save} />

        {isEditing ? (
          <View style={styles.buttonRow}>
            <Button disabled={saving} label="Cancel task edit" onPress={tasks.cancelEdit} variant="secondary" />
            <Button disabled={saving} label="Remove from active tasks" onPress={tasks.deleteEditingTask} variant="danger" />
          </View>
        ) : null}
      </View>

      <View style={styles.section}>
        <View style={styles.header}>
          <Text style={styles.subsectionTitle}>Recent tasks</Text>
          <Text style={styles.description}>Tap a saved task to edit its title, state, priority, deadline, or notes.</Text>
        </View>

        {state.recentTasks.length === 0 ? (
          <StatusBanner title="No tasks yet" description="Save a daily task above when there is something to plan." />
        ) : null}

        <View style={styles.listGroup}>
          {state.recentTasks.map((task) => (
            <ListRow
              key={task.id}
              title={task.title}
              description={task.notes ?? undefined}
              meta={`${formatTaskState(task.state)} - ${task.priority === 'high' ? 'High' : 'Low'} priority${
                task.deadlineLocalDate ? ` - Due ${task.deadlineLocalDate}` : ''
              }`}
              onPress={() => tasks.startEdit(task)}
            />
          ))}
        </View>
      </View>

      <View style={styles.divider} />

      <TaskRecurrenceForm />

      <View style={styles.divider} />

      <ReminderForm />
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
  divider: {
    backgroundColor: colors.hairline,
    height: StyleSheet.hairlineWidth,
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
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  summaryText: {
    ...typography.caption,
    color: colors.body,
  },
});
