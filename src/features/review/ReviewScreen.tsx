import { router } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { formatMinorUnitsForInput } from '@/domain/common/money';
import { filterReflectionRelationshipsForPreferences } from '@/domain/reflections/insight-preferences';
import { reflectionPeriodFromSummaryPeriod } from '@/domain/reflections/schemas';
import type {
  Reflection,
  ReflectionPeriod,
  ReflectionPrompt,
  ReflectionPromptId,
} from '@/domain/reflections/types';
import type {
  EndOfDayActivityItem,
  EndOfDayReviewSummary,
  EndOfDayTaskItem,
  EndOfDayTaskItemStatus,
} from '@/domain/summaries/end-of-day-review';
import {
  buildReflectionRelationships,
  type ReflectionRelationship,
  type ReflectionRelationshipValue,
} from '@/domain/summaries/reflection-relationships';
import type { EndOfDayReviewData } from '@/services/summaries/end-of-day-review.service';
import type { PeriodReviewData } from '@/services/summaries/period-review.service';
import { Button } from '@/ui/primitives/Button';
import { ListRow } from '@/ui/primitives/ListRow';
import { SegmentedControl } from '@/ui/primitives/SegmentedControl';
import { StatusBanner } from '@/ui/primitives/StatusBanner';
import { TextField } from '@/ui/primitives/TextField';
import { colors } from '@/ui/tokens/colors';
import { radius } from '@/ui/tokens/radius';
import { spacing } from '@/ui/tokens/spacing';
import { typography } from '@/ui/tokens/typography';

import { routeForEndOfDayReviewEdit } from './end-of-day-review-routes';
import {
  reviewHistoryRowAccessibilityLabel,
  reviewModeOptionAccessibilityLabel,
} from './review-accessibility';
import { useEndOfDayReview } from './useEndOfDayReview';
import { usePeriodReviewSummary, type PeriodReviewState } from './usePeriodReviewSummary';
import {
  useReflectionHistory,
  type ReflectionHistoryState,
} from './useReflectionHistory';
import {
  useReflectionPrompts,
  type ReflectionPromptState,
} from './useReflectionPrompts';

type ReviewMode = 'day' | 'month' | 'week';
type ReviewCurrencyData = Pick<EndOfDayReviewData | PeriodReviewData, 'preferences'>;

function formatAmount(data: ReviewCurrencyData, amountMinor: number): string {
  const sign = amountMinor < 0 ? '-' : '';
  const formatted = formatMinorUnitsForInput(Math.abs(amountMinor), data.preferences.currencyCode, {
    locale: data.preferences.locale,
  });

  return `${sign}${formatted.ok ? formatted.value : amountMinor} ${data.preferences.currencyCode}`;
}

function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;

  if (hours === 0) {
    return `${remainder} min`;
  }

  if (remainder === 0) {
    return `${hours} hr`;
  }

  return `${hours} hr ${remainder} min`;
}

function taskStatusLabel(status: EndOfDayTaskItemStatus): string {
  switch (status) {
    case 'completed_today':
      return 'Completed today';
    case 'due_today':
      return 'Due today';
    case 'overdue':
      return 'Ready to review';
    case 'open':
    default:
      return 'Open';
  }
}

function activityTitle(activity: EndOfDayActivityItem, data: EndOfDayReviewData): string {
  if ((activity.kind === 'money' || activity.kind === 'work') && typeof activity.amountMinor === 'number') {
    return `${activity.title} - ${formatAmount(data, activity.amountMinor)}`;
  }

  return activity.title;
}

function goToSettings() {
  router.push('/(tabs)/settings');
}

function editRoute(kind: 'money' | 'reminder' | 'task' | 'work', id: string) {
  router.push(routeForEndOfDayReviewEdit(kind, id, { sequence: Date.now().toString(36) }));
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function Section({
  action,
  children,
  title,
}: {
  action?: ReactNode;
  children: ReactNode;
  title: string;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text accessibilityRole="header" style={styles.sectionTitle}>
          {title}
        </Text>
        {action}
      </View>
      {children}
    </View>
  );
}

function MoneySection({ data, summary }: { data: EndOfDayReviewData; summary: EndOfDayReviewSummary }) {
  return (
    <Section title="Money Today">
      <View style={styles.metricRow}>
        <Metric label="Income" value={formatAmount(data, summary.money.incomeAmountMinor)} />
        <Metric label="Spent" value={formatAmount(data, summary.money.expenseAmountMinor)} />
        <Metric label="Net" value={formatAmount(data, summary.money.netAmountMinor)} />
      </View>

      {summary.partial.money ? (
        <StatusBanner
          title="No spending or income logged today"
          description="This section will fill in when money records are saved for this date."
        />
      ) : (
        <View style={styles.listGroup}>
          {summary.money.records.map((record) => (
            <ListRow
              key={record.id}
              title={record.merchantOrSource ?? (record.kind === 'expense' ? 'Expense' : 'Income')}
              description={record.kind === 'expense' ? 'Expense' : 'Income'}
              meta={formatAmount(data, record.amountMinor)}
              right={
                <Button
                  accessibilityLabel={`Adjust ${record.kind} record`}
                  label="Adjust"
                  onPress={() => editRoute('money', record.id)}
                  variant="secondary"
                />
              }
            />
          ))}
        </View>
      )}
    </Section>
  );
}

function TaskAction({
  disabled,
  onComplete,
  task,
}: {
  disabled: boolean;
  onComplete: (taskId: string) => void;
  task: EndOfDayTaskItem;
}) {
  if (task.state === 'done') {
    return (
      <Button
        accessibilityLabel="Adjust completed task"
        label="Adjust"
        onPress={() => editRoute('task', task.id)}
        variant="secondary"
      />
    );
  }

  return (
    <View style={styles.rowActions}>
      <Button
        accessibilityLabel={`Mark ${task.title} done`}
        disabled={disabled}
        label="Done"
        onPress={() => onComplete(task.id)}
        variant="secondary"
      />
      <Button
        accessibilityLabel={`Adjust ${task.title}`}
        label="Adjust"
        onPress={() => editRoute('task', task.id)}
        variant="secondary"
      />
    </View>
  );
}

function TasksSection({
  onCompleteTask,
  saving,
  summary,
}: {
  onCompleteTask: (taskId: string) => void;
  saving: boolean;
  summary: EndOfDayReviewSummary;
}) {
  return (
    <Section title="Tasks and Habits">
      <View style={styles.metricRow}>
        <Metric label="Done" value={`${summary.tasks.completedTodayCount}`} />
        <Metric label="Open" value={`${summary.tasks.openRelevantCount}`} />
        <Metric label="Routines" value={`${summary.tasks.recurringOpenTodayCount + summary.tasks.recurringCompletedTodayCount}`} />
      </View>

      {summary.partial.tasks ? (
        <StatusBanner
          title="No task activity to review"
          description="Tasks and habits will appear here when they are due, open, or completed today."
        />
      ) : null}

      {summary.tasks.items.length > 0 ? (
        <View style={styles.listGroup}>
          {summary.tasks.items.map((task) => (
            <ListRow
              key={task.id}
              title={task.title}
              description={`${taskStatusLabel(task.status)} - ${task.priority} priority`}
              meta={task.deadlineLocalDate ?? 'No deadline'}
              right={<TaskAction disabled={saving} onComplete={onCompleteTask} task={task} />}
            />
          ))}
        </View>
      ) : null}

      {summary.tasks.recurringItems.length > 0 ? (
        <View style={styles.listGroup}>
          {summary.tasks.recurringItems.map((item) => (
            <ListRow
              key={`${item.id}-${item.state}`}
              title={item.title}
              description={item.kind === 'habit' ? 'Habit occurrence' : 'Recurring task occurrence'}
              meta={item.state.replace(/_/g, ' ')}
              right={
                <Button
                  accessibilityLabel={`Adjust recurring item ${item.title}`}
                  label="Adjust"
                  onPress={() => editRoute('task', item.id)}
                  variant="secondary"
                />
              }
            />
          ))}
        </View>
      ) : null}
    </Section>
  );
}

function RemindersSection({ summary }: { summary: EndOfDayReviewSummary }) {
  return (
    <Section title="Reminders">
      <View style={styles.metricRow}>
        <Metric label="Today" value={`${summary.reminders.todayOccurrenceCount}`} />
        <Metric label="Review" value={`${summary.reminders.needsReviewCount}`} />
        <Metric label="Listed" value={`${summary.reminders.totalCount}`} />
      </View>

      {summary.partial.reminders ? (
        <StatusBanner
          title="No reminder needs review"
          description="Reminder timing, missed items, and local-only states will appear here when present."
        />
      ) : null}

      {summary.reminders.items.length > 0 ? (
        <View style={styles.listGroup}>
          {summary.reminders.items.map((reminder) => (
            <ListRow
              key={reminder.id}
              title={reminder.title}
              description={`${reminder.todayOccurrenceCount} occurrence${
                reminder.todayOccurrenceCount === 1 ? '' : 's'
              } today`}
              meta={reminder.scheduleState.replace(/_/g, ' ')}
              right={
                <Button
                  accessibilityLabel={`Adjust reminder ${reminder.title}`}
                  label="Adjust"
                  onPress={() => editRoute('reminder', reminder.id)}
                  variant="secondary"
                />
              }
            />
          ))}
        </View>
      ) : null}

      {summary.reminders.recoveryItems.length > 0 ? (
        <View style={styles.listGroup}>
          {summary.reminders.recoveryItems.map((item) => (
            <ListRow
              key={`${item.targetKind}-${item.targetId}-${item.occurrenceLocalDate ?? 'state'}`}
              title={item.title}
              description={item.reason.replace(/_/g, ' ')}
              meta="Recovery"
            />
          ))}
        </View>
      ) : null}
    </Section>
  );
}

function WorkSection({ data, summary }: { data: EndOfDayReviewData; summary: EndOfDayReviewSummary }) {
  return (
    <Section title="Work Context">
      {summary.partial.work ? (
        <StatusBanner
          title="No work logged today"
          description="Work entries will appear here when hours or shifts are saved for this date."
        />
      ) : (
        <>
          <View style={styles.metricRow}>
            <Metric label="Time" value={formatMinutes(summary.work.totalDurationMinutes)} />
            <Metric label="Earned" value={formatAmount(data, summary.work.earnedIncomeMinor)} />
            <Metric label="Unpaid" value={`${summary.work.unpaidEntryCount}`} />
          </View>
          <View style={styles.listGroup}>
            {summary.work.entries.map((entry) => (
              <ListRow
                key={entry.id}
                title={entry.note ?? (entry.entryMode === 'hours' ? 'Direct hours' : 'Shift')}
                description={formatMinutes(entry.durationMinutes)}
                meta={entry.paid ? 'Paid' : 'Unpaid'}
                right={
                  <Button
                    accessibilityLabel="Adjust work entry"
                    label="Adjust"
                    onPress={() => editRoute('work', entry.id)}
                    variant="secondary"
                  />
                }
              />
            ))}
          </View>
        </>
      )}
    </Section>
  );
}

function ActivitySection({ data, summary }: { data: EndOfDayReviewData; summary: EndOfDayReviewSummary }) {
  return (
    <Section title="Activity">
      {summary.activity.length === 0 ? (
        <StatusBanner
          title="No activity list yet"
          description="The review can still be useful with partial data; nothing here means there is nothing recorded for this day."
        />
      ) : (
        <View style={styles.listGroup}>
          {summary.activity.map((activity) => (
            <ListRow
              key={`${activity.kind}-${activity.id}`}
              title={activityTitle(activity, data)}
              description={activity.kind.replace(/_/g, ' ')}
              meta={activity.occurredAt}
            />
          ))}
        </View>
      )}
    </Section>
  );
}

function ReviewModeControl({
  mode,
  onChange,
}: {
  mode: ReviewMode;
  onChange: (mode: ReviewMode) => void;
}) {
  return (
    <SegmentedControl
      accessibilityLabel="Choose review period"
      getOptionAccessibilityLabel={(option, selected) =>
        reviewModeOptionAccessibilityLabel(option.label, selected)
      }
      options={[
        { label: 'Day', value: 'day' },
        { label: 'Week', value: 'week' },
        { label: 'Month', value: 'month' },
      ]}
      selectedValue={mode}
      onChange={onChange}
    />
  );
}

function PeriodMoneySection({ data }: { data: PeriodReviewData }) {
  const { summary } = data;

  return (
    <Section title="Money This Period">
      <View style={styles.metricRow}>
        <Metric label="Income" value={formatAmount(data, summary.money.incomeAmountMinor)} />
        <Metric label="Spent" value={formatAmount(data, summary.money.expenseAmountMinor)} />
        <Metric label="Net" value={formatAmount(data, summary.money.netAmountMinor)} />
      </View>
      {summary.partial.money ? (
        <StatusBanner
          title="No spending or income in this period"
          description="This summary is calculated from saved local money records."
        />
      ) : (
        <Text style={styles.sectionNote}>{summary.money.recordCount} money record(s) included.</Text>
      )}
    </Section>
  );
}

function PeriodBudgetSavingsSection({ data }: { data: PeriodReviewData }) {
  const { summary } = data;
  const reachedSavings = summary.savings.filter((goal) => goal.targetReached).length;
  const remainingSavingsMinor = summary.savings.reduce((total, goal) => total + goal.remainingMinor, 0);
  const remainingBudget = summary.budget.budgetStatus
    ? formatAmount(data, summary.budget.budgetStatus.remainingMinor)
    : 'Not set';

  return (
    <Section title="Budget and Savings">
      <View style={styles.metricRow}>
        <Metric label="Budget left" value={remainingBudget} />
        <Metric label="Goals" value={`${summary.savings.length}`} />
        <Metric label="Reached" value={`${reachedSavings}`} />
      </View>
      {summary.partial.budget && summary.partial.savings ? (
        <StatusBanner
          title="No budget or savings setup yet"
          description="Budget and savings summaries appear after those settings are saved."
        />
      ) : (
        <Text style={styles.sectionNote}>
          Savings remaining: {formatAmount(data, remainingSavingsMinor)}
        </Text>
      )}
    </Section>
  );
}

function PeriodWorkSection({ data }: { data: PeriodReviewData }) {
  const { summary } = data;

  return (
    <Section title="Work This Period">
      <View style={styles.metricRow}>
        <Metric label="Time" value={formatMinutes(summary.work.totalDurationMinutes)} />
        <Metric label="Earned" value={formatAmount(data, summary.work.earnedIncomeMinor)} />
        <Metric label="Entries" value={`${summary.work.entryCount}`} />
      </View>
      {summary.partial.work ? (
        <StatusBanner
          title="No work logged in this period"
          description="Work time and earned income will appear here when entries are saved."
        />
      ) : (
        <Text style={styles.sectionNote}>
          {summary.work.paidEntryCount} paid and {summary.work.unpaidEntryCount} unpaid work entry(s).
        </Text>
      )}
    </Section>
  );
}

function PeriodTasksSection({ data }: { data: PeriodReviewData }) {
  const { summary } = data;

  return (
    <Section title="Tasks and Habits This Period">
      <View style={styles.metricRow}>
        <Metric label="Done" value={`${summary.tasks.completedCount}`} />
        <Metric label="Open" value={`${summary.tasks.openCount}`} />
        <Metric label="Ready to review" value={`${summary.tasks.missedCount + summary.tasks.recoveryItemCount}`} />
      </View>
      {summary.partial.tasks ? (
        <StatusBanner
          title="No task activity in this period"
          description="Completed, open, and ready-to-review tasks will appear here when saved records exist."
        />
      ) : (
        <Text style={styles.sectionNote}>
          Includes {summary.tasks.recurringTotalCount} recurring task or habit occurrence(s).
        </Text>
      )}
    </Section>
  );
}

function PeriodRemindersSection({ data }: { data: PeriodReviewData }) {
  const { summary } = data;

  return (
    <Section title="Reminders This Period">
      <View style={styles.metricRow}>
        <Metric label="Occurrences" value={`${summary.reminders.totalOccurrenceCount}`} />
        <Metric label="Open" value={`${summary.reminders.openOccurrenceCount}`} />
        <Metric
          label="Review"
          value={`${summary.reminders.missedOrRecoveryCount + summary.reminders.disabledOrUnavailableCount}`}
        />
      </View>
      {summary.partial.reminders ? (
        <StatusBanner
          title="No reminder activity in this period"
          description="Scheduled and ready-to-review reminder states will appear here when present."
        />
      ) : (
        <Text style={styles.sectionNote}>
          {summary.reminders.skippedOccurrenceCount} skipped reminder occurrence(s) recorded.
        </Text>
      )}
    </Section>
  );
}

function relationshipValueText(data: PeriodReviewData, value: ReflectionRelationshipValue): string {
  switch (value.kind) {
    case 'amount':
      return formatAmount(data, value.amountMinor);
    case 'count':
      return `${value.count}`;
    case 'duration':
      return formatMinutes(value.minutes);
    case 'text':
    default:
      return value.text;
  }
}

function relationshipDescription(data: PeriodReviewData, relationship: ReflectionRelationship): string {
  if (relationship.state === 'partial') {
    return relationship.missingReason ?? 'Not enough saved records for this pair yet.';
  }

  return `${relationship.primary.label}: ${relationshipValueText(data, relationship.primary)}; ${
    relationship.secondary.label
  }: ${relationshipValueText(data, relationship.secondary)}`;
}

function PeriodRelationshipsSection({
  data,
  onDismiss,
  onMute,
  relationships,
  savingInsightId,
}: {
  data: PeriodReviewData;
  onDismiss: (insightId: ReflectionRelationship['id']) => void;
  onMute: (insightId: ReflectionRelationship['id']) => void;
  relationships: ReflectionRelationship[];
  savingInsightId: ReflectionRelationship['id'] | null;
}) {
  return (
    <Section title="Reflection Pairs">
      {relationships.length === 0 ? (
        <StatusBanner
          title="Reflection pairs hidden"
          description="Dismissed pairs stay hidden for this period. Muted pairs stay hidden in future reviews."
        />
      ) : (
        <View style={styles.listGroup}>
          {relationships.map((relationship) => (
            <ListRow
              key={relationship.id}
              title={relationship.title}
              description={relationshipDescription(data, relationship)}
              meta={relationship.state === 'ready' ? relationship.description : 'Partial data'}
              right={
                <View style={styles.rowActions}>
                  <Button
                    accessibilityLabel={`Dismiss ${relationship.title} for this period`}
                    disabled={savingInsightId !== null}
                    label="Dismiss"
                    onPress={() => onDismiss(relationship.id)}
                    variant="secondary"
                  />
                  <Button
                    accessibilityLabel={`Mute ${relationship.title} in future reviews`}
                    disabled={savingInsightId !== null}
                    label={savingInsightId === relationship.id ? 'Saving' : 'Mute'}
                    onPress={() => onMute(relationship.id)}
                    variant="secondary"
                  />
                </View>
              }
            />
          ))}
        </View>
      )}
    </Section>
  );
}

function reflectionForPrompt(
  reflections: Reflection[],
  promptId: ReflectionPromptId,
): Reflection | null {
  return reflections.find((reflection) => reflection.promptId === promptId) ?? null;
}

function ReflectionPromptItem({
  onSave,
  onSkip,
  prompt,
  reflection,
  savingPromptId,
}: {
  onSave: (prompt: ReflectionPrompt, responseText: string) => void;
  onSkip: (prompt: ReflectionPrompt) => void;
  prompt: ReflectionPrompt;
  reflection: Reflection | null;
  savingPromptId: ReflectionPromptId | null;
}) {
  const [responseText, setResponseText] = useState(reflection?.responseText ?? '');
  const isSaving = savingPromptId === prompt.id;
  const hasAnswer = responseText.trim().length > 0;
  const stateLabel =
    reflection?.state === 'answered' ? 'Saved' : reflection?.state === 'skipped' ? 'Skipped' : 'Ready when you are';

  useEffect(() => {
    setResponseText(reflection?.responseText ?? '');
  }, [prompt.id, reflection?.responseText]);

  return (
    <View style={styles.promptItem}>
      <View style={styles.promptHeader}>
        <Text style={styles.promptTitle}>{prompt.text}</Text>
        <Text style={styles.promptState}>{stateLabel}</Text>
      </View>
      <Text style={styles.sectionNote}>{prompt.helperText}</Text>
      <TextField
        label="Optional note"
        multiline
        onChangeText={setResponseText}
        placeholder="Write a short reflection"
        value={responseText}
      />
      <View style={styles.promptActions}>
        <Button
          accessibilityLabel={`Save reflection for ${prompt.text}`}
          disabled={!hasAnswer || savingPromptId !== null}
          label={reflection?.state === 'answered' ? 'Update' : 'Save'}
          onPress={() => onSave(prompt, responseText)}
          variant="secondary"
        />
        <Button
          accessibilityLabel={`Skip reflection for ${prompt.text}`}
          disabled={savingPromptId !== null}
          label={isSaving ? 'Saving' : 'Skip'}
          onPress={() => onSkip(prompt)}
          variant="secondary"
        />
      </View>
    </View>
  );
}

function ReflectionPromptsSection({
  onRetry,
  onSave,
  onSkip,
  state,
}: {
  onRetry: () => void;
  onSave: (prompt: ReflectionPrompt, responseText: string) => void;
  onSkip: (prompt: ReflectionPrompt) => void;
  state: ReflectionPromptState;
}) {
  return (
    <Section
      title="Reflection Prompts"
      action={state.status === 'failed' ? <Button label="Retry" onPress={onRetry} variant="secondary" /> : null}>
      {state.status === 'idle' || state.status === 'loading' ? (
        <StatusBanner title="Loading prompts" description="Saved prompt states are loading from local data." />
      ) : null}
      {state.status === 'failed' && state.actionError ? (
        <StatusBanner
          title="Reflection action did not finish"
          description="Your review can continue. Try saving or skipping the prompt again when ready."
          tone="warning"
        />
      ) : null}
      {state.prompts.length > 0 ? (
        <View style={styles.promptGroup}>
          {state.prompts.map((prompt) => (
            <ReflectionPromptItem
              key={prompt.id}
              onSave={onSave}
              onSkip={onSkip}
              prompt={prompt}
              reflection={reflectionForPrompt(state.reflections, prompt.id)}
              savingPromptId={state.savingPromptId}
            />
          ))}
        </View>
      ) : null}
    </Section>
  );
}

function periodHistoryLabel(period: ReflectionPeriod): string {
  return `${period.kind === 'week' ? 'Week' : 'Month'} ${period.startDate}`;
}

function ReflectionHistorySection({
  onRetry,
  state,
}: {
  onRetry: () => void;
  state: ReflectionHistoryState;
}) {
  return (
    <Section
      title="Past Reflections"
      action={state.status === 'failed' ? <Button label="Retry" onPress={onRetry} variant="secondary" /> : null}>
      {state.status === 'idle' || state.status === 'loading' ? (
        <StatusBanner title="Loading reflection history" description="Saved reflections are loading from local data." />
      ) : null}
      {state.status === 'failed' && state.actionError ? (
        <StatusBanner
          title="Reflection history did not update"
          description="Your saved records are unchanged. Try loading history again when ready."
          tone="warning"
        />
      ) : null}
      {state.status === 'ready' && state.history.length === 0 ? (
        <StatusBanner
          title="No saved reflections yet"
          description="Answered prompts will appear here by period. Skipped prompts stay out of history."
        />
      ) : null}
      {state.history.length > 0 ? (
        <View style={styles.listGroup}>
          {state.history.map((reflection) => (
            <ListRow
              key={reflection.id}
              accessibilityLabel={reviewHistoryRowAccessibilityLabel({
                periodLabel: periodHistoryLabel(reflection.period),
                promptText: reflection.promptText,
                responseText: reflection.responseText,
              })}
              title={periodHistoryLabel(reflection.period)}
              description={reflection.responseText ?? 'Saved reflection'}
              meta={reflection.promptText}
            />
          ))}
        </View>
      ) : null}
    </Section>
  );
}

function LoadedPeriodReviewContent({
  data,
  onRetry,
  status,
}: {
  data: PeriodReviewData;
  onRetry: () => void;
  status: PeriodReviewState['status'];
}) {
  const reflectionPrompts = useReflectionPrompts(data);
  const reflectionHistory = useReflectionHistory();
  const answeredReflectionCount = reflectionPrompts.state.reflections.filter(
    (reflection) => reflection.state === 'answered',
  ).length;
  const reflectionPeriod = reflectionPeriodFromSummaryPeriod({
    endDateExclusive: data.summary.period.endDateExclusive,
    kind: data.summary.period.kind,
    startDate: data.summary.period.startDate,
  });
  const relationships = filterReflectionRelationshipsForPreferences({
    period: reflectionPeriod,
    preferences: reflectionHistory.state.preferences,
    relationships: buildReflectionRelationships({
      reflectionCount: answeredReflectionCount,
      summary: data.summary,
    }),
  });

  return (
    <>
      {status === 'loading' ? (
        <StatusBanner title="Refreshing" description="The current summary stays visible while local data reloads." />
      ) : null}
      {status === 'empty' ? (
        <StatusBanner
          title="Nothing recorded in this period"
          description="That is only a data state. This summary will fill in when records are saved."
        />
      ) : null}
      <StatusBanner
        title="Summary calculated from local records"
        description={`${data.summary.period.label} uses the latest saved records and does not write back to them.`}
      />
      <PeriodMoneySection data={data} />
      <PeriodBudgetSavingsSection data={data} />
      <PeriodWorkSection data={data} />
      <PeriodTasksSection data={data} />
      <PeriodRemindersSection data={data} />
      {reflectionHistory.state.actionError ? (
        <StatusBanner
          title="Insight preference did not save"
          description="Your review can continue. Try dismissing or muting again when ready."
          tone="warning"
        />
      ) : null}
      <PeriodRelationshipsSection
        data={data}
        onDismiss={(insightId) =>
          reflectionHistory.saveInsightPreference({
            action: 'dismissed',
            insightId,
            period: reflectionPeriod,
          })
        }
        onMute={(insightId) =>
          reflectionHistory.saveInsightPreference({
            action: 'muted',
            insightId,
            period: reflectionPeriod,
          })
        }
        relationships={relationships}
        savingInsightId={reflectionHistory.state.savingInsightId}
      />
      <ReflectionPromptsSection
        onRetry={onRetry}
        onSave={reflectionPrompts.savePrompt}
        onSkip={reflectionPrompts.skipPrompt}
        state={reflectionPrompts.state}
      />
      <ReflectionHistorySection onRetry={reflectionHistory.reload} state={reflectionHistory.state} />
    </>
  );
}

function PeriodReviewContent({
  onRetry,
  state,
}: {
  onRetry: () => void;
  state: PeriodReviewState;
}) {
  if (state.status === 'loading' && !state.data) {
    return (
      <StatusBanner
        title="Loading period summary"
        description="Pplant is calculating this summary from local records."
      />
    );
  }

  if (state.status === 'failed') {
    return (
      <Section
        title="Summary"
        action={<Button label="Retry" onPress={onRetry} variant="secondary" />}>
        <StatusBanner
          title="Summary could not open"
          description="Your local data is unchanged. Try loading the summary again."
          tone="warning"
        />
      </Section>
    );
  }

  if (state.status === 'preferences_needed') {
    return (
      <Section
        title="Summary"
        action={<Button label="Open Settings" onPress={goToSettings} variant="secondary" />}>
        <StatusBanner
          title="Save preferences first"
          description="Weekly and monthly summaries use your currency, locale, reset day, and wage defaults."
        />
      </Section>
    );
  }

  if (!state.data) {
    return null;
  }

  return <LoadedPeriodReviewContent data={state.data} onRetry={onRetry} status={state.status} />;
}

export function ReviewScreen() {
  const review = useEndOfDayReview();
  const [mode, setMode] = useState<ReviewMode>('day');
  const periodReview = usePeriodReviewSummary(mode === 'day' ? null : mode);
  const { state } = review;
  const saving = state.status === 'saving';

  if (mode === 'day' && state.status === 'loading' && !state.data) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View accessibilityLabel="Loading end-of-day review" accessibilityRole="summary" style={styles.centered}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.title}>Loading Review</Text>
          <Text style={styles.description}>Pplant is gathering the local activity for today.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (mode === 'day' && state.status === 'failed') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View accessibilityLabel="End-of-day review could not be loaded" accessibilityRole="summary" style={styles.centered}>
          <Text style={styles.eyebrow}>Review</Text>
          <Text style={styles.title}>Review could not open.</Text>
          <Text style={styles.description}>Your local data is unchanged. Try loading the review again.</Text>
          <Button label="Retry" onPress={review.reload} variant="secondary" />
        </View>
      </SafeAreaView>
    );
  }

  if (mode === 'day' && state.status === 'preferences_needed') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View accessibilityLabel="Preferences needed" accessibilityRole="summary" style={styles.centered}>
          <Text style={styles.eyebrow}>Review</Text>
          <Text style={styles.title}>Save preferences first.</Text>
          <Text style={styles.description}>Review uses your currency, locale, reset day, and wage defaults.</Text>
          <Button label="Open Settings" onPress={goToSettings} variant="secondary" />
        </View>
      </SafeAreaView>
    );
  }

  const data = state.data;

  if (!data) {
    return null;
  }

  const summary = data.summary;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.eyebrow}>{mode === 'day' ? 'End of day' : 'Review summary'}</Text>
          <Text style={styles.title}>{mode === 'day' ? summary.localDate : mode === 'week' ? 'This week' : 'This month'}</Text>
          <Text style={styles.description}>
            A neutral look at what is recorded across money, tasks, reminders, budget, savings, and work.
          </Text>
        </View>

        <ReviewModeControl mode={mode} onChange={setMode} />

        {mode === 'day' ? (
          <>
            {state.status === 'empty' ? (
              <StatusBanner
                title="Nothing recorded for this day"
                description="That is only a data state. Capture something later if it helps the day make more sense."
              />
            ) : null}

            {state.status === 'loading' ? (
              <StatusBanner title="Refreshing" description="The current review stays visible while local data reloads." />
            ) : null}

            {state.status === 'saved' ? (
              <StatusBanner title="Task updated" description="The review refreshed from the saved task record." />
            ) : null}

            {state.actionError ? (
              <StatusBanner
                title="Action did not finish"
                description="Your local data is unchanged. Try the action again when ready."
                tone="warning"
              />
            ) : null}

            <MoneySection data={data} summary={summary} />
            <TasksSection onCompleteTask={review.markTaskDone} saving={saving} summary={summary} />
            <RemindersSection summary={summary} />
            <WorkSection data={data} summary={summary} />
            <ActivitySection data={data} summary={summary} />
          </>
        ) : (
          <PeriodReviewContent onRetry={periodReview.reload} state={periodReview.state} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  centered: {
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  content: {
    gap: spacing.lg,
    padding: spacing.lg,
    paddingBottom: spacing.xxl + spacing.xl,
  },
  description: {
    ...typography.body,
    color: colors.body,
  },
  eyebrow: {
    ...typography.caption,
    color: colors.muted,
    textTransform: 'uppercase',
  },
  header: {
    gap: spacing.xs,
  },
  listGroup: {
    gap: spacing.xs,
  },
  metric: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.md,
    flex: 1,
    gap: spacing.xxs,
    minHeight: 72,
    padding: spacing.md,
  },
  metricLabel: {
    ...typography.caption,
    color: colors.muted,
  },
  metricRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  metricValue: {
    ...typography.label,
    color: colors.ink,
  },
  promptActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  promptGroup: {
    backgroundColor: colors.canvas,
    borderColor: colors.hairline,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.md,
    padding: spacing.md,
  },
  promptHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  promptItem: {
    gap: spacing.sm,
  },
  promptState: {
    ...typography.caption,
    color: colors.muted,
  },
  promptTitle: {
    ...typography.label,
    color: colors.ink,
    flex: 1,
  },
  rowActions: {
    gap: spacing.xs,
  },
  safeArea: {
    backgroundColor: colors.appBackground,
    flex: 1,
  },
  section: {
    gap: spacing.md,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  sectionNote: {
    ...typography.body,
    color: colors.body,
  },
  sectionTitle: {
    ...typography.sectionTitle,
    color: colors.ink,
    flex: 1,
  },
  title: {
    ...typography.screenTitle,
    color: colors.ink,
  },
});
