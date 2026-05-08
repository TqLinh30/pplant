import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { formatMinorUnitsForInput } from '@/domain/common/money';
import type { MoneyHistorySort, MoneyHistorySummaryMode, MoneyRecord, MoneyRecordKind } from '@/domain/money/types';
import { Button } from '@/ui/primitives/Button';
import { ListRow } from '@/ui/primitives/ListRow';
import { SegmentedControl } from '@/ui/primitives/SegmentedControl';
import { StatusBanner } from '@/ui/primitives/StatusBanner';
import { TextField } from '@/ui/primitives/TextField';
import { colors } from '@/ui/tokens/colors';
import { spacing } from '@/ui/tokens/spacing';
import { typography } from '@/ui/tokens/typography';

import { WorkHistoryPanel } from '../work/WorkHistoryPanel';
import { buildExpenseWorkTimeContextText } from '../work/workTimeContextText';
import { useMoneyHistory } from './useMoneyHistory';

const kindOptions: { label: string; value: MoneyRecordKind | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Expense', value: 'expense' },
  { label: 'Income', value: 'income' },
];

const summaryOptions: { label: string; value: MoneyHistorySummaryMode }[] = [
  { label: 'Day', value: 'day' },
  { label: 'Week', value: 'week' },
  { label: 'Month', value: 'month' },
];

const sortOptions: { label: string; value: MoneyHistorySort }[] = [
  { label: 'Newest', value: 'date_desc' },
  { label: 'Oldest', value: 'date_asc' },
  { label: 'High', value: 'amount_desc' },
  { label: 'Low', value: 'amount_asc' },
];

export function HistoryScreen() {
  const history = useMoneyHistory();
  const { state } = history;

  const formatAmount = (amountMinor: number, currencyCode: string) => {
    const sign = amountMinor < 0 ? '-' : '';
    const formatted = state.data
      ? formatMinorUnitsForInput(Math.abs(amountMinor), currencyCode, {
          locale: state.data.preferences.locale,
        })
      : { ok: false as const };

    return `${sign}${formatted.ok ? formatted.value : amountMinor} ${currencyCode}`;
  };

  const formatRecordAmount = (record: MoneyRecord) => {
    return `${record.kind === 'expense' ? 'Expense' : 'Income'} - ${
      formatAmount(record.amountMinor, record.currencyCode)
    }`;
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

  const hasFilters =
    state.filterDraft.amountMax.trim().length > 0 ||
    state.filterDraft.amountMin.trim().length > 0 ||
    state.filterDraft.categoryId !== null ||
    state.filterDraft.dateFrom.trim().length > 0 ||
    state.filterDraft.dateTo.trim().length > 0 ||
    state.filterDraft.kind !== 'all' ||
    state.filterDraft.merchantOrSource.trim().length > 0 ||
    state.filterDraft.topicId !== null;

  const summaryRows = (() => {
    if (!state.data) {
      return null;
    }

    const currencyCode = state.data.preferences.currencyCode;

    return state.data.summaries.map((summary) => (
      <ListRow
        key={`${summary.mode}-${summary.key}`}
        title={summary.label}
        description={`Income ${formatAmount(summary.incomeAmountMinor, currencyCode)} - Expense ${formatAmount(
          summary.expenseAmountMinor,
          currencyCode,
        )}`}
        meta={`Net ${formatAmount(summary.netAmountMinor, currencyCode)} - ${summary.recordCount} record${
          summary.recordCount === 1 ? '' : 's'
        }`}
      />
    ));
  })();

  if (state.status === 'loading' && !state.data) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View accessibilityLabel="Loading history" accessibilityRole="summary" style={styles.centered}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.title}>Loading history</Text>
          <Text style={styles.description}>Pplant is opening local money records.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (state.status === 'failed') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View accessibilityLabel="History could not be loaded" accessibilityRole="summary" style={styles.centered}>
          <Text style={styles.eyebrow}>Money history</Text>
          <Text style={styles.title}>History could not open.</Text>
          <Text style={styles.description}>Your local records are unchanged. Try loading history again.</Text>
          <Button label="Retry" onPress={history.reload} variant="secondary" />
        </View>
      </SafeAreaView>
    );
  }

  if (state.status === 'preferences_needed') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View accessibilityLabel="Preferences needed" accessibilityRole="summary" style={styles.centered}>
          <Text style={styles.eyebrow}>Money history</Text>
          <Text style={styles.title}>Save preferences first.</Text>
          <Text style={styles.description}>History uses your saved currency and locale for amount filters.</Text>
          <Button label="Retry after saving preferences" onPress={history.reload} variant="secondary" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Money history</Text>
          <Text style={styles.title}>Review records</Text>
          <Text style={styles.description}>
            Search, filter, and sort active expenses and income saved on this device.
          </Text>
        </View>

        {state.filterError ? (
          <StatusBanner title="Check filters" description={state.filterError.message} tone="warning" />
        ) : null}

        {hasFilters ? (
          <StatusBanner
            title="Filters active"
            description="Matching records are shown below. Clear filters to return to the full money history."
          />
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Summary</Text>
          <SegmentedControl
            options={summaryOptions}
            selectedValue={state.summaryMode}
            onChange={history.setSummaryMode}
          />
          {state.data?.summaries.length === 0 ? (
            <StatusBanner title="No summary yet" description="Save a money record or adjust filters." />
          ) : null}
          <View style={styles.listGroup}>
            {summaryRows}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Filters</Text>
          <SegmentedControl options={kindOptions} selectedValue={state.filterDraft.kind} onChange={history.setKind} />
          <TextField
            label="Merchant or source"
            onChangeText={(value) => history.updateFilterField('merchantOrSource', value)}
            value={state.filterDraft.merchantOrSource}
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
          <View style={styles.fieldRow}>
            <TextField
              helperText={state.data ? state.data.preferences.currencyCode : undefined}
              keyboardType="decimal-pad"
              label="Min amount"
              onChangeText={(value) => history.updateFilterField('amountMin', value)}
              value={state.filterDraft.amountMin}
            />
            <TextField
              helperText={state.data ? state.data.preferences.currencyCode : undefined}
              keyboardType="decimal-pad"
              label="Max amount"
              onChangeText={(value) => history.updateFilterField('amountMax', value)}
              value={state.filterDraft.amountMax}
            />
          </View>

          <Text style={styles.label}>Category</Text>
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

          <Text style={styles.label}>Topic</Text>
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

          <SegmentedControl options={sortOptions} selectedValue={state.sort} onChange={history.setSort} />
          <Button label="Apply filters" onPress={history.applyFilters} />
          {hasFilters ? <Button label="Clear filters" onPress={history.clearFilters} variant="secondary" /> : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Records</Text>
          {state.data?.records.length === 0 ? (
            <StatusBanner title="No matching records" description="Adjust filters or save a money record from Capture." />
          ) : null}
          <View style={styles.listGroup}>
            {state.data?.records.map((record) => {
              const workTimeContext = buildExpenseWorkTimeContextText(record, state.data?.preferences ?? null);

              return (
                <ListRow
                  key={record.id}
                  title={record.merchantOrSource ?? (record.kind === 'expense' ? 'Expense' : 'Income')}
                  description={`${categoryName(record.categoryId)} - ${topicNames(record.topicIds)}`}
                  meta={`${formatRecordAmount(record)} - ${record.localDate}${
                    workTimeContext ? ` - ${workTimeContext}` : ''
                  }${record.note ? ` - ${record.note}` : ''}`}
                />
              );
            })}
          </View>
          {state.data?.page.hasMore ? (
            <Button label="Load more" onPress={history.loadMore} variant="secondary" />
          ) : null}
        </View>

        <View style={styles.divider} />
        <WorkHistoryPanel />
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
  content: {
    gap: spacing.lg,
    padding: spacing.lg,
    paddingBottom: spacing.xxl + spacing.xl,
  },
  description: {
    ...typography.body,
    color: colors.body,
  },
  divider: {
    backgroundColor: colors.hairline,
    height: StyleSheet.hairlineWidth,
  },
  eyebrow: {
    ...typography.caption,
    color: colors.muted,
  },
  fieldRow: {
    gap: spacing.sm,
  },
  header: {
    gap: spacing.sm,
  },
  label: {
    ...typography.caption,
    color: colors.ink,
  },
  listGroup: {
    gap: spacing.xs,
  },
  safeArea: {
    backgroundColor: colors.appBackground,
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
