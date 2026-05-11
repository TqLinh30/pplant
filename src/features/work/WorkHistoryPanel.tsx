import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { translateText } from '@/i18n/strings';
import { formatMinorUnitsForInput } from '@/domain/common/money';
import type {
  WorkEntry,
  WorkEntryMode,
  WorkHistoryPaidFilter,
  WorkHistorySort,
  WorkHistorySummaryMode,
} from '@/domain/work/types';
import { Button } from '@/ui/primitives/Button';
import { ListRow } from '@/ui/primitives/ListRow';
import { SegmentedControl } from '@/ui/primitives/SegmentedControl';
import { StatusBanner } from '@/ui/primitives/StatusBanner';
import { TextField } from '@/ui/primitives/TextField';
import { colors } from '@/ui/tokens/colors';
import { spacing } from '@/ui/tokens/spacing';
import { typography } from '@/ui/tokens/typography';

import { useWorkHistory } from './useWorkHistory';

const summaryOptions: { label: string; value: WorkHistorySummaryMode }[] = [
  { label: 'Day', value: 'day' },
  { label: 'Week', value: 'week' },
  { label: 'Month', value: 'month' },
];

const modeOptions: { label: string; value: WorkEntryMode | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Hours', value: 'hours' },
  { label: 'Shift', value: 'shift' },
];

const paidOptions: { label: string; value: WorkHistoryPaidFilter | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Paid', value: 'paid' },
  { label: 'Unpaid', value: 'unpaid' },
];

const dateSortOptions: { label: string; value: WorkHistorySort }[] = [
  { label: 'Newest', value: 'date_desc' },
  { label: 'Oldest', value: 'date_asc' },
];

const earnedSortOptions: { label: string; value: WorkHistorySort }[] = [
  { label: 'Earned high', value: 'earned_desc' },
  { label: 'Earned low', value: 'earned_asc' },
];

const durationSortOptions: { label: string; value: WorkHistorySort }[] = [
  { label: 'Long', value: 'duration_desc' },
  { label: 'Short', value: 'duration_asc' },
];

function formatDuration(minutes: number): string {
  const hours = minutes / 60;

  return Number.isInteger(hours) ? `${hours}h` : `${hours.toFixed(2)}h`;
}

export function WorkHistoryPanel() {
  const history = useWorkHistory();
  const { state } = history;

  const formatAmount = (amountMinor: number, currencyCode: string) => {
    const formatted = state.data
      ? formatMinorUnitsForInput(amountMinor, currencyCode, {
          locale: state.data.preferences.locale,
        })
      : { ok: false as const };

    return `${formatted.ok ? formatted.value : amountMinor} ${currencyCode}`;
  };

  const categoryName = (categoryId: string | null) => {
    if (!categoryId || !state.data) {
      return 'No category';
    }

    return state.data.categories.find((category) => category.id === categoryId)?.name ?? 'Unknown category';
  };

  const topicNames = (topicIds: string[]) => {
    if (topicIds.length === 0 || !state.data) {
      return 'No topics';
    }

    return topicIds
      .map((topicId) => state.data?.topics.find((topic) => topic.id === topicId)?.name ?? 'Unknown topic')
      .join(', ');
  };

  const formatWageSnapshot = (entry: WorkEntry) =>
    `${formatAmount(entry.wageMinorPerHour, entry.wageCurrencyCode)}/h - ${
      entry.wageSource === 'override' ? 'Override wage' : 'Default wage'
    }`;

  const hasFilters =
    state.filterDraft.categoryId !== null ||
    state.filterDraft.dateFrom.trim().length > 0 ||
    state.filterDraft.dateTo.trim().length > 0 ||
    state.filterDraft.entryMode !== 'all' ||
    state.filterDraft.noteSearch.trim().length > 0 ||
    state.filterDraft.paid !== 'all' ||
    state.filterDraft.topicId !== null;

  if (state.status === 'loading' && !state.data) {
    return (
      <View accessibilityLabel="Loading work history" accessibilityRole="summary" style={styles.inlineLoading}>
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.helper}>{translateText('Loading work history.')}</Text>
      </View>
    );
  }

  if (state.status === 'failed') {
    return (
      <View style={styles.section}>
        <StatusBanner
          title="Work history could not load"
          description="Your local work entries are unchanged. Try loading history again."
          tone="warning"
        />
        <Button label="Retry work history" onPress={history.reload} variant="secondary" />
      </View>
    );
  }

  if (state.status === 'preferences_needed') {
    return (
      <View style={styles.section}>
        <StatusBanner
          title="Preferences needed"
          description="Work history uses your saved locale and wage currency."
          tone="warning"
        />
        <Button label="Retry after saving preferences" onPress={history.reload} variant="secondary" />
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>{translateText('Work history')}</Text>
        <Text style={styles.description}>{translateText('Review active work entries, hours, earned income, and wage snapshots.')}</Text>
      </View>

      {state.filterError ? (
        <StatusBanner title="Check work filters" description={state.filterError.message} tone="warning" />
      ) : null}

      {hasFilters ? (
        <StatusBanner title="Work filters active" description="Matching work entries and summaries are shown below." />
      ) : null}

      <View style={styles.section}>
        <Text style={styles.subsectionTitle}>{translateText('Work summary')}</Text>
        <SegmentedControl options={summaryOptions} selectedValue={state.summaryMode} onChange={history.setSummaryMode} />
        {state.data?.summaries.length === 0 ? (
          <StatusBanner title="No work summary yet" description="Save a work entry or adjust filters." />
        ) : null}
        <View style={styles.listGroup}>
          {state.data?.summaries.map((summary) => (
            <ListRow
              key={`${summary.mode}-${summary.key}`}
              title={summary.label}
              description={`Earned ${formatAmount(
                summary.earnedIncomeMinor,
                state.data?.preferences.defaultHourlyWage.currency ?? 'USD',
              )} - ${formatDuration(summary.totalDurationMinutes)} total`}
              meta={`${formatDuration(summary.paidDurationMinutes)} paid - ${formatDuration(
                summary.unpaidDurationMinutes,
              )} unpaid - ${summary.recordCount} record${summary.recordCount === 1 ? '' : 's'}`}
            />
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.subsectionTitle}>{translateText('Work filters')}</Text>
        <SegmentedControl options={modeOptions} selectedValue={state.filterDraft.entryMode} onChange={history.setEntryMode} />
        <SegmentedControl options={paidOptions} selectedValue={state.filterDraft.paid} onChange={history.setPaid} />
        <TextField
          label="Note search"
          onChangeText={(value) => history.updateFilterField('noteSearch', value)}
          value={state.filterDraft.noteSearch}
        />
        <View style={styles.fieldRow}>
          <TextField
            autoCapitalize="none"
            helperText="YYYY-MM-DD"
            label="From"
            onChangeText={(value) => history.updateFilterField('dateFrom', value)}
            value={state.filterDraft.dateFrom}
          />
          <TextField
            autoCapitalize="none"
            helperText="YYYY-MM-DD"
            label="To"
            onChangeText={(value) => history.updateFilterField('dateTo', value)}
            value={state.filterDraft.dateTo}
          />
        </View>

          <Text style={styles.label}>{translateText('Work category')}</Text>
        <ListRow
          title="Any category"
          meta={state.filterDraft.categoryId === null ? 'Selected' : 'Available'}
          onPress={() => history.selectCategory(null)}
        />
        {state.data?.categories.map((category) => (
          <ListRow
            key={category.id}
            title={category.name}
            meta={state.filterDraft.categoryId === category.id ? 'Selected' : 'Available'}
            onPress={() => history.selectCategory(category.id)}
          />
        ))}

          <Text style={styles.label}>{translateText('Work topic')}</Text>
        <ListRow
          title="Any topic"
          meta={state.filterDraft.topicId === null ? 'Selected' : 'Available'}
          onPress={() => history.selectTopic(null)}
        />
        {state.data?.topics.map((topic) => (
          <ListRow
            key={topic.id}
            title={topic.name}
            meta={state.filterDraft.topicId === topic.id ? 'Selected' : 'Available'}
            onPress={() => history.selectTopic(topic.id)}
          />
        ))}

        <View style={styles.sortGroup}>
          <SegmentedControl options={dateSortOptions} selectedValue={state.sort} onChange={history.setSort} />
          <SegmentedControl options={durationSortOptions} selectedValue={state.sort} onChange={history.setSort} />
          <SegmentedControl options={earnedSortOptions} selectedValue={state.sort} onChange={history.setSort} />
        </View>
        <Button label="Apply work filters" onPress={history.applyFilters} />
        {hasFilters ? <Button label="Clear work filters" onPress={history.clearFilters} variant="secondary" /> : null}
      </View>

      <View style={styles.section}>
        <Text style={styles.subsectionTitle}>{translateText('Work records')}</Text>
        {state.data?.records.length === 0 ? (
          <StatusBanner title="No matching work entries" description="Adjust filters or save a work entry from Capture." />
        ) : null}
        <View style={styles.listGroup}>
          {state.data?.records.map((entry) => (
            <ListRow
              key={entry.id}
              title={entry.entryMode === 'hours' ? 'Direct hours' : 'Shift'}
              description={`${categoryName(entry.categoryId)} - ${topicNames(entry.topicIds)}`}
              meta={`${entry.localDate} - ${formatDuration(entry.durationMinutes)} - ${
                entry.paid ? formatAmount(entry.earnedIncomeMinor, entry.wageCurrencyCode) : 'Unpaid'
              } - ${formatWageSnapshot(entry)}${entry.note ? ` - ${entry.note}` : ''}`}
            />
          ))}
        </View>
        {state.data?.page.hasMore ? (
          <Button label="Load more work" onPress={history.loadMore} variant="secondary" />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  description: {
    ...typography.body,
    color: colors.body,
  },
  fieldRow: {
    gap: spacing.sm,
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
  section: {
    gap: spacing.md,
  },
  sectionTitle: {
    ...typography.sectionTitle,
    color: colors.ink,
  },
  sortGroup: {
    gap: spacing.xs,
  },
  subsectionTitle: {
    ...typography.label,
    color: colors.ink,
  },
});
