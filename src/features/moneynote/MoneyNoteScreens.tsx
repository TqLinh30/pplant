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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, G, Polyline } from 'react-native-svg';

import type { AppError } from '@/domain/common/app-error';
import type { CategoryTopicItem } from '@/domain/categories/types';
import type { MoneyHistorySummary } from '@/domain/money/calculations';
import type { MoneyRecord } from '@/domain/money/types';
import type { UserPreferences } from '@/domain/preferences/types';
import { isErr } from '@/domain/common/result';
import {
  createCategoryTopicItem,
  deleteCategoryTopicItem,
} from '@/services/categories/category-topic.service';
import { loadMoneyHistory } from '@/services/money/money-history.service';
import { loadManualMoneyRecordForEdit } from '@/services/money/money-record.service';
import { saveUserPreferences } from '@/services/preferences/preferences.service';
import { saveStoredAppLanguage } from '@/i18n/language-storage';
import { appLanguageOptions, useAppLanguage, type AppLanguage } from '@/i18n/strings';
import { useManualMoneyCapture } from '@/features/capture/useManualMoneyCapture';
import { subscribeMoneyRecordsChanged } from '@/features/money/money-record-change-events';
import { usePreferenceSettings } from '@/features/settings/usePreferenceSettings';

import {
  allMoneyNoteCategoryTemplates,
  buildMoneyNoteCalendarMonth,
  calculateMoneyNoteDailyTotals,
  calculateMoneyNoteTotals,
  currencySuffixForCode,
  expenseCategoryTemplates,
  formatMoneyNoteAmount,
  formatMoneyNoteAmountMagnitude,
  formatMoneyNoteAmountInput,
  formatMoneyNoteDate,
  formatMoneyNoteShortDate,
  formatLocalDate,
  getMonthBounds,
  incomeCategoryTemplates,
  moneyNoteDefaultPreferences,
  monthLabel,
  parseMoneyNoteAmountInput,
  parseLocalDate,
  shiftLocalDate,
  shiftMonth,
  type MoneyNoteCategoryTemplate,
  type MoneyNoteTotals,
} from './moneyNoteModel';

const skyBlue = '#5CC4BA';
const lightBlue = '#DDF3F0';
const ink = '#253030';
const muted = '#8A9A9A';
const line = '#DDE7E7';
const panel = '#F2F7F7';
const expenseColor = '#E46B6B';
const incomeColor = '#4D8FD9';

const moneyNoteCopy = {
  vi: {
    appTitle: 'Sổ thu chi MoneyNote',
    addCategory: 'Thêm danh mục',
    appInfo: 'Thông tin ứng dụng',
    backupData: 'Sao lưu dữ liệu',
    basicSettings: 'Cài đặt cơ bản',
    calendar: 'Lịch',
    categoryAllTimeReport: 'Báo cáo danh mục toàn kì',
    categoryYearReport: 'Báo cáo danh mục trong năm',
    category: 'Danh mục',
    categoryEditTitle: 'Thêm danh mục',
    categoryName: 'Tên danh mục',
    changeCurrency: 'Thay đổi tiền tệ',
    changeLanguage: 'Thay đổi ngôn ngữ',
    currency: 'Tiền tệ',
    currencyCode: 'Mã tiền tệ',
    currencyHelper: 'Chọn nhanh ở đây hoặc chỉnh chi tiết trong Cài đặt cơ bản.',
    currencySaved: 'Đã lưu tiền tệ.',
    date: 'Ngày',
    delete: 'Xóa',
    display: 'Hiển thị',
    edit: 'Chỉnh sửa',
    exportData: 'Đầu ra dữ liệu',
    expense: 'Chi tiêu',
    expenseAmount: 'Tiền chi',
    help: 'Trợ giúp',
    income: 'Thu nhập',
    incomeAmount: 'Tiền thu',
    languageFailed: 'Không thể lưu ngôn ngữ.',
    languageSaved: 'Đã đổi ngôn ngữ.',
    locale: 'Khu vực',
    more: 'Khác',
    net: 'Tổng',
    noData: 'Không có dữ liệu',
    note: 'Ghi chú',
    notePlaceholder: 'Thêm ghi chú',
    overwrite: 'Ghi đè',
    recordUpdated: 'Đã lưu thay đổi.',
    report: 'Báo cáo',
    reportAllTime: 'Báo cáo toàn kì',
    reportYear: 'Báo cáo trong năm',
    saveCurrency: 'Lưu tiền tệ',
    saveFailed: 'Không thể lưu thay đổi.',
    saveSettings: 'Lưu cài đặt',
    saving: 'Đang lưu...',
    settingsSaved: 'Đã lưu cài đặt.',
    premium: 'Dịch vụ Premium (Không có quảng cáo, v.v.)',
    theme: 'Thay đổi màu chủ đề',
    themeValue: 'Mint teal',
  },
  en: {
    appTitle: 'MoneyNote Ledger',
    addCategory: 'Add category',
    appInfo: 'App information',
    backupData: 'Back up data',
    basicSettings: 'Basic settings',
    calendar: 'Calendar',
    categoryAllTimeReport: 'All-time category report',
    categoryYearReport: 'Yearly category report',
    category: 'Category',
    categoryEditTitle: 'Categories',
    categoryName: 'Category name',
    changeCurrency: 'Change currency',
    changeLanguage: 'Change language',
    currency: 'Currency',
    currencyCode: 'Currency code',
    currencyHelper: 'Change it here quickly, or fine-tune it in Basic settings.',
    currencySaved: 'Currency saved.',
    date: 'Date',
    delete: 'Delete',
    display: 'Display',
    edit: 'Edit',
    exportData: 'Export data',
    expense: 'Expense',
    expenseAmount: 'Expense',
    help: 'Help',
    income: 'Income',
    incomeAmount: 'Income',
    languageFailed: 'Could not save language.',
    languageSaved: 'Language changed.',
    locale: 'Locale',
    more: 'More',
    net: 'Total',
    noData: 'No data',
    note: 'Note',
    notePlaceholder: 'Add a note',
    overwrite: 'Overwrite',
    recordUpdated: 'Changes saved.',
    report: 'Report',
    reportAllTime: 'All-time report',
    reportYear: 'Yearly report',
    saveCurrency: 'Save currency',
    saveFailed: 'Could not save changes.',
    saveSettings: 'Save settings',
    saving: 'Saving...',
    settingsSaved: 'Settings saved.',
    premium: 'Premium service (No ads, etc.)',
    theme: 'Theme color',
    themeValue: 'Mint teal',
  },
} satisfies Record<AppLanguage, Record<string, string>>;

const englishCategoryLabels: Record<string, string> = {
  'expense-clothes': 'Clothes',
  'expense-cosmetics': 'Cosmetics',
  'expense-daily': 'Daily goods',
  'expense-education': 'Education',
  'expense-electricity': 'Electricity',
  'expense-food': 'Food',
  'expense-health': 'Health',
  'expense-phone': 'Phone',
  'expense-rent': 'Rent',
  'expense-social': 'Social',
  'expense-transport': 'Transport',
  'income-allowance': 'Allowance',
  'income-bonus': 'Bonus',
  'income-extra': 'Side income',
  'income-investment': 'Investment',
  'income-salary': 'Salary',
  'income-temporary': 'Temporary income',
};

const quickCurrencyOptions = [
  { code: 'TWD', label: 'NT$', locale: 'zh-TW' },
  { code: 'VND', label: 'VND', locale: 'vi-VN' },
  { code: 'USD', label: 'USD', locale: 'en-US' },
  { code: 'JPY', label: 'JPY', locale: 'ja-JP' },
] as const;

function useMoneyNoteCopy() {
  const language = useAppLanguage();

  return {
    copy: moneyNoteCopy[language],
    language,
  };
}

function languageDisplayName(language: AppLanguage, displayLanguage: AppLanguage): string {
  if (displayLanguage === 'en') {
    return language === 'vi' ? 'Vietnamese' : 'English';
  }

  return language === 'vi' ? 'Tiếng Việt' : 'English';
}

function categoryDisplayLabel(template: MoneyNoteCategoryTemplate, language: AppLanguage): string {
  return language === 'en' ? englishCategoryLabels[template.id] ?? template.label : template.label;
}

type MoneyNoteCategoryOption = MoneyNoteCategoryTemplate & {
  categoryId?: string;
  isCustom?: boolean;
};

function customCategoryPrefix(kind: 'expense' | 'income'): string {
  return `category-moneynote-custom-${kind}`;
}

function categoryBelongsToKind(category: CategoryTopicItem, kind: 'expense' | 'income'): boolean {
  const id = String(category.id);

  if (id.startsWith(customCategoryPrefix(kind))) {
    return true;
  }

  return (
    !id.startsWith(customCategoryPrefix('expense')) &&
    !id.startsWith(customCategoryPrefix('income')) &&
    !allMoneyNoteCategoryTemplates.some((template) => template.label === category.name)
  );
}

function categoryOptionsForKind(
  baseTemplates: MoneyNoteCategoryTemplate[],
  categories: CategoryTopicItem[],
  kind: 'expense' | 'income',
): MoneyNoteCategoryOption[] {
  const customIcon = kind === 'expense' ? 'tag-outline' : 'cash-plus';
  const customColor = kind === 'expense' ? expenseColor : incomeColor;

  return [
    ...baseTemplates,
    ...categories
      .filter((category) => category.archivedAt === null && categoryBelongsToKind(category, kind))
      .map<MoneyNoteCategoryOption>((category) => ({
        categoryId: category.id,
        color: customColor,
        icon: customIcon,
        id: `custom-${category.id}`,
        isCustom: true,
        label: category.name,
      })),
  ];
}

function categoryOptionIdForDraft(
  options: MoneyNoteCategoryOption[],
  categoryId: string | null,
  merchantOrSource: string,
): string {
  return (
    options.find((option) => option.categoryId === categoryId || option.label === merchantOrSource)?.id ??
    options[0]?.id ??
    ''
  );
}

function templateForRecord(record: MoneyRecord): MoneyNoteCategoryTemplate | null {
  return (
    allMoneyNoteCategoryTemplates.find(
      (template) =>
        record.categoryId === `category-moneynote-${template.id}` ||
        record.merchantOrSource === template.label,
    ) ?? null
  );
}

function recordDisplayLabel(record: MoneyRecord, language: AppLanguage, fallback: string): string {
  const template = templateForRecord(record);

  if (template) {
    return categoryDisplayLabel(template, language);
  }

  return record.merchantOrSource ?? fallback;
}

const moneyType = {
  body: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 14,
    fontWeight: '400',
    letterSpacing: 0,
    lineHeight: 22,
  },
  button: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0,
    lineHeight: 20,
  },
  caption: {
    fontFamily: 'Montserrat_500Medium',
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0,
    lineHeight: 17,
  },
  label: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0,
    lineHeight: 22,
  },
  labelSmall: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0,
    lineHeight: 20,
  },
  title: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 0,
    lineHeight: 31,
  },
  titleSmall: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0,
    lineHeight: 25,
  },
} as const;

type MonthDataState = {
  currencyCode: string;
  error?: AppError;
  locale: string;
  records: MoneyRecord[];
  summaries: MoneyHistorySummary[];
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
  const [reloadToken, setReloadToken] = useState(0);
  const [state, setState] = useState<MonthDataState>({
    currencyCode: moneyNoteDefaultPreferences.currencyCode,
    locale: moneyNoteDefaultPreferences.locale,
    records: [],
    summaries: [],
    status: 'loading',
    totals: emptyTotals,
  });
  const preferencesAttempted = useRef(false);
  const focusedOnce = useRef(false);
  const reload = useCallback(() => {
    setReloadToken((current) => current + 1);
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (focusedOnce.current) {
        reload();
        return;
      }

      focusedOnce.current = true;
    }, [reload]),
  );

  useEffect(() => subscribeMoneyRecordsChanged(reload), [reload]);

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
          currencyCode: result.value.preferences.currencyCode,
          locale: result.value.preferences.locale,
          records: result.value.records,
          summaries: result.value.summaries,
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
        currencyCode: moneyNoteDefaultPreferences.currencyCode,
        error: result.error,
        locale: moneyNoteDefaultPreferences.locale,
        records: [],
        summaries: [],
        status: 'failed',
        totals: emptyTotals,
      });
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [monthDate, reloadToken]);

  return state;
}

type MoneyNoteMorePanelKind =
  | 'backup'
  | 'categoryAllTime'
  | 'categoryYear'
  | 'export'
  | 'reportAllTime'
  | 'reportYear';

type MorePanelDataState = {
  currencyCode: string;
  error?: AppError;
  locale: string;
  preferences?: UserPreferences;
  records: MoneyRecord[];
  status: 'failed' | 'idle' | 'loading' | 'ready';
  totalCount: number;
  totals: MoneyNoteTotals;
};

type CategoryReportRow = {
  color: string;
  expenseMinor: number;
  icon: string;
  incomeMinor: number;
  key: string;
  label: string;
};

type ReportBreakdownRow = {
  amountMinor: number;
  color: string;
  icon: string;
  key: string;
  label: string;
  percent: number;
};

type ReportChartSegment = ReportBreakdownRow & {
  connectorPoints: string;
  dashLength: number;
  dashOffset: number;
  labelLeft: number;
  labelTop: number;
};

const morePanelEmptyState: MorePanelDataState = {
  currencyCode: moneyNoteDefaultPreferences.currencyCode,
  locale: moneyNoteDefaultPreferences.locale,
  records: [],
  status: 'idle',
  totalCount: 0,
  totals: emptyTotals,
};

function morePanelRange(panelKind: MoneyNoteMorePanelKind | null): { dateFrom?: string; dateTo?: string } {
  if (panelKind !== 'categoryYear' && panelKind !== 'reportYear') {
    return {};
  }

  const year = new Date().getFullYear();

  return {
    dateFrom: `${year}-01-01`,
    dateTo: `${year}-12-31`,
  };
}

function useMoneyNoteMorePanelData(panelKind: MoneyNoteMorePanelKind | null): MorePanelDataState {
  const [reloadToken, setReloadToken] = useState(0);
  const [state, setState] = useState<MorePanelDataState>(morePanelEmptyState);
  const focusedOnce = useRef(false);
  const reload = useCallback(() => {
    setReloadToken((current) => current + 1);
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (focusedOnce.current) {
        reload();
        return;
      }

      focusedOnce.current = true;
    }, [reload]),
  );

  useEffect(() => subscribeMoneyRecordsChanged(reload), [reload]);

  useEffect(() => {
    if (!panelKind) {
      setState(morePanelEmptyState);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setState((current) => ({ ...current, error: undefined, status: 'loading' }));

      const result = await loadMoneyHistory({
        ...morePanelRange(panelKind),
        limit: 50,
        sort: 'date_desc',
        summaryMode: 'month',
      });

      if (cancelled) {
        return;
      }

      if (result.ok) {
        setState({
          currencyCode: result.value.preferences.currencyCode,
          locale: result.value.preferences.locale,
          preferences: result.value.preferences,
          records: result.value.records,
          status: 'ready',
          totalCount: result.value.page.totalCount,
          totals: totalsFromRecordsOrSummaries(result.value.records, result.value.summaries),
        });
        return;
      }

      setState({
        ...morePanelEmptyState,
        error: result.error,
        status: 'failed',
      });
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [panelKind, reloadToken]);

  return state;
}

function buildCategoryReportRows(records: MoneyRecord[], language: AppLanguage): CategoryReportRow[] {
  const rows = new Map<string, CategoryReportRow>();

  records.forEach((record) => {
    if (record.deletedAt !== null) {
      return;
    }

    const template = templateForRecord(record);
    const key = record.categoryId ?? record.merchantOrSource ?? 'uncategorized';
    const existing =
      rows.get(key) ??
      ({
        color: template?.color ?? skyBlue,
        expenseMinor: 0,
        icon: template?.icon ?? 'tag-outline',
        incomeMinor: 0,
        key,
        label: recordDisplayLabel(record, language, language === 'en' ? 'Uncategorized' : 'Khác'),
      } satisfies CategoryReportRow);

    if (record.kind === 'expense') {
      existing.expenseMinor += record.amountMinor;
    } else {
      existing.incomeMinor += record.amountMinor;
    }

    rows.set(key, existing);
  });

  return Array.from(rows.values()).sort(
    (left, right) =>
      right.expenseMinor + right.incomeMinor - (left.expenseMinor + left.incomeMinor),
  );
}

function buildReportBreakdownRows(
  records: MoneyRecord[],
  kind: 'expense' | 'income',
  language: AppLanguage,
): ReportBreakdownRow[] {
  const rows = new Map<
    string,
    ReportBreakdownRow & {
      order: number;
    }
  >();

  records
    .filter((record) => record.kind === kind && record.deletedAt === null)
    .forEach((record) => {
      const template = templateForRecord(record);
      const key = record.categoryId ?? record.merchantOrSource ?? 'uncategorized';
      const templateIndex = template
        ? allMoneyNoteCategoryTemplates.findIndex((candidate) => candidate.id === template.id)
        : -1;
      const existing =
        rows.get(key) ??
        ({
          amountMinor: 0,
          color: template?.color ?? skyBlue,
          icon: template?.icon ?? 'tag-outline',
          key,
          label: recordDisplayLabel(record, language, language === 'en' ? 'Uncategorized' : 'Khác'),
          order: templateIndex >= 0 ? templateIndex : allMoneyNoteCategoryTemplates.length,
          percent: 0,
        } satisfies ReportBreakdownRow & { order: number });

      existing.amountMinor += record.amountMinor;
      rows.set(key, existing);
    });

  const totalMinor = Array.from(rows.values()).reduce((total, row) => total + row.amountMinor, 0);

  if (totalMinor <= 0) {
    return [];
  }

  return Array.from(rows.values())
    .sort((left, right) => left.order - right.order || right.amountMinor - left.amountMinor)
    .map(({ order: _order, ...row }) => ({
      ...row,
      percent: (row.amountMinor / totalMinor) * 100,
    }))
    .filter((row) => row.amountMinor > 0);
}

function formatReportPercent(value: number, language: AppLanguage): string {
  return `${new Intl.NumberFormat(language === 'en' ? 'en-US' : 'vi-VN', {
    maximumFractionDigits: 1,
    minimumFractionDigits: value < 10 && value % 1 !== 0 ? 1 : 0,
  }).format(value)} %`;
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function pointOnCircle(centerX: number, centerY: number, radius: number, angleDeg: number) {
  const angle = (angleDeg * Math.PI) / 180;

  return {
    x: centerX + Math.cos(angle) * radius,
    y: centerY + Math.sin(angle) * radius,
  };
}

function directionalBendX(startX: number, bendX: number, endX: number, isRightSide: boolean): number {
  // Keep the bend between the donut edge and label so leader lines never kink back inward.
  if (isRightSide) {
    const min = startX + 4;
    const max = endX - 6;

    return max < min ? (startX + endX) / 2 : clampNumber(bendX, min, max);
  }

  const min = endX + 6;
  const max = startX - 4;

  return max < min ? (startX + endX) / 2 : clampNumber(bendX, min, max);
}

function buildReportChartSegments({
  centerX,
  centerY,
  chartHeight,
  chartWidth,
  circumference,
  radius,
  rows,
  strokeWidth,
}: {
  centerX: number;
  centerY: number;
  chartHeight: number;
  chartWidth: number;
  circumference: number;
  radius: number;
  rows: ReportBreakdownRow[];
  strokeWidth: number;
}): ReportChartSegment[] {
  let arcOffset = 0;
  let angleOffset = -90;
  const labelWidth = 84;
  const labelPadding = 8;

  return rows.map((row) => {
    const sweepAngle = (row.percent / 100) * 360;
    const midAngle = angleOffset + sweepAngle / 2;
    const outerRadius = radius + strokeWidth / 2;
    const connectorStart = pointOnCircle(centerX, centerY, outerRadius - 2, midAngle);
    const connectorBend = pointOnCircle(centerX, centerY, outerRadius + 10, midAngle);
    const isRightSide = Math.cos((midAngle * Math.PI) / 180) >= 0;
    const labelLeft = isRightSide ? chartWidth - labelWidth - labelPadding : labelPadding;
    const connectorEndX = isRightSide ? labelLeft - 8 : labelLeft + labelWidth - 8;
    const connectorEndY = connectorBend.y;
    const labelTop = clampNumber(connectorEndY - 25, 8, chartHeight - 58);
    const dashLength = Math.max(0.1, (row.percent / 100) * circumference);
    // Connector geometry is derived from the segment midpoint so the label always describes that exact color.
    const connectorBendX = directionalBendX(
      connectorStart.x,
      connectorBend.x,
      connectorEndX,
      isRightSide,
    );
    const segment = {
      ...row,
      connectorPoints: `${connectorStart.x},${connectorStart.y} ${connectorBendX},${connectorBend.y} ${connectorEndX},${connectorEndY}`,
      dashLength,
      dashOffset: -arcOffset,
      labelLeft,
      labelTop,
    };

    arcOffset += dashLength;
    angleOffset += sweepAngle;

    return segment;
  });
}

function escapeCsvCell(value: unknown): string {
  const text = String(value ?? '');

  return `"${text.replace(/"/g, '""')}"`;
}

function moneyRecordsToCsv(records: MoneyRecord[], language: AppLanguage): string {
  const header = ['date', 'kind', 'category', 'amountMinor', 'currencyCode', 'note'].map(escapeCsvCell);
  const rows = records.map((record) =>
    [
      record.localDate,
      record.kind,
      recordDisplayLabel(record, language, ''),
      record.amountMinor,
      record.currencyCode,
      record.note ?? '',
    ].map(escapeCsvCell),
  );

  return [header, ...rows].map((row) => row.join(',')).join('\n');
}

async function writeMoneyNoteDocument(
  fileBaseName: string,
  extension: 'csv' | 'json',
  contents: string,
): Promise<string> {
  if (!FileSystem.documentDirectory) {
    throw new Error('Document directory is not available.');
  }

  const directory = `${FileSystem.documentDirectory.endsWith('/') ? FileSystem.documentDirectory : `${FileSystem.documentDirectory}/`}moneynote/`;
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const uri = `${directory}${fileBaseName}-${timestamp}.${extension}`;

  await FileSystem.makeDirectoryAsync(directory, {
    intermediates: true,
  });
  await FileSystem.writeAsStringAsync(uri, contents);

  return uri;
}

async function loadMoneyNoteExportSnapshot(panelKind: MoneyNoteMorePanelKind): Promise<{
  preferences: UserPreferences;
  records: MoneyRecord[];
  totalCount: number;
  totals: MoneyNoteTotals;
}> {
  const records: MoneyRecord[] = [];
  let offset = 0;
  let preferences: UserPreferences | null = null;
  let totalCount = 0;

  for (let page = 0; page < 100; page += 1) {
    const result = await loadMoneyHistory({
      ...morePanelRange(panelKind),
      limit: 50,
      offset,
      sort: 'date_desc',
      summaryMode: 'month',
    });

    if (!result.ok) {
      throw new Error(result.error.message);
    }

    preferences = result.value.preferences;
    totalCount = result.value.page.totalCount;
    records.push(...result.value.records);

    if (!result.value.page.hasMore || records.length >= totalCount) {
      break;
    }

    offset += result.value.page.limit;
  }

  if (!preferences) {
    throw new Error('Preferences are not available.');
  }

  return {
    preferences,
    records,
    totalCount,
    totals: calculateMoneyNoteTotals(records),
  };
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
  copy,
  onChange,
}: {
  active: 'expense' | 'income';
  copy: typeof moneyNoteCopy.vi;
  onChange: (kind: 'expense' | 'income') => void;
}) {
  return (
    <View style={styles.kindTabs}>
      <Pressable accessibilityRole="tab" onPress={() => onChange('expense')} style={styles.kindTab}>
        <Text style={[styles.kindTabText, active === 'expense' ? styles.kindTabTextActive : null]}>{copy.expense}</Text>
        <View style={[styles.kindTabLine, active === 'expense' ? styles.kindTabLineActive : null]} />
      </Pressable>
      <Pressable accessibilityRole="tab" onPress={() => onChange('income')} style={styles.kindTab}>
        <Text style={[styles.kindTabText, active === 'income' ? styles.kindTabTextActive : null]}>{copy.income}</Text>
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
  language,
  onEdit,
  onSelect,
  selectedId,
}: {
  categories: MoneyNoteCategoryOption[];
  language: AppLanguage;
  onEdit: () => void;
  onSelect: (category: MoneyNoteCategoryOption) => void;
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
          <Text numberOfLines={2} style={styles.categoryTileLabel}>
            {categoryDisplayLabel(category, language)}
          </Text>
        </Pressable>
      ))}
      <Pressable accessibilityRole="button" onPress={onEdit} style={styles.categoryTile}>
        <Text style={styles.categoryEditText}>{moneyNoteCopy[language].edit}</Text>
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
  const { copy, language } = useMoneyNoteCopy();
  const capture = useManualMoneyCapture();
  const { reload, state, selectCategory, setKind, updateField } = capture;
  const baseTemplates = state.draft.kind === 'expense' ? expenseCategoryTemplates : incomeCategoryTemplates;
  const templates = useMemo(
    () => categoryOptionsForKind(baseTemplates, state.categories, state.draft.kind),
    [baseTemplates, state.categories, state.draft.kind],
  );
  const [selectedTemplateId, setSelectedTemplateId] = useState(templates[0].id);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const selectedTemplate = templates.find((template) => template.id === selectedTemplateId) ?? templates[0];
  const matchingCategory = selectedTemplate.isCustom
    ? null
    : findCategoryByTemplate(state.categories, selectedTemplate);
  const saving = state.status === 'saving';
  const currencyCode = state.preferences?.currencyCode ?? moneyNoteDefaultPreferences.currencyCode;
  const currencySuffix = currencySuffixForCode(currencyCode);
  const currencyUsesPrefix = currencyCode.toUpperCase() !== 'VND';

  useEnsureMoneyNoteDefaults(state.status, state.categories, reload);
  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  useEffect(() => {
    const firstTemplate = templates[0];

    if (!templates.some((template) => template.id === selectedTemplateId)) {
      setSelectedTemplateId(firstTemplate.id);
    }
  }, [selectedTemplateId, templates]);

  useEffect(() => {
    const nextCategoryId = selectedTemplate.categoryId ?? matchingCategory?.id ?? null;

    if (state.draft.categoryId !== nextCategoryId) {
      selectCategory(nextCategoryId);
    }

    if (state.draft.merchantOrSource !== selectedTemplate.label) {
      updateField('merchantOrSource', selectedTemplate.label);
    }
  }, [
    matchingCategory?.id,
    selectCategory,
    selectedTemplate.categoryId,
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

  const selectTemplate = (template: MoneyNoteCategoryOption) => {
    setSelectedTemplateId(template.id);
    const category = template.categoryId ? null : findCategoryByTemplate(state.categories, template);
    selectCategory(template.categoryId ?? category?.id ?? null);
    updateField('merchantOrSource', template.label);
  };

  const openCategories = () => {
    router.push('/categories');
  };

  const changeDateBy = (days: number) => {
    updateField('localDate', shiftLocalDate(state.draft.localDate, days));
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.entryContent} keyboardShouldPersistTaps="handled">
        <ScreenHeader title={copy.appTitle} />
        <KindTabs active={state.draft.kind} copy={copy} onChange={changeKind} />

        <View style={styles.formPanel}>
          <MoneyNoteRow label={copy.date}>
            <IconButton label="<" onPress={() => changeDateBy(-1)} />
            <Pressable
              accessibilityRole="button"
              onPress={() => setDatePickerOpen((current) => !current)}
              style={styles.datePill}>
              <Text numberOfLines={1} style={styles.datePillText}>
                {formatMoneyNoteDate(state.draft.localDate)}
              </Text>
              <MaterialCommunityIcons color={skyBlue} name="calendar-month-outline" size={18} />
            </Pressable>
            <IconButton label=">" onPress={() => changeDateBy(1)} />
          </MoneyNoteRow>
          {datePickerOpen ? (
            <InlineDatePicker
              onSelect={(localDate) => {
                updateField('localDate', localDate);
                setDatePickerOpen(false);
              }}
              value={state.draft.localDate}
            />
          ) : null}

          <MoneyNoteRow label={copy.note}>
            <TextInput
              onChangeText={(value) => updateField('note', value)}
              placeholder={copy.notePlaceholder}
              placeholderTextColor="#BBBBBB"
              style={styles.textInput}
              value={state.draft.note}
            />
          </MoneyNoteRow>

          <MoneyNoteRow label={state.draft.kind === 'expense' ? copy.expenseAmount : copy.incomeAmount}>
            {currencyUsesPrefix ? <Text style={styles.currencyPrefix}>{currencySuffix}</Text> : null}
            <TextInput
              keyboardType="number-pad"
              onChangeText={(value) => updateField('amount', parseMoneyNoteAmountInput(value))}
              placeholder="0"
              placeholderTextColor={ink}
              style={styles.amountInput}
              value={formatMoneyNoteAmountInput(state.draft.amount)}
            />
            {currencyUsesPrefix ? null : <Text style={styles.currencySuffix}>{currencySuffix}</Text>}
          </MoneyNoteRow>
        </View>

        <View style={styles.categorySection}>
          <Text style={styles.sectionLabel}>{copy.category}</Text>
          <CategoryGrid
            categories={templates}
            language={language}
            onEdit={openCategories}
            onSelect={selectTemplate}
            selectedId={selectedTemplate.id}
          />
        </View>

        {state.fieldErrors.amount ? <Text style={styles.warningText}>{state.fieldErrors.amount}</Text> : null}
        {state.actionError ? <Text style={styles.warningText}>{state.actionError.message}</Text> : null}
        {state.status === 'saved' ? (
          <Text style={styles.successText}>
            {language === 'en'
              ? `Saved ${state.draft.kind === 'expense' ? 'expense' : 'income'}.`
              : `Đã lưu ${state.draft.kind === 'expense' ? 'khoản chi' : 'khoản thu'}.`}
          </Text>
        ) : null}

        <Pressable
          accessibilityRole="button"
          disabled={saving || state.status === 'loading'}
          onPress={capture.save}
          style={[styles.primaryCta, saving ? styles.primaryCtaDisabled : null]}>
          <Text style={styles.primaryCtaText}>
            {saving
              ? copy.saving
              : state.draft.kind === 'expense'
                ? language === 'en'
                  ? 'Save Expense'
                  : 'Nhập khoản Tiền chi'
                : language === 'en'
                  ? 'Save Income'
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
        <MaterialCommunityIcons
          color={skyBlue}
          name="calendar-month-outline"
          size={22}
          style={styles.monthPillCalendarIcon}
        />
      </View>
      <IconButton label=">" onPress={() => onChange(shiftMonth(monthDate, 1))} />
    </View>
  );
}

function InlineDatePicker({
  onSelect,
  value,
}: {
  onSelect: (localDate: string) => void;
  value: string;
}) {
  const [visibleMonth, setVisibleMonth] = useState(() => parseLocalDate(value));
  const days = useMemo(() => buildMoneyNoteCalendarMonth(visibleMonth), [visibleMonth]);
  const weekdayLabels = ['T.2', 'T.3', 'T.4', 'T.5', 'T.6', 'T.7', 'CN'];

  useEffect(() => {
    setVisibleMonth(parseLocalDate(value));
  }, [value]);

  return (
    <View style={styles.inlineDatePicker}>
      <MonthSwitcher monthDate={visibleMonth} onChange={setVisibleMonth} />
      <View style={styles.inlineCalendarGrid}>
        {weekdayLabels.map((label) => (
          <View key={label} style={styles.inlineWeekdayCell}>
            <Text style={styles.inlineWeekdayText}>{label}</Text>
          </View>
        ))}
        {days.map((day) => (
          <Pressable
            accessibilityRole="button"
            key={day.localDate}
            onPress={() => onSelect(day.localDate)}
            style={[
              styles.inlineDayCell,
              day.localDate === value ? styles.inlineDayCellSelected : null,
            ]}>
            <Text
              style={[
                styles.inlineDayText,
                !day.inCurrentMonth ? styles.dayTextMuted : null,
                day.dayOfWeek === 6 && day.inCurrentMonth ? styles.saturdayText : null,
                day.dayOfWeek === 0 && day.inCurrentMonth ? styles.sundayText : null,
              ]}>
              {day.dayOfMonth}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function SummaryStrip({
  copy,
  currencyCode,
  locale,
  totals,
}: {
  copy: typeof moneyNoteCopy.vi;
  currencyCode: string;
  locale: string;
  totals: MoneyNoteTotals;
}) {
  const formatAmount = (amountMinor: number) => formatMoneyNoteAmount(amountMinor, { currencyCode, locale });
  const netAmountStyle = totals.netMinor < 0 ? styles.expenseAmount : styles.incomeAmount;

  return (
    <View style={styles.summaryStrip}>
      <View style={styles.summaryCell}>
        <Text style={styles.summaryLabel}>{copy.income}</Text>
        <Text style={[styles.summaryAmount, styles.incomeAmount]}>{formatAmount(totals.incomeMinor)}</Text>
      </View>
      <View style={styles.summaryDivider} />
      <View style={styles.summaryCell}>
        <Text style={styles.summaryLabel}>{copy.expense}</Text>
        <Text style={[styles.summaryAmount, styles.expenseAmount]}>{formatAmount(totals.expenseMinor)}</Text>
      </View>
      <View style={styles.summaryDivider} />
      <View style={styles.summaryCell}>
        <Text style={styles.summaryLabel}>{copy.net}</Text>
        <Text style={[styles.summaryAmount, netAmountStyle]}>{formatAmount(totals.netMinor)}</Text>
      </View>
    </View>
  );
}

export function MoneyNoteCalendarScreen() {
  const router = useRouter();
  const { copy, language } = useMoneyNoteCopy();
  const [monthDate, setMonthDate] = useState(() => new Date());
  const [selectedLocalDate, setSelectedLocalDate] = useState(() => formatLocalDate(new Date()));
  const monthData = useMoneyNoteMonthData(monthDate);
  const days = useMemo(() => buildMoneyNoteCalendarMonth(monthDate), [monthDate]);
  const weekdayLabels = ['T.2', 'T.3', 'T.4', 'T.5', 'T.6', 'T.7', 'CN'];
  const dailyTotals = useMemo(() => {
    if (monthData.summaries.length === 0) {
      return calculateMoneyNoteDailyTotals(monthData.records);
    }

    return monthData.summaries.reduce<Record<string, MoneyNoteTotals>>((totalsByDate, summary) => {
      totalsByDate[summary.key] = {
        expenseMinor: summary.expenseAmountMinor,
        incomeMinor: summary.incomeAmountMinor,
        netMinor: summary.netAmountMinor,
      };
      return totalsByDate;
    }, {});
  }, [monthData.records, monthData.summaries]);
  const selectedTotals = dailyTotals[selectedLocalDate] ?? emptyTotals;
  const selectedRecords = useMemo(
    () => monthData.records.filter((record) => record.localDate === selectedLocalDate),
    [monthData.records, selectedLocalDate],
  );
  const selectedNetStyle = selectedTotals.netMinor < 0 ? styles.expenseAmount : styles.incomeAmount;

  useEffect(() => {
    const bounds = getMonthBounds(monthDate);

    if (selectedLocalDate < bounds.dateFrom || selectedLocalDate > bounds.dateTo) {
      setSelectedLocalDate(bounds.dateFrom);
    }
  }, [monthDate, selectedLocalDate]);

  const selectDay = (localDate: string, inCurrentMonth: boolean) => {
    setSelectedLocalDate(localDate);

    if (!inCurrentMonth) {
      setMonthDate(parseLocalDate(localDate));
    }
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.plainContent}>
        <ScreenHeader title={copy.calendar} />
        <MonthSwitcher monthDate={monthDate} onChange={setMonthDate} />
        <View style={styles.calendarGrid}>
          {weekdayLabels.map((label) => (
            <View key={label} style={styles.weekdayCell}>
              <Text style={[styles.weekdayText, label === 'T.7' ? styles.saturdayText : null, label === 'CN' ? styles.sundayText : null]}>
                {label}
              </Text>
            </View>
          ))}
          {days.map((day) => {
            const dayTotals = dailyTotals[day.localDate];
            const dayNet = dayTotals?.netMinor ?? 0;
            const hasAmount = dayNet !== 0;
            const isSelected = selectedLocalDate === day.localDate;

            return (
            <Pressable
              accessibilityRole="button"
              key={day.localDate}
              onPress={() => selectDay(day.localDate, day.inCurrentMonth)}
              style={[
                styles.dayCell,
                day.isToday && day.inCurrentMonth ? styles.dayCellToday : null,
                isSelected ? styles.dayCellSelected : null,
              ]}>
              <Text
                style={[
                  styles.dayText,
                  !day.inCurrentMonth ? styles.dayTextMuted : null,
                  day.dayOfWeek === 6 && day.inCurrentMonth ? styles.saturdayText : null,
                  day.dayOfWeek === 0 && day.inCurrentMonth ? styles.sundayText : null,
                ]}>
                {day.dayOfMonth}
              </Text>
              {hasAmount ? (
                <Text
                  numberOfLines={1}
                  style={[
                    styles.dayAmountText,
                    dayNet < 0 ? styles.expenseAmount : styles.incomeAmount,
                  ]}>
                  {formatMoneyNoteAmountMagnitude(dayNet, {
                    currencyCode: monthData.currencyCode,
                    locale: monthData.locale,
                  })}
                </Text>
              ) : null}
            </Pressable>
            );
          })}
        </View>

        {monthData.status === 'loading' ? <ActivityIndicator color={skyBlue} /> : null}
        {monthData.status === 'failed' ? (
          <Text style={styles.warningText}>
            {monthData.error?.message ?? (language === 'en' ? 'Could not load data.' : 'Không thể tải dữ liệu.')}
          </Text>
        ) : null}
        <SummaryStrip
          copy={copy}
          currencyCode={monthData.currencyCode}
          locale={monthData.locale}
          totals={monthData.totals}
        />
        <View style={styles.dayRecordSection}>
          <View style={styles.selectedDayHeader}>
            <Text style={styles.selectedDayHeaderText}>{formatMoneyNoteShortDate(selectedLocalDate)}</Text>
            <Text style={[styles.selectedDayHeaderAmount, selectedNetStyle]}>
              {formatMoneyNoteAmount(selectedTotals.netMinor, {
                currencyCode: monthData.currencyCode,
                locale: monthData.locale,
              })}
            </Text>
          </View>
          {selectedRecords.length === 0 ? (
            <Text style={styles.calendarEmptyText}>{copy.noData}</Text>
          ) : null}
          {selectedRecords.map((record) => {
            const template = templateForRecord(record);
            const fallback = record.kind === 'expense' ? copy.expense : copy.income;

            return (
              <Pressable
                accessibilityRole="button"
                key={record.id}
                onPress={() => router.push(`/money/${record.id}`)}
                style={styles.calendarRecordRow}>
                {template ? (
                  <CategoryIcon color={template.color} icon={template.icon} />
                ) : (
                  <MaterialCommunityIcons color={skyBlue} name="cash" size={30} />
                )}
                <Text numberOfLines={1} style={styles.calendarRecordTitle}>
                  {recordDisplayLabel(record, language, fallback)}
                </Text>
                <Text style={[styles.calendarRecordAmount, record.kind === 'expense' ? styles.expenseAmount : styles.incomeAmount]}>
                  {formatMoneyNoteAmount(record.amountMinor, {
                    currencyCode: record.currencyCode,
                    locale: monthData.locale,
                  })}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ReportSummaryCard({
  copy,
  currencyCode,
  locale,
  totals,
}: {
  copy: typeof moneyNoteCopy.vi;
  currencyCode: string;
  locale: string;
  totals: MoneyNoteTotals;
}) {
  const formatAmount = (amountMinor: number) => formatMoneyNoteAmount(amountMinor, { currencyCode, locale });
  const netAmountStyle = totals.netMinor < 0 ? styles.expenseAmount : styles.incomeAmount;

  return (
    <View style={styles.reportCard}>
      <View style={styles.reportTopRow}>
        <View style={styles.reportHalf}>
          <Text style={styles.summaryLabel}>{copy.expense}</Text>
          <Text style={[styles.reportAmount, styles.expenseAmount]}>-{formatAmount(totals.expenseMinor)}</Text>
        </View>
        <View style={styles.reportVerticalLine} />
        <View style={styles.reportHalf}>
          <Text style={styles.summaryLabel}>{copy.income}</Text>
          <Text style={[styles.reportAmount, styles.incomeAmount]}>+{formatAmount(totals.incomeMinor)}</Text>
        </View>
      </View>
      <View style={styles.reportBottomRow}>
        <Text style={styles.summaryLabel}>{copy.net}</Text>
        <Text style={[styles.reportNet, netAmountStyle]}>{formatAmount(totals.netMinor)}</Text>
      </View>
    </View>
  );
}

function ReportChartCallout({
  language,
  segment,
}: {
  language: AppLanguage;
  segment: ReportChartSegment;
}) {
  return (
    <View
      style={[
        styles.reportChartCallout,
        {
          left: segment.labelLeft,
          top: segment.labelTop,
        },
      ]}>
      <View>
        <Text style={styles.reportChartCalloutPercent}>{formatReportPercent(segment.percent, language)}</Text>
        <Text numberOfLines={1} style={styles.reportChartCalloutLabel}>
          {segment.label}
        </Text>
      </View>
    </View>
  );
}

function ReportDonutChart({
  copy,
  language,
  rows,
}: {
  copy: typeof moneyNoteCopy.vi;
  language: AppLanguage;
  rows: ReportBreakdownRow[];
}) {
  const chartHeight = 230;
  const chartWidth = 340;
  const centerX = chartWidth / 2;
  const centerY = chartHeight / 2;
  const radius = 52;
  const strokeWidth = 26;
  const circumference = 2 * Math.PI * radius;
  const segments = buildReportChartSegments({
    centerX,
    centerY,
    chartHeight,
    chartWidth,
    circumference,
    radius,
    rows,
    strokeWidth,
  });
  const calloutSegments = [...segments]
    .sort((left, right) => right.amountMinor - left.amountMinor)
    .slice(0, 2);

  return (
    <View style={styles.reportChartPanel}>
      <View style={styles.reportChartCanvas}>
        <Svg height={chartHeight} width={chartWidth} viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
          <Circle
            cx={centerX}
            cy={centerY}
            fill="none"
            r={radius}
            stroke="#E9EFEF"
            strokeWidth={strokeWidth}
          />
          <G origin={`${centerX}, ${centerY}`} rotation="-90">
            {segments.map((segment) => (
              <Circle
                cx={centerX}
                cy={centerY}
                fill="none"
                key={segment.key}
                r={radius}
                stroke={segment.color}
                strokeDasharray={`${segment.dashLength} ${circumference - segment.dashLength}`}
                strokeDashoffset={segment.dashOffset}
                strokeWidth={strokeWidth}
              />
            ))}
          </G>
          {calloutSegments.map((segment) => (
            <Polyline
              fill="none"
              key={`connector-${segment.key}`}
              points={segment.connectorPoints}
              stroke={segment.color}
              strokeWidth={2}
            />
          ))}
        </Svg>
        <View style={styles.reportChartHole} />
        {calloutSegments.map((segment) => (
          <ReportChartCallout key={`callout-${segment.key}`} language={language} segment={segment} />
        ))}
        {rows.length === 0 ? (
          <Text style={styles.reportChartEmptyText}>{copy.noData}</Text>
        ) : null}
      </View>
    </View>
  );
}

function ReportBreakdownList({
  currencyCode,
  language,
  locale,
  rows,
}: {
  currencyCode: string;
  language: AppLanguage;
  locale: string;
  rows: ReportBreakdownRow[];
}) {
  return (
    <View style={styles.reportBreakdownList}>
      {rows.map((row) => (
        <View key={row.key} style={styles.reportBreakdownRow}>
          <CategoryIcon color={row.color} icon={row.icon} />
          <Text numberOfLines={1} style={styles.reportBreakdownTitle}>
            {row.label}
          </Text>
          <Text style={styles.reportBreakdownAmount}>
            {formatMoneyNoteAmount(row.amountMinor, { currencyCode, locale })}
          </Text>
          <Text style={styles.reportBreakdownPercent}>{formatReportPercent(row.percent, language)}</Text>
          <MaterialCommunityIcons color="#666666" name="chevron-right" size={22} />
        </View>
      ))}
    </View>
  );
}

export function MoneyNoteReportScreen() {
  const { copy, language } = useMoneyNoteCopy();
  const [monthDate, setMonthDate] = useState(() => new Date());
  const [activeKind, setActiveKind] = useState<'expense' | 'income'>('expense');
  const monthData = useMoneyNoteMonthData(monthDate);
  const breakdownRows = useMemo(
    () => buildReportBreakdownRows(monthData.records, activeKind, language),
    [activeKind, language, monthData.records],
  );

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.plainContent}>
        <ScreenHeader title={copy.report} />
        <MonthSwitcher monthDate={monthDate} onChange={setMonthDate} />
        <ReportSummaryCard
          copy={copy}
          currencyCode={monthData.currencyCode}
          locale={monthData.locale}
          totals={monthData.totals}
        />
        <KindTabs active={activeKind} copy={copy} onChange={setActiveKind} />
        <View style={styles.reportBody}>
          {monthData.status === 'loading' ? <ActivityIndicator color={skyBlue} /> : null}
          {monthData.status === 'failed' ? (
            <Text style={styles.warningText}>
              {monthData.error?.message ?? (language === 'en' ? 'Could not load report.' : 'Không thể tải báo cáo.')}
            </Text>
          ) : null}
          {monthData.status === 'ready' ? (
            <>
              <ReportDonutChart copy={copy} language={language} rows={breakdownRows} />
              <ReportBreakdownList
                currencyCode={monthData.currencyCode}
                language={language}
                locale={monthData.locale}
                rows={breakdownRows}
              />
            </>
          ) : null}
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

function MoreToolPanel({
  copy,
  data,
  fileBusy,
  fileError,
  fileMessage,
  kind,
  language,
  onCreateBackup,
  onCreateCsv,
}: {
  copy: typeof moneyNoteCopy.vi;
  data: MorePanelDataState;
  fileBusy: boolean;
  fileError: string | null;
  fileMessage: string | null;
  kind: MoneyNoteMorePanelKind;
  language: AppLanguage;
  onCreateBackup: () => void;
  onCreateCsv: () => void;
}) {
  const categoryRows = buildCategoryReportRows(data.records, language);
  const isCategoryReport = kind === 'categoryAllTime' || kind === 'categoryYear';
  const titleByKind: Record<MoneyNoteMorePanelKind, string> = {
    backup: copy.backupData,
    categoryAllTime: copy.categoryAllTimeReport,
    categoryYear: copy.categoryYearReport,
    export: copy.exportData,
    reportAllTime: copy.reportAllTime,
    reportYear: copy.reportYear,
  };
  const formatAmount = (amountMinor: number) =>
    formatMoneyNoteAmount(amountMinor, {
      currencyCode: data.currencyCode,
      locale: data.locale,
    });
  const recordsLabel =
    language === 'en'
      ? `${data.totalCount} records in this view`
      : `${data.totalCount} bản ghi trong mục này`;

  return (
    <View style={styles.morePanel}>
      <Text style={styles.morePanelTitle}>{titleByKind[kind]}</Text>
      {data.status === 'loading' ? (
        <ActivityIndicator color={skyBlue} />
      ) : null}
      {data.status === 'failed' ? (
        <Text style={styles.warningText}>{data.error?.message ?? copy.saveFailed}</Text>
      ) : null}
      {data.status === 'ready' ? (
        <>
          <SummaryStrip
            copy={copy}
            currencyCode={data.currencyCode}
            locale={data.locale}
            totals={data.totals}
          />
          <Text style={styles.morePanelNote}>{recordsLabel}</Text>
          {isCategoryReport ? (
            <View style={styles.moreReportList}>
              {categoryRows.length === 0 ? (
                <Text style={styles.mutedText}>{copy.noData}</Text>
              ) : null}
              {categoryRows.slice(0, 8).map((row) => (
                <View key={row.key} style={styles.moreReportRow}>
                  <MaterialCommunityIcons
                    color={row.color}
                    name={row.icon as never}
                    size={28}
                    style={styles.moreReportIcon}
                  />
                  <View style={styles.moreReportText}>
                    <Text numberOfLines={1} style={styles.moreReportTitle}>
                      {row.label}
                    </Text>
                    <Text style={styles.moreReportMeta}>
                      {formatAmount(row.incomeMinor)} / {formatAmount(row.expenseMinor)}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.moreReportAmount,
                      row.incomeMinor - row.expenseMinor < 0 ? styles.expenseAmount : styles.incomeAmount,
                    ]}>
                    {formatAmount(row.incomeMinor - row.expenseMinor)}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.moreReportList}>
              {data.records.length === 0 ? <Text style={styles.mutedText}>{copy.noData}</Text> : null}
              {data.records.slice(0, 6).map((record) => (
                <View key={record.id} style={styles.moreReportRow}>
                  <MaterialCommunityIcons
                    color={record.kind === 'expense' ? expenseColor : incomeColor}
                    name={record.kind === 'expense' ? 'arrow-down-circle-outline' : 'arrow-up-circle-outline'}
                    size={28}
                    style={styles.moreReportIcon}
                  />
                  <View style={styles.moreReportText}>
                    <Text numberOfLines={1} style={styles.moreReportTitle}>
                      {recordDisplayLabel(record, language, copy.category)}
                    </Text>
                    <Text style={styles.moreReportMeta}>{formatMoneyNoteShortDate(record.localDate)}</Text>
                  </View>
                  <Text
                    style={[
                      styles.moreReportAmount,
                      record.kind === 'expense' ? styles.expenseAmount : styles.incomeAmount,
                    ]}>
                    {formatAmount(record.kind === 'expense' ? -record.amountMinor : record.amountMinor)}
                  </Text>
                </View>
              ))}
            </View>
          )}
          {kind === 'export' || kind === 'backup' ? (
            <View style={styles.morePanelActions}>
              <Pressable
                accessibilityRole="button"
                disabled={fileBusy || data.records.length === 0}
                onPress={kind === 'export' ? onCreateCsv : onCreateBackup}
                style={[
                  styles.morePanelButton,
                  fileBusy || data.records.length === 0 ? styles.primaryCtaDisabled : null,
                ]}>
                <Text style={styles.morePanelButtonText}>
                  {fileBusy
                    ? copy.saving
                    : kind === 'export'
                      ? language === 'en'
                        ? 'Create CSV'
                        : 'Tạo file CSV'
                      : language === 'en'
                        ? 'Create JSON backup'
                        : 'Tạo bản sao JSON'}
                </Text>
              </Pressable>
              {fileMessage ? <Text style={styles.successTextInline}>{fileMessage}</Text> : null}
              {fileError ? <Text style={styles.warningText}>{fileError}</Text> : null}
            </View>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

export function MoneyNoteMoreScreen() {
  const router = useRouter();
  const { copy, language: appLanguage } = useMoneyNoteCopy();
  const preferences = usePreferenceSettings();
  const [languageOpen, setLanguageOpen] = useState(false);
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [languageStatus, setLanguageStatus] = useState<'failed' | 'idle' | 'saved' | 'saving'>('idle');
  const [activePanel, setActivePanel] = useState<MoneyNoteMorePanelKind | null>(null);
  const [fileBusy, setFileBusy] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [fileMessage, setFileMessage] = useState<string | null>(null);
  const visibleCurrency = preferences.state.form.currencyCode || moneyNoteDefaultPreferences.currencyCode;
  const panelData = useMoneyNoteMorePanelData(activePanel);

  const changeLanguage = useCallback(
    (language: AppLanguage) => {
      if (language === appLanguage) {
        setLanguageStatus('saved');
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

  const selectQuickCurrency = (currency: (typeof quickCurrencyOptions)[number]) => {
    preferences.updateField('currencyCode', currency.code);
    preferences.updateField('locale', currency.locale);

    if (currency.code === 'VND' && preferences.state.form.defaultHourlyWage === '0.00') {
      preferences.updateField('defaultHourlyWage', '0');
    }
  };

  const togglePanel = (panelKind: MoneyNoteMorePanelKind) => {
    setFileBusy(false);
    setFileError(null);
    setFileMessage(null);
    setActivePanel((current) => (current === panelKind ? null : panelKind));
  };

  const createCsvExport = useCallback(async () => {
    if (panelData.status !== 'ready') {
      return;
    }

    setFileBusy(true);
    setFileError(null);
    setFileMessage(null);

    try {
      const snapshot = await loadMoneyNoteExportSnapshot('export');
      const uri = await writeMoneyNoteDocument(
        'moneynote-export',
        'csv',
        moneyRecordsToCsv(snapshot.records, appLanguage),
      );
      setFileMessage(appLanguage === 'en' ? `CSV saved: ${uri}` : `Đã tạo CSV: ${uri}`);
    } catch (error) {
      setFileError(error instanceof Error ? error.message : copy.saveFailed);
    } finally {
      setFileBusy(false);
    }
  }, [appLanguage, copy.saveFailed, panelData.status]);

  const createJsonBackup = useCallback(async () => {
    if (panelData.status !== 'ready') {
      return;
    }

    setFileBusy(true);
    setFileError(null);
    setFileMessage(null);

    try {
      const snapshot = await loadMoneyNoteExportSnapshot('backup');
      const uri = await writeMoneyNoteDocument(
        'moneynote-backup',
        'json',
        JSON.stringify(
          {
            exportedAt: new Date().toISOString(),
            preferences: snapshot.preferences,
            records: snapshot.records,
            totalCount: snapshot.totalCount,
            totals: snapshot.totals,
          },
          null,
          2,
        ),
      );
      setFileMessage(appLanguage === 'en' ? `Backup saved: ${uri}` : `Đã tạo sao lưu: ${uri}`);
    } catch (error) {
      setFileError(error instanceof Error ? error.message : copy.saveFailed);
    } finally {
      setFileBusy(false);
    }
  }, [appLanguage, copy.saveFailed, panelData.status]);

  const renderActivePanel = (panelKind: MoneyNoteMorePanelKind) =>
    activePanel === panelKind ? (
      <MoreToolPanel
        copy={copy}
        data={panelData}
        fileBusy={fileBusy}
        fileError={fileError}
        fileMessage={fileMessage}
        kind={panelKind}
        language={appLanguage}
        onCreateBackup={createJsonBackup}
        onCreateCsv={createCsvExport}
      />
    ) : null;

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.moreContent}>
        <ScreenHeader title={copy.more} />
        <MoreDivider />
        <MoreRow icon="cog-outline" onPress={() => router.push('/preferences')} title={copy.basicSettings} />
        <MoreDivider />
        <MoreRow icon="chart-box-outline" onPress={() => togglePanel('reportYear')} title={copy.reportYear} />
        {renderActivePanel('reportYear')}
        <MoreRow icon="chart-pie" onPress={() => togglePanel('categoryYear')} title={copy.categoryYearReport} />
        {renderActivePanel('categoryYear')}
        <MoreRow icon="chart-box-outline" onPress={() => togglePanel('reportAllTime')} title={copy.reportAllTime} />
        {renderActivePanel('reportAllTime')}
        <MoreRow icon="chart-pie" onPress={() => togglePanel('categoryAllTime')} title={copy.categoryAllTimeReport} />
        {renderActivePanel('categoryAllTime')}
        <MoreDivider />
        <MoreRow icon="download-outline" onPress={() => togglePanel('export')} title={copy.exportData} />
        {renderActivePanel('export')}
        <MoreRow icon="archive-arrow-down-outline" onPress={() => togglePanel('backup')} title={copy.backupData} />
        {renderActivePanel('backup')}
        <MoreDivider />
        <MoreRow icon="help-circle-outline" title={copy.help} />
        <MoreRow icon="information-outline" title={copy.appInfo} />
        <MoreRow
          icon="web"
          onPress={() => setLanguageOpen((current) => !current)}
          right={languageDisplayName(appLanguage, appLanguage)}
          title={copy.changeLanguage}
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
                  {languageDisplayName(option.value, appLanguage)}
                </Text>
              </Pressable>
            ))}
            {languageStatus === 'saving' ? <Text style={styles.mutedText}>{copy.saving}</Text> : null}
            {languageStatus === 'saved' ? <Text style={styles.successTextInline}>{copy.languageSaved}</Text> : null}
            {languageStatus === 'failed' ? (
              <Text style={styles.warningText}>{copy.languageFailed}</Text>
            ) : null}
          </View>
        ) : null}
        <MoreRow
          icon="cash-multiple"
          right={visibleCurrency}
          title={copy.changeCurrency}
          onPress={() => setCurrencyOpen((current) => !current)}
        />
        {currencyOpen ? (
          <View style={styles.currencyPanel}>
            <Text style={styles.preferenceHelper}>{copy.currencyHelper}</Text>
            <View style={styles.currencyOptionRow}>
              {quickCurrencyOptions.map((option) => {
                const selected = preferences.state.form.currencyCode.toUpperCase() === option.code;

                return (
                  <Pressable
                    accessibilityRole="button"
                    key={option.code}
                    onPress={() => selectQuickCurrency(option)}
                    style={[styles.currencyOption, selected ? styles.currencyOptionSelected : null]}>
                    <Text style={[styles.currencyOptionText, selected ? styles.currencyOptionTextSelected : null]}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Pressable
              accessibilityRole="button"
              disabled={preferences.state.status === 'saving'}
              onPress={preferences.save}
              style={[styles.inlineSaveButton, preferences.state.status === 'saving' ? styles.primaryCtaDisabled : null]}>
              <Text style={styles.inlineSaveButtonText}>
                {preferences.state.status === 'saving' ? copy.saving : copy.saveCurrency}
              </Text>
            </Pressable>
            {preferences.state.status === 'saved' ? <Text style={styles.successTextInline}>{copy.currencySaved}</Text> : null}
            {preferences.state.saveError ? <Text style={styles.warningText}>{copy.saveFailed}</Text> : null}
            {Object.keys(preferences.state.fieldErrors).length > 0 ? (
              <Text style={styles.warningText}>{copy.saveFailed}</Text>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function PreferenceField({
  helper,
  keyboardType,
  label,
  onChangeText,
  value,
}: {
  helper?: string;
  keyboardType?: 'decimal-pad' | 'number-pad';
  label: string;
  onChangeText: (value: string) => void;
  value: string;
}) {
  return (
    <View style={styles.preferenceField}>
      <Text style={styles.preferenceLabel}>{label}</Text>
      <TextInput
        autoCapitalize="none"
        keyboardType={keyboardType}
        onChangeText={onChangeText}
        placeholderTextColor={muted}
        style={styles.preferenceInput}
        value={value}
      />
      {helper ? <Text style={styles.preferenceHelper}>{helper}</Text> : null}
    </View>
  );
}

export function MoneyNotePreferencesScreen() {
  const router = useRouter();
  const { save, state, updateField } = usePreferenceSettings();
  const { copy, language: appLanguage } = useMoneyNoteCopy();
  const [languageStatus, setLanguageStatus] = useState<'failed' | 'idle' | 'saved' | 'saving'>('idle');
  const saving = state.status === 'saving';
  const usesWholeUnitCurrency = state.form.currencyCode.toUpperCase() === 'VND';

  const updateCurrency = (value: string) => {
    const normalized = value.replace(/[^a-z]/gi, '').toUpperCase().slice(0, 3);
    updateField('currencyCode', normalized);

    if (normalized === 'TWD') {
      updateField('locale', 'zh-TW');
    }

    if (normalized === 'VND') {
      updateField('locale', 'vi-VN');
      if (state.form.defaultHourlyWage === '0.00') {
        updateField('defaultHourlyWage', '0');
      }
    }
  };

  const updateLanguage = (language: AppLanguage) => {
    if (language === appLanguage) {
      setLanguageStatus('saved');
      return;
    }

    setLanguageStatus('saving');
    void saveStoredAppLanguage(language)
      .then(() => setLanguageStatus('saved'))
      .catch(() => setLanguageStatus('failed'));
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.preferencesContent} keyboardShouldPersistTaps="handled">
        <View style={styles.categoryHeader}>
          <IconButton label="<" onPress={() => router.back()} />
          <Text numberOfLines={1} style={styles.categoryHeaderTitle}>
            {copy.basicSettings}
          </Text>
        </View>

        <View style={styles.preferenceSection}>
          <Text style={styles.preferenceSectionTitle}>{copy.display}</Text>
          <View style={styles.preferenceSegment}>
            {appLanguageOptions.map((option) => {
              const selected = option.value === appLanguage;

              return (
                <Pressable
                  key={option.value}
                  onPress={() => updateLanguage(option.value)}
                  style={[styles.preferenceSegmentOption, selected ? styles.preferenceSegmentOptionActive : null]}>
                  <Text
                    style={[
                      styles.preferenceSegmentLabel,
                      selected ? styles.preferenceSegmentLabelActive : null,
                    ]}>
                    {languageDisplayName(option.value, appLanguage)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {languageStatus === 'saving' ? <Text style={styles.preferenceHelper}>{copy.saving}</Text> : null}
          {languageStatus === 'saved' ? <Text style={styles.successTextInline}>{copy.languageSaved}</Text> : null}
          {languageStatus === 'failed' ? <Text style={styles.warningText}>{copy.languageFailed}</Text> : null}
        </View>

        <View style={styles.preferenceSection}>
          <Text style={styles.preferenceSectionTitle}>{copy.currency}</Text>
          <PreferenceField
            helper={appLanguage === 'en' ? 'Recommended default: TWD.' : 'Mặc định khuyến nghị: TWD.'}
            label={copy.currencyCode}
            onChangeText={updateCurrency}
            value={state.form.currencyCode}
          />
          <PreferenceField
            helper={appLanguage === 'en' ? 'Use zh-TW to display NT$ and Taiwan currency style.' : 'Dùng zh-TW để hiển thị NT$ đúng kiểu Đài Loan.'}
            label={copy.locale}
            onChangeText={(value) => updateField('locale', value)}
            value={state.form.locale}
          />
          <PreferenceField
            helper={appLanguage === 'en' ? 'First day of the monthly reporting cycle.' : 'Ngày bắt đầu chu kỳ báo cáo tháng.'}
            keyboardType="number-pad"
            label={appLanguage === 'en' ? 'Monthly reset day' : 'Ngày chốt tháng'}
            onChangeText={(value) => updateField('monthlyBudgetResetDay', value.replace(/[^\d]/g, ''))}
            value={state.form.monthlyBudgetResetDay}
          />
          <PreferenceField
            helper={appLanguage === 'en' ? 'Leave 0 if you do not use wage tracking.' : 'Có thể để 0 nếu không dùng tính lương.'}
            keyboardType="number-pad"
            label={appLanguage === 'en' ? 'Hourly wage' : 'Lương giờ'}
            onChangeText={(value) =>
              updateField(
                'defaultHourlyWage',
                usesWholeUnitCurrency ? parseMoneyNoteAmountInput(value) || '0' : value,
              )
            }
            value={
              usesWholeUnitCurrency
                ? formatMoneyNoteAmountInput(state.form.defaultHourlyWage)
                : state.form.defaultHourlyWage
            }
          />
          {Object.keys(state.fieldErrors).length > 0 ? (
            <Text style={styles.warningText}>
              {appLanguage === 'en'
                ? 'Check currency, locale, or monthly reset day.'
                : 'Kiểm tra lại tiền tệ, khu vực hoặc ngày chốt tháng.'}
            </Text>
          ) : null}
          {state.saveError ? <Text style={styles.warningText}>{state.saveError.message}</Text> : null}
          {state.status === 'saved' ? <Text style={styles.successText}>{copy.settingsSaved}</Text> : null}

          <Pressable
            accessibilityRole="button"
            disabled={saving}
            onPress={save}
            style={[styles.primaryCta, saving ? styles.primaryCtaDisabled : null]}>
            <Text style={styles.primaryCtaText}>{saving ? copy.saving : copy.saveSettings}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export function MoneyNoteRecordEditScreen() {
  const router = useRouter();
  const { moneyRecordId } = useLocalSearchParams<{ moneyRecordId: string }>();
  const { copy, language } = useMoneyNoteCopy();
  const capture = useManualMoneyCapture();
  const { state, selectCategory, setKind, updateField } = capture;
  const [recordToEdit, setRecordToEdit] = useState<MoneyRecord | null>(null);
  const [recordLoadError, setRecordLoadError] = useState<AppError | null>(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const editStartedFor = useRef<string | null>(null);
  const baseTemplates = state.draft.kind === 'expense' ? expenseCategoryTemplates : incomeCategoryTemplates;
  const templates = useMemo(
    () => categoryOptionsForKind(baseTemplates, state.categories, state.draft.kind),
    [baseTemplates, state.categories, state.draft.kind],
  );
  const selectedTemplateId = categoryOptionIdForDraft(
    templates,
    state.draft.categoryId,
    state.draft.merchantOrSource,
  );
  const selectedTemplate = templates.find((template) => template.id === selectedTemplateId) ?? templates[0];
  const saving = state.status === 'saving';
  const currencyCode = state.preferences?.currencyCode ?? recordToEdit?.currencyCode ?? moneyNoteDefaultPreferences.currencyCode;
  const currencySuffix = currencySuffixForCode(currencyCode);
  const currencyUsesPrefix = currencyCode.toUpperCase() !== 'VND';

  useEnsureMoneyNoteDefaults(state.status, state.categories, capture.reload);

  useEffect(() => {
    if (!moneyRecordId) {
      return;
    }

    let cancelled = false;
    setRecordLoadError(null);
    editStartedFor.current = null;

    void loadManualMoneyRecordForEdit({ id: moneyRecordId }).then((result) => {
      if (cancelled) {
        return;
      }

      if (result.ok) {
        setRecordToEdit(result.value.record);
        return;
      }

      setRecordLoadError(result.error);
    });

    return () => {
      cancelled = true;
    };
  }, [moneyRecordId]);

  useEffect(() => {
    if (!recordToEdit || state.status !== 'ready' || editStartedFor.current === recordToEdit.id) {
      return;
    }

    capture.startEdit(recordToEdit);
    editStartedFor.current = recordToEdit.id;
  }, [capture, recordToEdit, state.status]);

  useEffect(() => {
    if (state.status === 'deleted') {
      router.back();
    }
  }, [router, state.status]);

  useEffect(() => {
    if (state.status === 'saved' && state.lastMutation === 'updated') {
      router.back();
    }
  }, [router, state.lastMutation, state.status]);

  const changeKind = (kind: 'expense' | 'income') => {
    const nextTemplate = kind === 'expense' ? expenseCategoryTemplates[0] : incomeCategoryTemplates[0];
    setKind(kind);
    selectCategory(findCategoryByTemplate(state.categories, nextTemplate)?.id ?? null);
    updateField('merchantOrSource', nextTemplate.label);
  };

  const selectTemplate = (template: MoneyNoteCategoryOption) => {
    const category = template.categoryId ? null : findCategoryByTemplate(state.categories, template);
    selectCategory(template.categoryId ?? category?.id ?? null);
    updateField('merchantOrSource', template.label);
  };

  const changeDateBy = (days: number) => {
    updateField('localDate', shiftLocalDate(state.draft.localDate, days));
  };

  const loading = state.status === 'loading' || (!recordToEdit && !recordLoadError);

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.entryContent} keyboardShouldPersistTaps="handled">
        <View style={styles.categoryHeader}>
          <IconButton label="<" onPress={() => router.back()} />
          <Text numberOfLines={1} style={styles.categoryHeaderTitle}>
            {language === 'en' ? 'Edit' : 'Chỉnh sửa'}
          </Text>
        </View>

        {loading ? <ActivityIndicator color={skyBlue} style={styles.loadingIndicator} /> : null}
        {recordLoadError ? <Text style={styles.warningText}>{recordLoadError.message}</Text> : null}

        {!loading && !recordLoadError ? (
          <>
            <KindTabs active={state.draft.kind} copy={copy} onChange={changeKind} />
            <View style={styles.formPanel}>
              <MoneyNoteRow label={copy.date}>
                <IconButton label="<" onPress={() => changeDateBy(-1)} />
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setDatePickerOpen((current) => !current)}
                  style={styles.datePill}>
                  <Text numberOfLines={1} style={styles.datePillText}>
                    {formatMoneyNoteDate(state.draft.localDate)}
                  </Text>
                  <MaterialCommunityIcons color={skyBlue} name="calendar-month-outline" size={18} />
                </Pressable>
                <IconButton label=">" onPress={() => changeDateBy(1)} />
              </MoneyNoteRow>
              {datePickerOpen ? (
                <InlineDatePicker
                  onSelect={(localDate) => {
                    updateField('localDate', localDate);
                    setDatePickerOpen(false);
                  }}
                  value={state.draft.localDate}
                />
              ) : null}

              <MoneyNoteRow label={copy.note}>
                <TextInput
                  onChangeText={(value) => updateField('note', value)}
                  placeholder={copy.notePlaceholder}
                  placeholderTextColor="#BBBBBB"
                  style={styles.textInput}
                  value={state.draft.note}
                />
              </MoneyNoteRow>

              <MoneyNoteRow label={state.draft.kind === 'expense' ? copy.expenseAmount : copy.incomeAmount}>
                {currencyUsesPrefix ? <Text style={styles.currencyPrefix}>{currencySuffix}</Text> : null}
                <TextInput
                  keyboardType="number-pad"
                  onChangeText={(value) => updateField('amount', parseMoneyNoteAmountInput(value))}
                  placeholder="0"
                  placeholderTextColor={ink}
                  style={styles.amountInput}
                  value={formatMoneyNoteAmountInput(state.draft.amount)}
                />
                {currencyUsesPrefix ? null : <Text style={styles.currencySuffix}>{currencySuffix}</Text>}
              </MoneyNoteRow>
            </View>

            <View style={styles.categorySection}>
              <Text style={styles.sectionLabel}>{copy.category}</Text>
              <CategoryGrid
                categories={templates}
                language={language}
                onEdit={() => router.push('/categories')}
                onSelect={selectTemplate}
                selectedId={selectedTemplate?.id ?? ''}
              />
            </View>

            {state.fieldErrors.amount ? <Text style={styles.warningText}>{state.fieldErrors.amount}</Text> : null}
            {state.actionError ? <Text style={styles.warningText}>{state.actionError.message}</Text> : null}
            {state.status === 'saved' ? <Text style={styles.successText}>{copy.recordUpdated}</Text> : null}

            <Pressable
              accessibilityRole="button"
              disabled={saving}
              onPress={capture.save}
              style={[styles.primaryCta, saving ? styles.primaryCtaDisabled : null]}>
              <Text style={styles.primaryCtaText}>{saving ? copy.saving : copy.overwrite}</Text>
            </Pressable>
            <View style={styles.editFooterActions}>
              <View />
              <Pressable accessibilityRole="button" onPress={capture.deleteEditingRecord}>
                <Text style={styles.deleteActionText}>{copy.delete}</Text>
              </Pressable>
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

export function MoneyNoteCategoryScreen() {
  const router = useRouter();
  const { copy, language } = useMoneyNoteCopy();
  const capture = useManualMoneyCapture();
  const { state } = capture;
  const [activeKind, setActiveKind] = useState<'expense' | 'income'>('expense');
  const [addOpen, setAddOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categoryActionError, setCategoryActionError] = useState<AppError | null>(null);
  const [categoryActionStatus, setCategoryActionStatus] = useState<'idle' | 'saving'>('idle');
  const baseTemplates = activeKind === 'expense' ? expenseCategoryTemplates : incomeCategoryTemplates;
  const templates = useMemo(
    () => categoryOptionsForKind(baseTemplates, state.categories, activeKind),
    [activeKind, baseTemplates, state.categories],
  );

  useEnsureMoneyNoteDefaults(state.status, state.categories, capture.reload);

  const addCategory = () => {
    const name = newCategoryName.trim();

    if (!name) {
      return;
    }

    setCategoryActionError(null);
    setCategoryActionStatus('saving');

    void createCategoryTopicItem(
      { kind: 'category', name },
      { createId: () => `${customCategoryPrefix(activeKind)}-${Date.now().toString(36)}` },
    ).then((result) => {
      setCategoryActionStatus('idle');

      if (result.ok || (!result.ok && result.error.code === 'conflict')) {
        setNewCategoryName('');
        setAddOpen(false);
        capture.reload();
        return;
      }

      setCategoryActionError(result.error);
    });
  };

  const removeCategory = (category: MoneyNoteCategoryOption) => {
    if (!category.categoryId) {
      return;
    }

    setCategoryActionError(null);
    setCategoryActionStatus('saving');

    void deleteCategoryTopicItem({
      id: category.categoryId,
      kind: 'category',
      mode: 'archive',
    }).then((result) => {
      setCategoryActionStatus('idle');

      if (result.ok) {
        capture.reload();
        return;
      }

      setCategoryActionError(result.error);
    });
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.categoryHeader}>
        <IconButton label="<" onPress={() => router.back()} />
        <Text numberOfLines={1} style={styles.categoryHeaderTitle}>
          {copy.categoryEditTitle}
        </Text>
        <IconButton label="+" onPress={() => setAddOpen((current) => !current)} />
      </View>
      <KindTabs active={activeKind} copy={copy} onChange={setActiveKind} />
      <ScrollView contentContainerStyle={styles.categoryListContent}>
        {addOpen ? (
          <View style={styles.addCategoryPanel}>
            <TextInput
              autoFocus
              onChangeText={setNewCategoryName}
              placeholder={copy.categoryName}
              placeholderTextColor={muted}
              style={styles.addCategoryInput}
              value={newCategoryName}
            />
            <Pressable
              accessibilityRole="button"
              disabled={categoryActionStatus === 'saving' || newCategoryName.trim().length === 0}
              onPress={addCategory}
              style={[
                styles.inlineSaveButton,
                categoryActionStatus === 'saving' || newCategoryName.trim().length === 0
                  ? styles.primaryCtaDisabled
                  : null,
              ]}>
              <Text style={styles.inlineSaveButtonText}>
                {categoryActionStatus === 'saving' ? copy.saving : copy.addCategory}
              </Text>
            </Pressable>
          </View>
        ) : null}
        {categoryActionError ? <Text style={styles.warningText}>{categoryActionError.message}</Text> : null}
        {templates.map((template) => (
          <View key={template.id} style={styles.categoryListRow}>
            <CategoryIcon color={template.color} icon={template.icon} />
            <Text style={styles.categoryListTitle}>{categoryDisplayLabel(template, language)}</Text>
            {template.isCustom ? (
              <Pressable accessibilityRole="button" onPress={() => removeCategory(template)}>
                <Text style={styles.deleteActionText}>{copy.delete}</Text>
              </Pressable>
            ) : (
              <Text style={styles.dragHandle}>=</Text>
            )}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  addCategoryInput: {
    ...moneyType.body,
    backgroundColor: '#FFFFFF',
    borderColor: line,
    borderRadius: 10,
    borderWidth: 1,
    color: ink,
    flex: 1,
    minHeight: 44,
    paddingHorizontal: 14,
  },
  addCategoryPanel: {
    alignItems: 'center',
    backgroundColor: panel,
    flexDirection: 'row',
    gap: 10,
    padding: 14,
  },
  amountInput: {
    ...moneyType.title,
    backgroundColor: lightBlue,
    borderRadius: 12,
    color: ink,
    flex: 1,
    minHeight: 48,
    paddingHorizontal: 16,
  },
  calendarGrid: {
    backgroundColor: '#FFFFFF',
    borderTopColor: line,
    borderTopWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  categoryEditText: {
    ...moneyType.labelSmall,
    color: ink,
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
    ...moneyType.title,
    color: ink,
    flex: 1,
  },
  categoryListContent: {
    backgroundColor: '#FFFFFF',
    paddingBottom: 18,
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
    ...moneyType.titleSmall,
    color: ink,
    flex: 1,
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
    borderRadius: 8,
    borderWidth: 1,
    flexBasis: '22%',
    flexGrow: 1,
    height: 84,
    justifyContent: 'center',
    minWidth: 74,
    paddingHorizontal: 6,
  },
  categoryTileLabel: {
    ...moneyType.caption,
    color: ink,
    marginTop: 4,
    textAlign: 'center',
  },
  categoryTileSelected: {
    borderColor: skyBlue,
    borderWidth: 3,
  },
  currencySuffix: {
    ...moneyType.titleSmall,
    color: ink,
    marginLeft: 10,
    textDecorationLine: 'underline',
  },
  currencyPrefix: {
    ...moneyType.titleSmall,
    color: ink,
    marginRight: 10,
  },
  currencyOption: {
    alignItems: 'center',
    borderColor: line,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    minHeight: 42,
    justifyContent: 'center',
  },
  currencyOptionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  currencyOptionSelected: {
    backgroundColor: lightBlue,
    borderColor: skyBlue,
    borderWidth: 2,
  },
  currencyOptionText: {
    ...moneyType.labelSmall,
    color: ink,
  },
  currencyOptionTextSelected: {
    color: skyBlue,
  },
  currencyPanel: {
    backgroundColor: '#FFFFFF',
    gap: 12,
    padding: 16,
  },
  datePill: {
    alignItems: 'center',
    backgroundColor: lightBlue,
    borderRadius: 12,
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
    minHeight: 50,
    paddingHorizontal: 14,
  },
  datePillIcon: {
    color: skyBlue,
    fontSize: 18,
    fontWeight: '700',
  },
  datePillText: {
    ...moneyType.label,
    color: ink,
    flex: 1,
  },
  deleteActionText: {
    ...moneyType.label,
    color: expenseColor,
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
  dayAmountText: {
    ...moneyType.caption,
    alignSelf: 'flex-end',
    marginTop: 'auto',
  },
  dayCellSelected: {
    backgroundColor: lightBlue,
  },
  dayCellToday: {
    backgroundColor: '#EAF7FC',
  },
  dayRecordSection: {
    backgroundColor: '#FFFFFF',
    paddingBottom: 18,
  },
  dayText: {
    ...moneyType.body,
    color: '#555555',
  },
  dayTextMuted: {
    color: '#B7B7B7',
  },
  dragHandle: {
    ...moneyType.titleSmall,
    color: '#666666',
  },
  emptyText: {
    ...moneyType.titleSmall,
    color: '#666666',
    marginTop: 120,
    textAlign: 'center',
  },
  calendarEmptyText: {
    ...moneyType.body,
    color: muted,
    paddingHorizontal: 18,
    paddingVertical: 18,
    textAlign: 'center',
  },
  calendarRecordAmount: {
    ...moneyType.label,
    marginLeft: 10,
  },
  calendarRecordRow: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    gap: 18,
    minHeight: 68,
    paddingHorizontal: 22,
  },
  calendarRecordTitle: {
    ...moneyType.label,
    color: ink,
    flex: 1,
  },
  entryContent: {
    backgroundColor: '#FFFFFF',
    paddingBottom: 18,
  },
  editFooterActions: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 70,
    paddingHorizontal: 30,
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
    ...moneyType.label,
    color: ink,
    width: 86,
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
    ...moneyType.title,
    color: ink,
    flex: 1,
  },
  iconButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
    minWidth: 36,
  },
  iconButtonText: {
    ...moneyType.title,
    color: ink,
  },
  inlineCalendarGrid: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  inlineDatePicker: {
    borderBottomColor: line,
    borderBottomWidth: 1,
    paddingBottom: 10,
  },
  inlineDayCell: {
    alignItems: 'center',
    aspectRatio: 1.35,
    justifyContent: 'center',
    width: `${100 / 7}%`,
  },
  inlineDayCellSelected: {
    backgroundColor: lightBlue,
    borderRadius: 8,
  },
  inlineDayText: {
    ...moneyType.caption,
    color: ink,
  },
  inlineWeekdayCell: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 26,
    width: `${100 / 7}%`,
  },
  inlineWeekdayText: {
    ...moneyType.caption,
    color: muted,
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
    ...moneyType.titleSmall,
    color: '#BBBBBB',
  },
  kindTabTextActive: {
    color: skyBlue,
  },
  kindTabs: {
    backgroundColor: '#FFFFFF',
    borderBottomColor: line,
    borderBottomWidth: 1,
    flexDirection: 'row',
    height: 58,
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
    ...moneyType.body,
    color: ink,
    textAlign: 'center',
  },
  languageOptionTextSelected: {
    color: skyBlue,
    fontWeight: '700',
  },
  languagePanel: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    padding: 14,
  },
  loadingIndicator: {
    marginTop: 32,
  },
  inlineSaveButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: skyBlue,
    borderRadius: 10,
    minHeight: 42,
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  inlineSaveButtonText: {
    ...moneyType.button,
    color: '#FFFFFF',
  },
  monthPill: {
    alignItems: 'center',
    backgroundColor: lightBlue,
    borderRadius: 12,
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 18,
  },
  monthPillCalendarIcon: {
    position: 'absolute',
    right: 22,
  },
  monthPillText: {
    ...moneyType.titleSmall,
    color: ink,
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
    paddingBottom: 18,
  },
  moreDivider: {
    backgroundColor: panel,
    height: 34,
  },
  moreIcon: {
    width: 48,
  },
  moreRight: {
    ...moneyType.body,
    color: ink,
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
    ...moneyType.label,
    color: '#5A5A5A',
    flex: 1,
  },
  morePanel: {
    backgroundColor: '#FFFFFF',
    borderBottomColor: line,
    borderBottomWidth: 1,
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  morePanelActions: {
    gap: 10,
  },
  morePanelButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: skyBlue,
    borderRadius: 10,
    minHeight: 42,
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  morePanelButtonText: {
    ...moneyType.button,
    color: '#FFFFFF',
  },
  morePanelNote: {
    ...moneyType.caption,
    color: muted,
  },
  morePanelTitle: {
    ...moneyType.label,
    color: ink,
  },
  moreReportAmount: {
    ...moneyType.label,
    color: ink,
    marginLeft: 8,
  },
  moreReportIcon: {
    width: 38,
  },
  moreReportList: {
    borderColor: line,
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  moreReportMeta: {
    ...moneyType.caption,
    color: muted,
  },
  moreReportRow: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomColor: line,
    borderBottomWidth: 1,
    flexDirection: 'row',
    minHeight: 58,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  moreReportText: {
    flex: 1,
  },
  moreReportTitle: {
    ...moneyType.label,
    color: ink,
  },
  mutedText: {
    ...moneyType.caption,
    color: muted,
  },
  plainContent: {
    backgroundColor: '#FFFFFF',
    paddingBottom: 18,
  },
  preferenceField: {
    gap: 8,
  },
  preferenceHelper: {
    ...moneyType.caption,
    color: muted,
  },
  preferenceInput: {
    ...moneyType.body,
    backgroundColor: '#FFFFFF',
    borderColor: line,
    borderRadius: 12,
    borderWidth: 1,
    color: ink,
    minHeight: 48,
    paddingHorizontal: 16,
  },
  preferenceLabel: {
    ...moneyType.labelSmall,
    color: ink,
  },
  preferenceSection: {
    backgroundColor: '#FFFFFF',
    borderColor: line,
    borderRadius: 18,
    borderWidth: 1,
    gap: 16,
    marginHorizontal: 20,
    padding: 20,
  },
  preferenceSectionTitle: {
    ...moneyType.titleSmall,
    color: ink,
  },
  preferenceSegment: {
    backgroundColor: lightBlue,
    borderColor: line,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    padding: 8,
  },
  preferenceSegmentLabel: {
    ...moneyType.caption,
    color: '#566666',
  },
  preferenceSegmentLabelActive: {
    color: skyBlue,
  },
  preferenceSegmentOption: {
    alignItems: 'center',
    borderRadius: 12,
    flex: 1,
    minHeight: 44,
    justifyContent: 'center',
  },
  preferenceSegmentOptionActive: {
    backgroundColor: '#FFFFFF',
  },
  preferencesContent: {
    backgroundColor: panel,
    gap: 16,
    paddingBottom: 18,
  },
  primaryCta: {
    alignItems: 'center',
    backgroundColor: skyBlue,
    borderRadius: 12,
    elevation: 3,
    justifyContent: 'center',
    marginHorizontal: 28,
    marginTop: 24,
    minHeight: 48,
    shadowColor: '#000000',
    shadowOpacity: 0.18,
    shadowRadius: 5,
  },
  primaryCtaDisabled: {
    opacity: 0.55,
  },
  primaryCtaText: {
    ...moneyType.button,
    color: '#FFFFFF',
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
    ...moneyType.body,
    color: ink,
    flex: 1,
  },
  reportAmount: {
    ...moneyType.titleSmall,
    marginTop: 8,
  },
  reportBody: {
    backgroundColor: '#FFFFFF',
    minHeight: 360,
  },
  reportBreakdownAmount: {
    ...moneyType.label,
    color: ink,
    marginLeft: 8,
  },
  reportBreakdownList: {
    backgroundColor: '#FFFFFF',
    borderTopColor: line,
    borderTopWidth: 1,
  },
  reportBreakdownPercent: {
    ...moneyType.caption,
    color: '#666666',
    marginLeft: 14,
    minWidth: 52,
    textAlign: 'right',
  },
  reportBreakdownRow: {
    alignItems: 'center',
    borderBottomColor: line,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 12,
    minHeight: 68,
    paddingHorizontal: 18,
  },
  reportBreakdownTitle: {
    ...moneyType.label,
    color: ink,
    flex: 1,
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
  reportChartCallout: {
    width: 84,
    position: 'absolute',
  },
  reportChartCalloutLabel: {
    ...moneyType.label,
    color: '#555555',
  },
  reportChartCalloutPercent: {
    ...moneyType.body,
    color: '#555555',
  },
  reportChartCanvas: {
    alignItems: 'center',
    alignSelf: 'center',
    height: 230,
    justifyContent: 'center',
    maxWidth: 340,
    width: '100%',
  },
  reportChartEmptyText: {
    ...moneyType.body,
    color: muted,
    position: 'absolute',
  },
  reportChartHole: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E9EFEF',
    borderRadius: 39,
    borderWidth: 5,
    height: 78,
    left: '50%',
    marginLeft: -39,
    marginTop: -39,
    position: 'absolute',
    top: '50%',
    width: 78,
  },
  reportChartPanel: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  reportHalf: {
    alignItems: 'center',
    flex: 1,
    paddingVertical: 22,
  },
  reportNet: {
    ...moneyType.title,
    color: ink,
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
    ...moneyType.label,
    color: ink,
  },
  successText: {
    ...moneyType.caption,
    color: '#148B5B',
    marginHorizontal: 28,
    marginTop: 14,
  },
  successTextInline: {
    ...moneyType.caption,
    color: '#148B5B',
  },
  selectedDayHeader: {
    alignItems: 'center',
    backgroundColor: panel,
    flexDirection: 'row',
    minHeight: 48,
    paddingHorizontal: 18,
  },
  selectedDayHeaderAmount: {
    ...moneyType.label,
    marginLeft: 12,
  },
  selectedDayHeaderText: {
    ...moneyType.label,
    color: ink,
    flex: 1,
  },
  summaryAmount: {
    ...moneyType.titleSmall,
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
    ...moneyType.label,
    color: '#333333',
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
    ...moneyType.body,
    backgroundColor: lightBlue,
    borderRadius: 12,
    color: ink,
    flex: 1,
    minHeight: 50,
    paddingHorizontal: 14,
  },
  warningText: {
    ...moneyType.caption,
    color: expenseColor,
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
    ...moneyType.labelSmall,
    color: ink,
  },
});
