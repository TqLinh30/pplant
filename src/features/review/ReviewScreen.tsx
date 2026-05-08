import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { formatMinorUnitsForInput } from '@/domain/common/money';
import type {
  EndOfDayActivityItem,
  EndOfDayReviewSummary,
  EndOfDayTaskItem,
  EndOfDayTaskItemStatus,
} from '@/domain/summaries/end-of-day-review';
import type { EndOfDayReviewData } from '@/services/summaries/end-of-day-review.service';
import { Button } from '@/ui/primitives/Button';
import { ListRow } from '@/ui/primitives/ListRow';
import { StatusBanner } from '@/ui/primitives/StatusBanner';
import { colors } from '@/ui/tokens/colors';
import { radius } from '@/ui/tokens/radius';
import { spacing } from '@/ui/tokens/spacing';
import { typography } from '@/ui/tokens/typography';

import { routeForEndOfDayReviewEdit } from './end-of-day-review-routes';
import { useEndOfDayReview } from './useEndOfDayReview';

function formatAmount(data: EndOfDayReviewData, amountMinor: number): string {
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
        <Text style={styles.sectionTitle}>{title}</Text>
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

export function ReviewScreen() {
  const review = useEndOfDayReview();
  const { state } = review;
  const saving = state.status === 'saving';

  if (state.status === 'loading' && !state.data) {
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

  if (state.status === 'failed') {
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

  if (state.status === 'preferences_needed') {
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
          <Text style={styles.eyebrow}>End of day</Text>
          <Text style={styles.title}>{summary.localDate}</Text>
          <Text style={styles.description}>
            A neutral look at what is recorded for today across money, tasks, reminders, and work.
          </Text>
        </View>

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
    paddingBottom: spacing.xxl,
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
    backgroundColor: colors.canvas,
    borderColor: colors.hairline,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
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
  rowActions: {
    gap: spacing.xs,
  },
  safeArea: {
    backgroundColor: colors.canvas,
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
