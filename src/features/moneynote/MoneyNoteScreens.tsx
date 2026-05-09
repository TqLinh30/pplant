import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { AppError } from '@/domain/common/app-error';
import type { CategoryTopicItem } from '@/domain/categories/types';
import type { MoneyRecord } from '@/domain/money/types';
import { isErr } from '@/domain/common/result';
import { createCategoryTopicItem } from '@/services/categories/category-topic.service';
import { loadMoneyHistory } from '@/services/money/money-history.service';
import { saveUserPreferences } from '@/services/preferences/preferences.service';
import { saveStoredAppLanguage } from '@/i18n/language-storage';
import { appLanguageOptions, useAppLanguage, type AppLanguage } from '@/i18n/strings';
import { useManualMoneyCapture } from '@/features/capture/useManualMoneyCapture';

import {
  allMoneyNoteCategoryTemplates,
  buildMoneyNoteCalendarMonth,
  calculateMoneyNoteTotals,
  expenseCategoryTemplates,
  formatDong,
  formatMoneyNoteDate,
  getMonthBounds,
  incomeCategoryTemplates,
  moneyNoteDefaultPreferences,
  monthLabel,
  shiftLocalDate,
  shiftMonth,
  type MoneyNoteCategoryTemplate,
  type MoneyNoteTotals,
} from './moneyNoteModel';

const skyBlue = '#12A7DF';
const lightBlue = '#EEF9FD';
const ink = '#454545';
const muted = '#9A9A9A';
const line = '#E1E1E1';
const panel = '#F4F4F4';
const expenseColor = '#D86844';
const incomeColor = '#3F9FDB';

type MonthDataState = {
  error?: AppError;
  records: MoneyRecord[];
  status: 'failed' | 'loading' | 'ready';
  totals: MoneyNoteTotals;
};

const emptyTotals: MoneyNoteTotals = {
  expenseMinor: 0,
  incomeMinor: 0,
  netMinor: 0,
};

function findCategoryByTemplate(categories: CategoryTopicItem[], template: MoneyNoteCategoryTemplate) {
  return categories.find((category) => category.name === template.label && category.archivedAt === null);
}

function totalsFromRecordsOrSummaries(
  records: MoneyRecord[],
  summaries: { expenseAmountMinor: number; incomeAmountMinor: number }[],
): MoneyNoteTotals {
  if (summaries.length === 0) {
    return calculateMoneyNoteTotals(records);
  }

  return summaries.reduce<MoneyNoteTotals>(
    (totals, summary) => {
      totals.expenseMinor += summary.expenseAmountMinor;
      totals.incomeMinor += summary.incomeAmountMinor;
      totals.netMinor = totals.incomeMinor - totals.expenseMinor;
      return totals;
    },
    { ...emptyTotals },
  );
}

async function ensureMoneyNotePreferences() {
  return saveUserPreferences(moneyNoteDefaultPreferences);
}

function useEnsureMoneyNoteDefaults(
  captureStatus: string,
  categories: CategoryTopicItem[],
  reload: () => void,
) {
  const preferencesAttempted = useRef(false);
  const categoriesAttempted = useRef(false);

  useEffect(() => {
    if (captureStatus !== 'preferences_needed' || preferencesAttempted.current) {
      return;
    }

    preferencesAttempted.current = true;
    void ensureMoneyNotePreferences().then((result) => {
      if (result.ok) {
        reload();
      }
    });
  }, [captureStatus, reload]);

  useEffect(() => {
    if (captureStatus !== 'ready' || categoriesAttempted.current) {
      return;
    }

    const activeNames = new Set<string>(
      categories.filter((category) => category.archivedAt === null).map((item) => item.name),
    );
    const missing = allMoneyNoteCategoryTemplates.filter((template) => !activeNames.has(template.label));

    if (missing.length === 0) {
      return;
    }

    categoriesAttempted.current = true;

    void (async () => {
      for (const template of missing) {
        const created = await createCategoryTopicItem(
          { kind: 'category', name: template.label },
          { createId: () => `category-moneynote-${template.id}` },
        );

        if (isErr(created) && created.error.code !== 'conflict') {
          break;
        }
      }

      reload();
    })();
  }, [captureStatus, categories, reload]);
}

function useMoneyNoteMonthData(monthDate: Date): MonthDataState {
  const [state, setState] = useState<MonthDataState>({
    records: [],
    status: 'loading',
    totals: emptyTotals,
  });
  const preferencesAttempted = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const bounds = getMonthBounds(monthDate);

    const load = async () => {
      setState((current) => ({ ...current, error: undefined, status: 'loading' }));

      const result = await loadMoneyHistory({
        dateFrom: bounds.dateFrom,
        dateTo: bounds.dateTo,
        limit: 50,
        sort: 'date_desc',
        summaryMode: 'day',
      });

      if (cancelled) {
        return;
      }

      if (result.ok) {
        setState({
          records: result.value.records,
          status: 'ready',
          totals: totalsFromRecordsOrSummaries(result.value.records, result.value.summaries),
        });
        return;
      }

      if (result.error.recovery === 'settings' && !preferencesAttempted.current) {
        preferencesAttempted.current = true;
        const preferences = await ensureMoneyNotePreferences();

        if (!cancelled && preferences.ok) {
          await load();
          return;
        }
      }

      setState({
        error: result.error,
        records: [],
        status: 'failed',
        totals: emptyTotals,
      });
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [monthDate]);

  return state;
}

function ScreenHeader({
  right,
  title,
}: {
  right?: React.ReactNode;
  title: string;
}) {
  return (
    <View style={styles.header}>
      <Text numberOfLines={1} style={styles.headerTitle}>
        {title}
      </Text>
      {right ? <View style={styles.headerRight}>{right}</View> : null}
    </View>
  );
}

function IconButton({
  label,
  onPress,
}: {
  label: string;
  onPress?: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.iconButton}>
      <Text style={styles.iconButtonText}>{label}</Text>
    </Pressable>
  );
}

function KindTabs({
  active,
  onChange,
}: {
  active: 'expense' | 'income';
  onChange: (kind: 'expense' | 'income') => void;
}) {
  return (
    <View style={styles.kindTabs}>
      <Pressable accessibilityRole="tab" onPress={() => onChange('expense')} style={styles.kindTab}>
        <Text style={[styles.kindTabText, active === 'expense' ? styles.kindTabTextActive : null]}>Chi tiêu</Text>
        <View style={[styles.kindTabLine, active === 'expense' ? styles.kindTabLineActive : null]} />
      </Pressable>
      <Pressable accessibilityRole="tab" onPress={() => onChange('income')} style={styles.kindTab}>
        <Text style={[styles.kindTabText, active === 'income' ? styles.kindTabTextActive : null]}>Thu nhập</Text>
        <View style={[styles.kindTabLine, active === 'income' ? styles.kindTabLineActive : null]} />
      </Pressable>
    </View>
  );
}

function CategoryIcon({ color, icon }: { color: string; icon: string }) {
  return (
    <MaterialCommunityIcons color={color} name={icon as never} size={30} />
  );
}

function CategoryGrid({
  categories,
  onEdit,
  onSelect,
  selectedId,
}: {
  categories: MoneyNoteCategoryTemplate[];
  onEdit: () => void;
  onSelect: (category: MoneyNoteCategoryTemplate) => void;
  selectedId: string;
}) {
  return (
    <View style={styles.categoryGrid}>
      {categories.map((category) => (
        <Pressable
          accessibilityRole="button"
          key={category.id}
          onPress={() => onSelect(category)}
          style={[styles.categoryTile, selectedId === category.id ? styles.categoryTileSelected : null]}>
          <CategoryIcon color={category.color} icon={category.icon} />
          <Text numberOfLines={1} style={styles.categoryTileLabel}>
            {category.label}
          </Text>
        </Pressable>
      ))}
      <Pressable accessibilityRole="button" onPress={onEdit} style={styles.categoryTile}>
        <Text style={styles.categoryEditText}>Chỉnh sửa</Text>
      </Pressable>
    </View>
  );
}

function MoneyNoteRow({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <View style={styles.formRow}>
      <Text style={styles.formRowLabel}>{label}</Text>
      <View style={styles.formRowBody}>{children}</View>
    </View>
  );
}

export function MoneyNoteEntryScreen() {
  const router = useRouter();
  const capture = useManualMoneyCapture();
  const { state, selectCategory, setKind, updateField } = capture;
  const templates = state.draft.kind === 'expense' ? expenseCategoryTemplates : incomeCategoryTemplates;
  const [selectedTemplateId, setSelectedTemplateId] = useState(templates[0].id);
  const selectedTemplate = templates.find((template) => template.id === selectedTemplateId) ?? templates[0];
  const matchingCategory = findCategoryByTemplate(state.categories, selectedTemplate);
  const saving = state.status === 'saving';

  useEnsureMoneyNoteDefaults(state.status, state.categories, capture.reload);

  useEffect(() => {
    const firstTemplate = templates[0];

    if (!templates.some((template) => template.id === selectedTemplateId)) {
      setSelectedTemplateId(firstTemplate.id);
    }
  }, [selectedTemplateId, templates]);

  useEffect(() => {
    const nextCategoryId = matchingCategory?.id ?? null;

    if (state.draft.categoryId !== nextCategoryId) {
      selectCategory(nextCategoryId);
    }

    if (state.draft.merchantOrSource !== selectedTemplate.label) {
      updateField('merchantOrSource', selectedTemplate.label);
    }
  }, [
    matchingCategory?.id,
    selectCategory,
    selectedTemplate.label,
    state.draft.categoryId,
    state.draft.merchantOrSource,
    updateField,
  ]);

  const changeKind = (kind: 'expense' | 'income') => {
    const nextTemplate = kind === 'expense' ? expenseCategoryTemplates[0] : incomeCategoryTemplates[0];
    setSelectedTemplateId(nextTemplate.id);
    setKind(kind);
  };

  const selectTemplate = (template: MoneyNoteCategoryTemplate) => {
    setSelectedTemplateId(template.id);
    const category = findCategoryByTemplate(state.categories, template);
    selectCategory(category?.id ?? null);
    updateField('merchantOrSource', template.label);
  };

  const openCategories = () => {
    router.push('/categories');
  };

  const changeDateBy = (days: number) => {
    updateField('localDate', shiftLocalDate(state.draft.localDate, days));
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.entryContent} keyboardShouldPersistTaps="handled">
        <ScreenHeader
          right={<IconButton label="✎" onPress={openCategories} />}
          title="Sổ thu chi MoneyNote"
        />
        <KindTabs active={state.draft.kind} onChange={changeKind} />

        <View style={styles.formPanel}>
          <MoneyNoteRow label="Ngày">
            <IconButton label="<" onPress={() => changeDateBy(-1)} />
            <View style={styles.datePill}>
              <Text numberOfLines={1} style={styles.datePillText}>
                {formatMoneyNoteDate(state.draft.localDate)}
              </Text>
              <Text style={styles.datePillIcon}>▣</Text>
            </View>
            <IconButton label=">" onPress={() => changeDateBy(1)} />
          </MoneyNoteRow>

          <MoneyNoteRow label="Ghi chú">
            <TextInput
              onChangeText={(value) => updateField('note', value)}
              placeholder="Thêm ghi chú"
              placeholderTextColor="#BBBBBB"
              style={styles.textInput}
              value={state.draft.note}
            />
          </MoneyNoteRow>

          <MoneyNoteRow label={state.draft.kind === 'expense' ? 'Tiền chi' : 'Tiền thu'}>
            <TextInput
              keyboardType="number-pad"
              onChangeText={(value) => updateField('amount', value.replace(/[^\d]/g, ''))}
              placeholder="0"
              placeholderTextColor={ink}
              style={styles.amountInput}
              value={state.draft.amount}
            />
            <Text style={styles.currencySuffix}>đ</Text>
          </MoneyNoteRow>
        </View>

        <View style={styles.categorySection}>
          <Text style={styles.sectionLabel}>Danh mục</Text>
          <CategoryGrid
            categories={templates}
            onEdit={openCategories}
            onSelect={selectTemplate}
            selectedId={selectedTemplate.id}
          />
        </View>

        {state.fieldErrors.amount ? <Text style={styles.warningText}>{state.fieldErrors.amount}</Text> : null}
        {state.actionError ? <Text style={styles.warningText}>{state.actionError.message}</Text> : null}
        {state.status === 'saved' ? (
          <Text style={styles.successText}>
            Đã lưu {state.draft.kind === 'expense' ? 'khoản chi' : 'khoản thu'}.
          </Text>
        ) : null}

        <Pressable
          accessibilityRole="button"
          disabled={saving || state.status === 'loading'}
          onPress={capture.save}
          style={[styles.primaryCta, saving ? styles.primaryCtaDisabled : null]}>
          <Text style={styles.primaryCtaText}>
            {saving
              ? 'Đang lưu...'
              : state.draft.kind === 'expense'
                ? 'Nhập khoản Tiền chi'
                : 'Nhập khoản Tiền thu'}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function MonthSwitcher({
  monthDate,
  onChange,
}: {
  monthDate: Date;
  onChange: (date: Date) => void;
}) {
  return (
    <View style={styles.monthSwitcher}>
      <IconButton label="<" onPress={() => onChange(shiftMonth(monthDate, -1))} />
      <View style={styles.monthPill}>
        <Text style={styles.monthPillText}>{monthLabel(monthDate)}</Text>
        <Text style={styles.monthPillIcon}>▣</Text>
      </View>
      <IconButton label=">" onPress={() => onChange(shiftMonth(monthDate, 1))} />
    </View>
  );
}

function SummaryStrip({ totals }: { totals: MoneyNoteTotals }) {
  return (
    <View style={styles.summaryStrip}>
      <View style={styles.summaryCell}>
        <Text style={styles.summaryLabel}>Thu nhập</Text>
        <Text style={[styles.summaryAmount, styles.incomeAmount]}>{formatDong(totals.incomeMinor)}</Text>
      </View>
      <View style={styles.summaryDivider} />
      <View style={styles.summaryCell}>
        <Text style={styles.summaryLabel}>Chi tiêu</Text>
        <Text style={[styles.summaryAmount, styles.expenseAmount]}>{formatDong(totals.expenseMinor)}</Text>
      </View>
      <View style={styles.summaryDivider} />
      <View style={styles.summaryCell}>
        <Text style={styles.summaryLabel}>Tổng</Text>
        <Text style={[styles.summaryAmount, styles.expenseAmount]}>{formatDong(totals.netMinor)}</Text>
      </View>
    </View>
  );
}

export function MoneyNoteCalendarScreen() {
  const [monthDate, setMonthDate] = useState(() => new Date());
  const monthData = useMoneyNoteMonthData(monthDate);
  const days = useMemo(() => buildMoneyNoteCalendarMonth(monthDate), [monthDate]);
  const weekdayLabels = ['T.2', 'T.3', 'T.4', 'T.5', 'T.6', 'T.7', 'CN'];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.plainContent}>
        <ScreenHeader right={<IconButton label="⌕" />} title="Lịch" />
        <MonthSwitcher monthDate={monthDate} onChange={setMonthDate} />
        <View style={styles.calendarGrid}>
          {weekdayLabels.map((label) => (
            <View key={label} style={styles.weekdayCell}>
              <Text style={[styles.weekdayText, label === 'T.7' ? styles.saturdayText : null, label === 'CN' ? styles.sundayText : null]}>
                {label}
              </Text>
            </View>
          ))}
          {days.map((day) => (
            <View
              key={day.localDate}
              style={[styles.dayCell, day.isToday && day.inCurrentMonth ? styles.dayCellToday : null]}>
              <Text
                style={[
                  styles.dayText,
                  !day.inCurrentMonth ? styles.dayTextMuted : null,
                  day.dayOfWeek === 6 && day.inCurrentMonth ? styles.saturdayText : null,
                  day.dayOfWeek === 0 && day.inCurrentMonth ? styles.sundayText : null,
                ]}>
                {day.dayOfMonth}
              </Text>
            </View>
          ))}
        </View>

        {monthData.status === 'loading' ? <ActivityIndicator color={skyBlue} /> : null}
        {monthData.status === 'failed' ? (
          <Text style={styles.warningText}>{monthData.error?.message ?? 'Không thể tải dữ liệu.'}</Text>
        ) : null}
        <SummaryStrip totals={monthData.totals} />
      </ScrollView>
    </SafeAreaView>
  );
}

function ReportSummaryCard({ totals }: { totals: MoneyNoteTotals }) {
  return (
    <View style={styles.reportCard}>
      <View style={styles.reportTopRow}>
        <View style={styles.reportHalf}>
          <Text style={styles.summaryLabel}>Chi tiêu</Text>
          <Text style={[styles.reportAmount, styles.expenseAmount]}>-{formatDong(totals.expenseMinor)}</Text>
        </View>
        <View style={styles.reportVerticalLine} />
        <View style={styles.reportHalf}>
          <Text style={styles.summaryLabel}>Thu nhập</Text>
          <Text style={[styles.reportAmount, styles.incomeAmount]}>+{formatDong(totals.incomeMinor)}</Text>
        </View>
      </View>
      <View style={styles.reportBottomRow}>
        <Text style={styles.summaryLabel}>Thu chi</Text>
        <Text style={styles.reportNet}>{formatDong(totals.netMinor)}</Text>
      </View>
    </View>
  );
}

export function MoneyNoteReportScreen() {
  const [monthDate, setMonthDate] = useState(() => new Date());
  const [activeKind, setActiveKind] = useState<'expense' | 'income'>('expense');
  const monthData = useMoneyNoteMonthData(monthDate);
  const visibleRecords = monthData.records.filter((record) => record.kind === activeKind);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.plainContent}>
        <ScreenHeader right={<IconButton label="⌕" />} title="Báo cáo" />
        <MonthSwitcher monthDate={monthDate} onChange={setMonthDate} />
        <ReportSummaryCard totals={monthData.totals} />
        <KindTabs active={activeKind} onChange={setActiveKind} />
        <View style={styles.reportBody}>
          {monthData.status === 'loading' ? <ActivityIndicator color={skyBlue} /> : null}
          {monthData.status === 'failed' ? (
            <Text style={styles.warningText}>{monthData.error?.message ?? 'Không thể tải báo cáo.'}</Text>
          ) : null}
          {monthData.status === 'ready' && visibleRecords.length === 0 ? (
            <Text style={styles.emptyText}>Không có dữ liệu</Text>
          ) : null}
          {visibleRecords.map((record) => (
            <View key={record.id} style={styles.recordRow}>
              <Text numberOfLines={1} style={styles.recordTitle}>
                {record.merchantOrSource ?? (record.kind === 'expense' ? 'Chi tiêu' : 'Thu nhập')}
              </Text>
              <Text style={record.kind === 'expense' ? styles.expenseAmount : styles.incomeAmount}>
                {formatDong(record.amountMinor)}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function MoreRow({
  icon,
  onPress,
  right,
  title,
}: {
  icon: string;
  onPress?: () => void;
  right?: string;
  title: string;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.moreRow}>
      <MaterialCommunityIcons color={skyBlue} name={icon as never} size={28} style={styles.moreIcon} />
      <Text numberOfLines={1} style={styles.moreTitle}>
        {title}
      </Text>
      {right ? <Text style={styles.moreRight}>{right}</Text> : null}
    </Pressable>
  );
}

function MoreDivider() {
  return <View style={styles.moreDivider} />;
}

export function MoneyNoteMoreScreen() {
  const router = useRouter();
  const appLanguage = useAppLanguage();
  const [languageOpen, setLanguageOpen] = useState(false);
  const [languageStatus, setLanguageStatus] = useState<'failed' | 'idle' | 'saved' | 'saving'>('idle');

  const changeLanguage = useCallback(
    (language: AppLanguage) => {
      if (language === appLanguage) {
        setLanguageOpen(false);
        return;
      }

      setLanguageStatus('saving');
      void saveStoredAppLanguage(language)
        .then(() => {
          setLanguageStatus('saved');
          setLanguageOpen(false);
        })
        .catch(() => setLanguageStatus('failed'));
    },
    [appLanguage],
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.moreContent}>
        <ScreenHeader title="Khác" />
        <MoreDivider />
        <MoreRow icon="cog-outline" onPress={() => router.push('/preferences')} title="Cài đặt cơ bản" />
        <MoreDivider />
        <MoreRow icon="star-four-points-outline" title="Dịch vụ Premium (Không có quảng cáo, v.v.)" />
        <MoreDivider />
        <MoreRow icon="palette-outline" right="Sky blue" title="Thay đổi màu chủ đề" />
        <MoreDivider />
        <MoreRow icon="chart-box-outline" title="Báo cáo trong năm" />
        <MoreRow icon="chart-pie" title="Báo cáo danh mục trong năm" />
        <MoreRow icon="chart-box-outline" title="Báo cáo toàn kì" />
        <MoreRow icon="chart-pie" title="Báo cáo danh mục toàn kì" />
        <MoreDivider />
        <MoreRow icon="download-outline" title="Đầu ra dữ liệu" />
        <MoreRow icon="archive-arrow-down-outline" title="Sao lưu dữ liệu" />
        <MoreDivider />
        <MoreRow icon="help-circle-outline" title="Trợ giúp" />
        <MoreRow icon="information-outline" title="Thông tin ứng dụng" />
        <MoreRow
          icon="web"
          onPress={() => setLanguageOpen((current) => !current)}
          right={appLanguage === 'vi' ? 'Tiếng Việt' : 'English'}
          title="Thay đổi ngôn ngữ"
        />
        {languageOpen ? (
          <View style={styles.languagePanel}>
            {appLanguageOptions.map((option) => (
              <Pressable
                key={option.value}
                onPress={() => changeLanguage(option.value)}
                style={[
                  styles.languageOption,
                  option.value === appLanguage ? styles.languageOptionSelected : null,
                ]}>
                <Text
                  style={[
                    styles.languageOptionText,
                    option.value === appLanguage ? styles.languageOptionTextSelected : null,
                  ]}>
                  {option.value === 'vi' ? 'Tiếng Việt' : 'English'}
                </Text>
              </Pressable>
            ))}
            {languageStatus === 'saving' ? <Text style={styles.mutedText}>Đang lưu...</Text> : null}
            {languageStatus === 'failed' ? (
              <Text style={styles.warningText}>Không thể lưu ngôn ngữ.</Text>
            ) : null}
          </View>
        ) : null}
        <MoreRow icon="cash-multiple" right="VND" title="Thay đổi tiền tệ" onPress={() => router.push('/preferences')} />
      </ScrollView>
    </SafeAreaView>
  );
}

export function MoneyNoteCategoryScreen() {
  const router = useRouter();
  const [activeKind, setActiveKind] = useState<'expense' | 'income'>('expense');
  const templates = activeKind === 'expense' ? expenseCategoryTemplates : incomeCategoryTemplates;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.categoryHeader}>
        <IconButton label="<" onPress={() => router.back()} />
        <Text numberOfLines={1} style={styles.categoryHeaderTitle}>
          Thêm danh mục
        </Text>
        <IconButton label="+" onPress={() => router.push('/preferences')} />
      </View>
      <KindTabs active={activeKind} onChange={setActiveKind} />
      <ScrollView contentContainerStyle={styles.categoryListContent}>
        {templates.map((template) => (
          <View key={template.id} style={styles.categoryListRow}>
            <CategoryIcon color={template.color} icon={template.icon} />
            <Text style={styles.categoryListTitle}>{template.label}</Text>
            <Text style={styles.dragHandle}>=</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  amountInput: {
    backgroundColor: lightBlue,
    borderRadius: 8,
    color: ink,
    flex: 1,
    fontSize: 26,
    minHeight: 58,
    paddingHorizontal: 18,
  },
  calendarGrid: {
    backgroundColor: '#FFFFFF',
    borderTopColor: line,
    borderTopWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  categoryEditText: {
    color: ink,
    fontSize: 18,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryHeader: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    gap: 12,
    minHeight: 64,
    paddingHorizontal: 18,
  },
  categoryHeaderTitle: {
    color: ink,
    flex: 1,
    fontSize: 24,
    fontWeight: '700',
  },
  categoryListContent: {
    backgroundColor: '#FFFFFF',
    paddingBottom: 36,
  },
  categoryListRow: {
    alignItems: 'center',
    borderBottomColor: line,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 22,
    minHeight: 76,
    paddingHorizontal: 24,
  },
  categoryListTitle: {
    color: ink,
    flex: 1,
    fontSize: 22,
  },
  categorySection: {
    backgroundColor: '#FFFFFF',
    gap: 12,
    paddingHorizontal: 18,
    paddingTop: 14,
  },
  categoryTile: {
    alignItems: 'center',
    borderColor: '#CFCFCF',
    borderRadius: 4,
    borderWidth: 1,
    flexBasis: '22%',
    flexGrow: 1,
    height: 76,
    justifyContent: 'center',
    minWidth: 74,
    paddingHorizontal: 6,
  },
  categoryTileLabel: {
    color: ink,
    fontSize: 15,
    marginTop: 4,
    textAlign: 'center',
  },
  categoryTileSelected: {
    borderColor: skyBlue,
    borderWidth: 3,
  },
  currencySuffix: {
    color: ink,
    fontSize: 20,
    marginLeft: 10,
    textDecorationLine: 'underline',
  },
  datePill: {
    alignItems: 'center',
    backgroundColor: lightBlue,
    borderRadius: 8,
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
    minHeight: 50,
    paddingHorizontal: 14,
  },
  datePillIcon: {
    color: skyBlue,
    fontSize: 20,
    fontWeight: '700',
  },
  datePillText: {
    color: ink,
    flex: 1,
    fontSize: 19,
  },
  dayCell: {
    alignItems: 'flex-start',
    aspectRatio: 1.35,
    borderColor: line,
    borderRightWidth: 1,
    borderTopWidth: 1,
    justifyContent: 'flex-start',
    padding: 8,
    width: `${100 / 7}%`,
  },
  dayCellToday: {
    backgroundColor: '#EAF7FC',
  },
  dayText: {
    color: '#555555',
    fontSize: 20,
  },
  dayTextMuted: {
    color: '#B7B7B7',
  },
  dragHandle: {
    color: '#666666',
    fontSize: 30,
    fontWeight: '700',
  },
  emptyText: {
    color: '#666666',
    fontSize: 24,
    marginTop: 120,
    textAlign: 'center',
  },
  entryContent: {
    backgroundColor: '#FFFFFF',
    paddingBottom: 48,
  },
  expenseAmount: {
    color: expenseColor,
  },
  formPanel: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 18,
    paddingTop: 18,
  },
  formRow: {
    alignItems: 'center',
    borderBottomColor: line,
    borderBottomWidth: 1,
    flexDirection: 'row',
    minHeight: 68,
  },
  formRowBody: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
  },
  formRowLabel: {
    color: ink,
    fontSize: 22,
    width: 106,
  },
  header: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    minHeight: 64,
    paddingHorizontal: 18,
  },
  headerRight: {
    marginLeft: 12,
  },
  headerTitle: {
    color: ink,
    flex: 1,
    fontSize: 23,
    fontWeight: '700',
  },
  iconButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 44,
  },
  iconButtonText: {
    color: ink,
    fontSize: 28,
    fontWeight: '600',
  },
  incomeAmount: {
    color: incomeColor,
  },
  kindTab: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-end',
  },
  kindTabLine: {
    backgroundColor: 'transparent',
    height: 4,
    marginTop: 12,
    width: '100%',
  },
  kindTabLineActive: {
    backgroundColor: skyBlue,
  },
  kindTabText: {
    color: '#BBBBBB',
    fontSize: 22,
    fontWeight: '700',
  },
  kindTabTextActive: {
    color: skyBlue,
  },
  kindTabs: {
    backgroundColor: '#FFFFFF',
    borderBottomColor: line,
    borderBottomWidth: 1,
    flexDirection: 'row',
    height: 60,
  },
  languageOption: {
    borderColor: line,
    borderRadius: 6,
    borderWidth: 1,
    flex: 1,
    padding: 12,
  },
  languageOptionSelected: {
    borderColor: skyBlue,
    borderWidth: 2,
  },
  languageOptionText: {
    color: ink,
    fontSize: 18,
    textAlign: 'center',
  },
  languageOptionTextSelected: {
    color: skyBlue,
    fontWeight: '700',
  },
  languagePanel: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    gap: 10,
    padding: 14,
  },
  monthPill: {
    alignItems: 'center',
    backgroundColor: lightBlue,
    borderRadius: 8,
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 18,
  },
  monthPillIcon: {
    color: skyBlue,
    fontSize: 20,
    position: 'absolute',
    right: 22,
  },
  monthPillText: {
    color: ink,
    fontSize: 23,
    fontWeight: '700',
  },
  monthSwitcher: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    gap: 10,
    padding: 16,
  },
  moreContent: {
    backgroundColor: '#FFFFFF',
    paddingBottom: 48,
  },
  moreDivider: {
    backgroundColor: panel,
    height: 34,
  },
  moreIcon: {
    width: 48,
  },
  moreRight: {
    color: ink,
    fontSize: 20,
    marginLeft: 12,
  },
  moreRow: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomColor: line,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 14,
    minHeight: 68,
    paddingHorizontal: 22,
  },
  moreTitle: {
    color: '#5A5A5A',
    flex: 1,
    fontSize: 21,
  },
  mutedText: {
    color: muted,
    fontSize: 16,
  },
  plainContent: {
    backgroundColor: '#FFFFFF',
    paddingBottom: 48,
  },
  primaryCta: {
    alignItems: 'center',
    backgroundColor: skyBlue,
    borderRadius: 34,
    elevation: 3,
    justifyContent: 'center',
    marginHorizontal: 28,
    marginTop: 24,
    minHeight: 64,
    shadowColor: '#000000',
    shadowOpacity: 0.18,
    shadowRadius: 5,
  },
  primaryCtaDisabled: {
    opacity: 0.55,
  },
  primaryCtaText: {
    color: '#FFFFFF',
    fontSize: 21,
    fontWeight: '700',
    letterSpacing: 2,
  },
  recordRow: {
    alignItems: 'center',
    borderBottomColor: line,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 12,
    minHeight: 60,
    paddingHorizontal: 18,
  },
  recordTitle: {
    color: ink,
    flex: 1,
    fontSize: 18,
  },
  reportAmount: {
    fontSize: 25,
    fontWeight: '700',
    marginTop: 8,
  },
  reportBody: {
    backgroundColor: '#FFFFFF',
    minHeight: 360,
  },
  reportBottomRow: {
    alignItems: 'center',
    borderTopColor: line,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
    minHeight: 74,
  },
  reportCard: {
    backgroundColor: '#FFFFFF',
    borderColor: line,
    borderRadius: 8,
    borderWidth: 1,
    margin: 18,
  },
  reportHalf: {
    alignItems: 'center',
    flex: 1,
    paddingVertical: 22,
  },
  reportNet: {
    color: ink,
    fontSize: 28,
    fontWeight: '700',
  },
  reportTopRow: {
    flexDirection: 'row',
  },
  reportVerticalLine: {
    alignSelf: 'center',
    backgroundColor: '#CFCFCF',
    height: 74,
    width: 1,
  },
  safeArea: {
    backgroundColor: '#FFFFFF',
    flex: 1,
  },
  saturdayText: {
    color: incomeColor,
  },
  sectionLabel: {
    color: ink,
    fontSize: 20,
    fontWeight: '600',
  },
  successText: {
    color: '#148B5B',
    fontSize: 16,
    marginHorizontal: 28,
    marginTop: 14,
  },
  summaryAmount: {
    fontSize: 23,
    fontWeight: '700',
    marginTop: 6,
  },
  summaryCell: {
    alignItems: 'center',
    flex: 1,
  },
  summaryDivider: {
    alignSelf: 'center',
    backgroundColor: '#CFCFCF',
    height: 58,
    width: 1,
  },
  summaryLabel: {
    color: '#333333',
    fontSize: 22,
  },
  summaryStrip: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    flexDirection: 'row',
    margin: 18,
    minHeight: 88,
    paddingVertical: 14,
  },
  sundayText: {
    color: expenseColor,
  },
  textInput: {
    backgroundColor: lightBlue,
    borderRadius: 8,
    color: ink,
    flex: 1,
    fontSize: 21,
    minHeight: 50,
    paddingHorizontal: 14,
  },
  warningText: {
    color: expenseColor,
    fontSize: 16,
    marginHorizontal: 28,
    marginTop: 14,
  },
  weekdayCell: {
    alignItems: 'center',
    backgroundColor: panel,
    borderColor: line,
    borderRightWidth: 1,
    justifyContent: 'center',
    minHeight: 36,
    width: `${100 / 7}%`,
  },
  weekdayText: {
    color: ink,
    fontSize: 18,
    fontWeight: '700',
  },
});
