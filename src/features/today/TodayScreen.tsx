import { router } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { formatMinorUnitsForInput } from '@/domain/common/money';
import type {
  TodayOverviewSummary,
  TodayRecentActivityItem,
  TodayTaskItemStatus,
} from '@/domain/summaries/today-summary';
import type { TodayOverviewData } from '@/services/summaries/today.service';
import { Button } from '@/ui/primitives/Button';
import { ListRow } from '@/ui/primitives/ListRow';
import { StatusBanner } from '@/ui/primitives/StatusBanner';
import { colors } from '@/ui/tokens/colors';
import { radius } from '@/ui/tokens/radius';
import { spacing } from '@/ui/tokens/spacing';
import { typography } from '@/ui/tokens/typography';

import { useTodayOverview } from './useTodayOverview';

function formatAmount(data: TodayOverviewData, amountMinor: number): string {
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

function taskStatusLabel(status: TodayTaskItemStatus): string {
  switch (status) {
    case 'due_today':
      return 'Due today';
    case 'overdue':
      return 'Past due';
    case 'open':
      return 'Open';
    default:
      return status;
  }
}

function activityTitle(activity: TodayRecentActivityItem, data: TodayOverviewData): string {
  if (activity.kind === 'money' && typeof activity.amountMinor === 'number') {
    return `${activity.title} - ${formatAmount(data, activity.amountMinor)}`;
  }

  if (activity.kind === 'work' && typeof activity.amountMinor === 'number') {
    return `${activity.title} - earned ${formatAmount(data, activity.amountMinor)}`;
  }

  return activity.title;
}

function goToCapture() {
  router.push('/(tabs)/capture');
}

function goToSettings() {
  router.push('/(tabs)/settings');
}

function OverviewMetric({ label, value }: { label: string; value: string }) {
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
  action?: React.ReactNode;
  children: React.ReactNode;
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

function MoneySection({ data, summary }: { data: TodayOverviewData; summary: TodayOverviewSummary }) {
  return (
    <Section title="Money and Budget" action={<Button label="Add" onPress={goToCapture} variant="secondary" />}>
      <View style={styles.metricRow}>
        <OverviewMetric label="Income" value={formatAmount(data, summary.money.incomeAmountMinor)} />
        <OverviewMetric label="Expense" value={formatAmount(data, summary.money.expenseAmountMinor)} />
        <OverviewMetric label="Net" value={formatAmount(data, summary.money.netAmountMinor)} />
      </View>

      {summary.budget.budgetStatus ? (
        <StatusBanner
          title={summary.budget.budgetStatus.isOverBudget ? 'Budget needs attention' : 'Budget on track'}
          description={`Remaining this period: ${formatAmount(data, summary.budget.budgetStatus.remainingMinor)}.`}
          tone={summary.budget.budgetStatus.isOverBudget ? 'warning' : 'success'}
        />
      ) : (
        <StatusBanner
          title="Budget not set"
          description="Set a monthly budget to see remaining money for the current reset period."
        />
      )}

      {summary.money.records.length === 0 ? (
        <StatusBanner
          title="No money records today"
          description="Add an expense, income, or recurring money item when something changes."
        />
      ) : (
        <View style={styles.listGroup}>
          {summary.money.records.map((record) => (
            <ListRow
              key={record.id}
              title={record.merchantOrSource ?? (record.kind === 'expense' ? 'Expense' : 'Income')}
              description={record.kind === 'expense' ? 'Expense' : 'Income'}
              meta={formatAmount(data, record.amountMinor)}
            />
          ))}
        </View>
      )}
    </Section>
  );
}

function SavingsSection({ data, summary }: { data: TodayOverviewData; summary: TodayOverviewSummary }) {
  return (
    <Section title="Savings" action={<Button label="Edit" onPress={goToSettings} variant="secondary" />}>
      {summary.savings.length === 0 ? (
        <StatusBanner
          title="No savings goal yet"
          description="Add a goal in Settings to track manual saved amount without changing money records."
        />
      ) : (
        <View style={styles.listGroup}>
          {summary.savings.map((goal) => (
            <ListRow
              key={goal.goalId}
              title={goal.name}
              description={`${Math.floor(goal.progressBasisPoints / 100)}% saved`}
              meta={`${formatAmount(data, goal.currentAmountMinor)} of ${formatAmount(data, goal.targetAmountMinor)}`}
            />
          ))}
        </View>
      )}
    </Section>
  );
}

function TaskReminderSection({ summary }: { summary: TodayOverviewSummary }) {
  return (
    <Section title="Tasks and Reminders" action={<Button label="Plan" onPress={goToCapture} variant="secondary" />}>
      <View style={styles.metricRow}>
        <OverviewMetric label="Open tasks" value={`${summary.tasks.summary.openCount}`} />
        <OverviewMetric label="Routines" value={`${summary.tasks.recurringOpenTodayCount}`} />
        <OverviewMetric label="Reminders" value={`${summary.reminders.todayOccurrenceCount}`} />
      </View>

      {summary.tasks.summary.overdueOpenCount > 0 || summary.reminders.needsAttentionCount > 0 ? (
        <StatusBanner
          title="Some items need a calm check"
          description={`${summary.tasks.summary.overdueOpenCount} past-due task${
            summary.tasks.summary.overdueOpenCount === 1 ? '' : 's'
          } and ${summary.reminders.needsAttentionCount} reminder item${
            summary.reminders.needsAttentionCount === 1 ? '' : 's'
          } need attention.`}
          tone="warning"
        />
      ) : null}

      {summary.tasks.items.length === 0 && summary.reminders.items.length === 0 ? (
        <StatusBanner
          title="No tasks or reminders"
          description="Capture a task, habit, or reminder when there is something concrete to return to."
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
            />
          ))}
        </View>
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
            />
          ))}
        </View>
      ) : null}

      {summary.recovery.items.length > 0 ? (
        <View style={styles.listGroup}>
          {summary.recovery.items.map((item) => (
            <ListRow
              key={`${item.targetKind}-${item.targetId}`}
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

function WorkSection({ data, summary }: { data: TodayOverviewData; summary: TodayOverviewSummary }) {
  return (
    <Section title="Work Context" action={<Button label="Log" onPress={goToCapture} variant="secondary" />}>
      {summary.work.entryCount === 0 ? (
        <StatusBanner
          title="No work logged today"
          description="Log work time to see earned income beside today’s spending."
        />
      ) : (
        <>
          <View style={styles.metricRow}>
            <OverviewMetric label="Time" value={formatMinutes(summary.work.totalDurationMinutes)} />
            <OverviewMetric label="Earned" value={formatAmount(data, summary.work.earnedIncomeMinor)} />
            <OverviewMetric label="Unpaid" value={`${summary.work.unpaidEntryCount}`} />
          </View>
          <View style={styles.listGroup}>
            {summary.work.entries.map((entry) => (
              <ListRow
                key={entry.id}
                title={entry.note ?? 'Work entry'}
                description={formatMinutes(entry.durationMinutes)}
                meta={entry.paid ? 'Paid' : 'Unpaid'}
              />
            ))}
          </View>
        </>
      )}
    </Section>
  );
}

function RecentActivitySection({ data, summary }: { data: TodayOverviewData; summary: TodayOverviewSummary }) {
  return (
    <Section title="Recent Activity">
      {summary.recentActivity.length === 0 ? (
        <StatusBanner title="No activity yet" description="Today will fill in as you capture money, work, and tasks." />
      ) : (
        <View style={styles.listGroup}>
          {summary.recentActivity.map((activity) => (
            <ListRow
              key={`${activity.kind}-${activity.id}`}
              title={activityTitle(activity, data)}
              description={activity.kind}
              meta={activity.occurredAt}
            />
          ))}
        </View>
      )}
    </Section>
  );
}

export function TodayScreen() {
  const overview = useTodayOverview();
  const { state } = overview;

  if (state.status === 'loading' && !state.data) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View accessibilityLabel="Loading today" accessibilityRole="summary" style={styles.centered}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.title}>Loading Today</Text>
          <Text style={styles.description}>Pplant is gathering your local overview.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (state.status === 'failed') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View accessibilityLabel="Today could not be loaded" accessibilityRole="summary" style={styles.centered}>
          <Text style={styles.eyebrow}>Today</Text>
          <Text style={styles.title}>Today could not open.</Text>
          <Text style={styles.description}>Your local data is unchanged. Try loading the overview again.</Text>
          <Button label="Retry" onPress={overview.reload} variant="secondary" />
        </View>
      </SafeAreaView>
    );
  }

  if (state.status === 'preferences_needed') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View accessibilityLabel="Preferences needed" accessibilityRole="summary" style={styles.centered}>
          <Text style={styles.eyebrow}>Today</Text>
          <Text style={styles.title}>Save preferences first.</Text>
          <Text style={styles.description}>Today needs your currency, locale, reset day, and wage defaults.</Text>
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
          <Text style={styles.eyebrow}>Today</Text>
          <Text style={styles.title}>{summary.localDate}</Text>
          <Text style={styles.description}>
            Budget period {summary.budgetPeriod.startDate} to {summary.budgetPeriod.endDateExclusive}.
          </Text>
        </View>

        {state.status === 'empty' ? (
          <StatusBanner
            title="Today is clear"
            description="Start with one money record, task, reminder, or work entry when the day gives you something concrete."
          />
        ) : null}

        {state.status === 'loading' ? (
          <StatusBanner title="Refreshing" description="The last overview stays visible while local data reloads." />
        ) : null}

        <MoneySection data={data} summary={summary} />
        <SavingsSection data={data} summary={summary} />
        <TaskReminderSection summary={summary} />
        <WorkSection data={data} summary={summary} />
        <RecentActivitySection data={data} summary={summary} />
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
