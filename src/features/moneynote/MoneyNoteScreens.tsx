import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type DimensionValue,
  useWindowDimensions,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, G, Path } from 'react-native-svg';

import { createAppError, type AppError } from '@/domain/common/app-error';
import type { CategoryTopicItem } from '@/domain/categories/types';
import { journalMoodLabel, moodDefinitionFor } from '@/domain/journal/mood-catalog';
import type { JournalEntry, JournalMoodId } from '@/domain/journal/types';
import type { MoneyHistorySummary } from '@/domain/money/calculations';
import type { MoneyRecord, MoneyRecordKind } from '@/domain/money/types';
import type { UserPreferences } from '@/domain/preferences/types';
import { err, isErr, ok, type AppResult } from '@/domain/common/result';
import {
  createCategoryTopicItem,
  deleteCategoryTopicItem,
} from '@/services/categories/category-topic.service';
import { loadMoneyHistory } from '@/services/money/money-history.service';
import {
  deleteMoneyRecord,
  loadManualMoneyRecordForEdit,
} from '@/services/money/money-record.service';
import { saveUserPreferences } from '@/services/preferences/preferences.service';
import { saveStoredAppLanguage } from '@/i18n/language-storage';
import { appLanguageOptions, useAppLanguage, type AppLanguage } from '@/i18n/strings';
import { useManualMoneyCapture } from '@/features/capture/useManualMoneyCapture';
import {
  notifyMoneyRecordsChanged,
  subscribeMoneyRecordsChanged,
} from '@/features/money/money-record-change-events';
import {
  appBackgroundOptions,
  saveStoredAppBackground,
  saveStoredAppBackgroundPhoto,
  useAppBackground,
  type AppBackgroundId,
} from '@/features/settings/app-background';
import { HeaderLanguageButton } from '@/features/settings/HeaderLanguageButton';
import { MoodFaceIcon } from '@/features/journal/MoodFaceIcon';
import { useJournalOverview } from '@/features/journal/useJournalOverview';
import { AppBackgroundFrame } from '@/features/settings/AppBackgroundFrame';
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
  moneyNoteWeekdayLabelsForLanguage,
  moneyNoteDefaultPreferences,
  monthLabel,
  parseMoneyNoteAmountInput,
  parseLocalDate,
  shiftLocalDate,
  shiftMonth,
  type MoneyNoteCategoryTemplate,
  type MoneyNoteTotals,
} from './moneyNoteModel';
import { MoneyNoteCategoryIcon } from './MoneyNoteCategoryIcons';
import { MoneyNoteSummaryIcon } from './MoneyNoteSummaryIcons';

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
    incomeByMonth: 'Thu nhập theo tháng',
    journal: 'Nhật ký',
    journalNoteFallback: 'Khoảnh khắc trong ngày',
    calendarJournalEmpty: 'Chưa có nhật ký trong ngày',
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
    spendingByMonth: 'Chi tiêu theo tháng',
    saveCurrency: 'Lưu tiền tệ',
    saveFailed: 'Không thể lưu thay đổi.',
    saveSettings: 'Lưu cài đặt',
    saving: 'Đang lưu...',
    settingsSaved: 'Đã lưu cài đặt.',
    premium: 'Dịch vụ Premium (Không có quảng cáo, v.v.)',
    background: 'Thay đổi background',
    backgroundChoosePhoto: 'Chọn ảnh trong máy',
    backgroundDefault: 'Dùng nền mặc định',
    backgroundFailed: 'Không thể đổi background.',
    backgroundFromPhoto: 'Ảnh của bạn',
    backgroundPermissionDenied: 'Hãy cho phép truy cập ảnh để chọn background.',
    backgroundSaved: 'Đã đổi background.',
    theme: 'Thay đổi màu chủ đề',
    themeValue: 'Mint teal',
    allTime: 'Toàn thời gian',
    createCsv: 'Tạo file CSV',
    createJsonBackup: 'Tạo bản sao JSON',
    couldNotLoadData: 'Không thể tải dữ liệu.',
    couldNotLoadReport: 'Không thể tải báo cáo.',
    editTitle: 'Chỉnh sửa',
    initialBalance: 'Số dư ban đầu',
    monthPrefix: 'Tháng',
    recordsInView: 'bản ghi trong mục này',
    saveExpenseCta: 'Nhập khoản Tiền chi',
    saveIncomeCta: 'Nhập khoản Tiền thu',
    savedExpense: 'Đã lưu khoản chi.',
    savedIncome: 'Đã lưu khoản thu.',
    uncategorized: 'Khác',
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
    incomeByMonth: 'Monthly income',
    journal: 'Journal',
    journalNoteFallback: 'Moment from the day',
    calendarJournalEmpty: 'No journal for this day',
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
    spendingByMonth: 'Monthly spending',
    saveCurrency: 'Save currency',
    saveFailed: 'Could not save changes.',
    saveSettings: 'Save settings',
    saving: 'Saving...',
    settingsSaved: 'Settings saved.',
    premium: 'Premium service (No ads, etc.)',
    background: 'Change background',
    backgroundChoosePhoto: 'Choose photo',
    backgroundDefault: 'Use default background',
    backgroundFailed: 'Could not change background.',
    backgroundFromPhoto: 'Your photo',
    backgroundPermissionDenied: 'Allow photo access to choose a background.',
    backgroundSaved: 'Background changed.',
    theme: 'Theme color',
    themeValue: 'Mint teal',
    allTime: 'All time',
    createCsv: 'Create CSV',
    createJsonBackup: 'Create JSON backup',
    couldNotLoadData: 'Could not load data.',
    couldNotLoadReport: 'Could not load report.',
    editTitle: 'Edit',
    initialBalance: 'Initial balance',
    monthPrefix: 'Month',
    recordsInView: 'records in this view',
    saveExpenseCta: 'Save Expense',
    saveIncomeCta: 'Save Income',
    savedExpense: 'Saved expense.',
    savedIncome: 'Saved income.',
    uncategorized: 'Uncategorized',
  },
  'zh-Hant': {
    appTitle: 'MoneyNote 收支簿',
    addCategory: '新增分類',
    appInfo: '應用程式資訊',
    backupData: '備份資料',
    basicSettings: '基本設定',
    calendar: '日曆',
    categoryAllTimeReport: '全期間分類報告',
    categoryYearReport: '年度分類報告',
    category: '分類',
    categoryEditTitle: '分類',
    categoryName: '分類名稱',
    changeCurrency: '變更幣別',
    changeLanguage: '變更語言',
    currency: '幣別',
    currencyCode: '幣別代碼',
    currencyHelper: '可以在這裡快速切換，或到基本設定中細調。',
    currencySaved: '幣別已儲存。',
    date: '日期',
    delete: '刪除',
    display: '顯示',
    edit: '編輯',
    exportData: '匯出資料',
    expense: '支出',
    expenseAmount: '支出金額',
    help: '說明',
    income: '收入',
    incomeAmount: '收入金額',
    incomeByMonth: '每月收入',
    journal: '日記',
    journalNoteFallback: '今天的片刻',
    calendarJournalEmpty: '當日尚無日記',
    languageFailed: '無法儲存語言。',
    languageSaved: '語言已變更。',
    locale: '地區格式',
    more: '更多',
    net: '總計',
    noData: '無資料',
    note: '備註',
    notePlaceholder: '新增備註',
    overwrite: '覆寫',
    recordUpdated: '變更已儲存。',
    report: '報告',
    reportAllTime: '全期間報告',
    reportYear: '年度報告',
    spendingByMonth: '每月支出',
    saveCurrency: '儲存幣別',
    saveFailed: '無法儲存變更。',
    saveSettings: '儲存設定',
    saving: '儲存中...',
    settingsSaved: '設定已儲存。',
    premium: 'Premium 服務（無廣告等）',
    background: '變更背景',
    backgroundChoosePhoto: '選擇照片',
    backgroundDefault: '使用預設背景',
    backgroundFailed: '無法變更背景。',
    backgroundFromPhoto: '你的照片',
    backgroundPermissionDenied: '請允許相簿存取權限，以選擇背景。',
    backgroundSaved: '背景已變更。',
    theme: '主題顏色',
    themeValue: '薄荷青',
    allTime: '全期間',
    createCsv: '建立 CSV',
    createJsonBackup: '建立 JSON 備份',
    couldNotLoadData: '無法載入資料。',
    couldNotLoadReport: '無法載入報告。',
    editTitle: '編輯',
    initialBalance: '期初餘額',
    monthPrefix: '月份',
    recordsInView: '筆紀錄在此檢視中',
    saveExpenseCta: '輸入支出',
    saveIncomeCta: '輸入收入',
    savedExpense: '已儲存支出。',
    savedIncome: '已儲存收入。',
    uncategorized: '未分類',
  },
} satisfies Record<AppLanguage, Record<string, string>>;

const moneyNoteDeleteConfirmCopy = {
  vi: {
    cancel: 'Hủy',
    message: 'Khoản này sẽ bị xóa khỏi sổ thu chi. Bạn có chắc muốn tiếp tục không?',
    title: 'Xóa khoản này?',
  },
  en: {
    cancel: 'Cancel',
    message: 'This record will be removed from your ledger. Are you sure you want to continue?',
    title: 'Delete this record?',
  },
  'zh-Hant': {
    cancel: '取消',
    message: '這筆紀錄將會從收支簿中刪除。確定要繼續嗎？',
    title: '刪除這筆紀錄？',
  },
} satisfies Record<AppLanguage, { cancel: string; message: string; title: string }>;

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

const zhHantCategoryLabels: Record<string, string> = {
  'expense-clothes': '服飾',
  'expense-cosmetics': '美妝',
  'expense-daily': '日用品',
  'expense-education': '教育',
  'expense-electricity': '電費',
  'expense-food': '飲食',
  'expense-health': '醫療',
  'expense-phone': '通訊費',
  'expense-rent': '房租',
  'expense-social': '社交費',
  'expense-transport': '交通',
  'income-allowance': '生活費',
  'income-bonus': '獎金',
  'income-extra': '副收入',
  'income-investment': '投資',
  'income-salary': '薪資',
  'income-temporary': '臨時收入',
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
  const labels = {
    en: {
      en: 'English',
      vi: 'Vietnamese',
      'zh-Hant': 'Traditional Chinese',
    },
    vi: {
      en: 'Tiếng Anh',
      vi: 'Tiếng Việt',
      'zh-Hant': 'Tiếng Trung phồn thể',
    },
    'zh-Hant': {
      en: '英文',
      vi: '越南文',
      'zh-Hant': '繁體中文',
    },
  } satisfies Record<AppLanguage, Record<AppLanguage, string>>;

  return labels[displayLanguage][language];
}

function localeForLanguage(language: AppLanguage): string {
  return language === 'zh-Hant' ? 'zh-TW' : language === 'en' ? 'en-US' : 'vi-VN';
}

function backgroundDisplayName(backgroundId: AppBackgroundId, language: AppLanguage): string {
  const option =
    appBackgroundOptions.find((item) => item.id === backgroundId) ?? appBackgroundOptions[0];
  if (language === 'en') {
    return option.labelEn;
  }

  if (language === 'zh-Hant') {
    const zhLabels: Record<AppBackgroundId, string> = {
      cream: '奶油白',
      lavender: '薰衣草紫',
      mint: '薄荷綠',
      rose: '玫瑰粉',
      sky: '天空藍',
    };
    return zhLabels[option.id];
  }

  return option.labelVi;
}

function categoryDisplayLabel(template: MoneyNoteCategoryTemplate, language: AppLanguage): string {
  if (language === 'en') {
    return englishCategoryLabels[template.id] ?? template.label;
  }

  if (language === 'zh-Hant') {
    return zhHantCategoryLabels[template.id] ?? template.label;
  }

  return template.label;
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
    options.find((option) => option.categoryId === categoryId || option.label === merchantOrSource)
      ?.id ??
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

function reportCategoryKeyForRecord(record: MoneyRecord): string {
  return record.categoryId ?? record.merchantOrSource ?? 'uncategorized';
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

function findCategoryByTemplate(
  categories: CategoryTopicItem[],
  template: MoneyNoteCategoryTemplate,
) {
  return categories.find(
    (category) => category.name === template.label && category.archivedAt === null,
  );
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
    const missing = allMoneyNoteCategoryTemplates.filter(
      (template) => !activeNames.has(template.label),
    );

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

function formatReportMonthParam(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function parseReportMonthParam(value: string | null | undefined): Date {
  const match = value?.match(/^(\d{4})-(\d{2})$/);

  if (!match) {
    return new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);

  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  }

  return new Date(year, month - 1, 1);
}

function searchParamValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function reportCategoryRequestFilter(categoryKey: string): {
  categoryId?: string;
  merchantOrSource?: string;
} {
  if (categoryKey.length === 0 || categoryKey === 'uncategorized') {
    return {};
  }

  if (categoryKey.startsWith('category-')) {
    return { categoryId: categoryKey };
  }

  return { merchantOrSource: categoryKey };
}

function reportCategoryRecordMatches(record: MoneyRecord, kind: MoneyRecordKind, categoryKey: string): boolean {
  return (
    record.deletedAt === null &&
    record.kind === kind &&
    reportCategoryKeyForRecord(record) === categoryKey
  );
}

function useReportCategoryDetailData({
  categoryKey,
  kind,
  monthDate,
}: {
  categoryKey: string;
  kind: MoneyRecordKind;
  monthDate: Date;
}): CategoryDetailDataState {
  const [reloadToken, setReloadToken] = useState(0);
  const [state, setState] = useState<CategoryDetailDataState>({
    currencyCode: moneyNoteDefaultPreferences.currencyCode,
    locale: moneyNoteDefaultPreferences.locale,
    records: [],
    status: 'loading',
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
    const trendStart = shiftMonth(monthDate, -5);
    const rangeStart = getMonthBounds(trendStart).dateFrom;
    const rangeEnd = getMonthBounds(monthDate).dateTo;

    const load = async () => {
      setState((current) => ({ ...current, error: undefined, status: 'loading' }));

      if (categoryKey.length === 0) {
        setState({
          currencyCode: moneyNoteDefaultPreferences.currencyCode,
          locale: moneyNoteDefaultPreferences.locale,
          records: [],
          status: 'ready',
        });
        return;
      }

      const result = await loadMoneyHistory({
        ...reportCategoryRequestFilter(categoryKey),
        dateFrom: rangeStart,
        dateTo: rangeEnd,
        kind,
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
          records: result.value.records.filter((record) =>
            reportCategoryRecordMatches(record, kind, categoryKey),
          ),
          status: 'ready',
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
        status: 'failed',
      });
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [categoryKey, kind, monthDate, reloadToken]);

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

type CategoryDetailDataState = {
  currencyCode: string;
  error?: AppError;
  locale: string;
  records: MoneyRecord[];
  status: 'failed' | 'loading' | 'ready';
};

type CategoryMonthlyTrendRow = {
  amountMinor: number;
  key: string;
  label: string;
  monthDate: Date;
};

type MoneyNoteAnnualReportMode = 'expense' | 'income' | 'net';

type YearlyMonthReportRow = {
  amountMinor: number;
  expenseMinor: number;
  incomeMinor: number;
  label: string;
  month: number;
  netMinor: number;
};

type ReportChartSegment = ReportBreakdownRow & {
  borderColor: string;
  path: string;
  softColor: string;
};

const morePanelEmptyState: MorePanelDataState = {
  currencyCode: moneyNoteDefaultPreferences.currencyCode,
  locale: moneyNoteDefaultPreferences.locale,
  records: [],
  status: 'idle',
  totalCount: 0,
  totals: emptyTotals,
};

function morePanelRange(
  panelKind: MoneyNoteMorePanelKind | null,
  year = new Date().getFullYear(),
): { dateFrom?: string; dateTo?: string } {
  if (panelKind !== 'categoryYear' && panelKind !== 'reportYear') {
    return {};
  }

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

function useMoneyNoteReportData(
  panelKind: MoneyNoteMorePanelKind,
  year?: number,
): MorePanelDataState {
  const [reloadToken, setReloadToken] = useState(0);
  const [state, setState] = useState<MorePanelDataState>({
    ...morePanelEmptyState,
    status: 'loading',
  });
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

    const load = async () => {
      setState((current) => ({ ...current, error: undefined, status: 'loading' }));

      const result = await loadMoneyNoteReportSnapshot(panelKind, year);

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
          totalCount: result.value.totalCount,
          totals: result.value.totals,
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
  }, [panelKind, reloadToken, year]);

  return state;
}

function buildCategoryReportRows(
  records: MoneyRecord[],
  language: AppLanguage,
): CategoryReportRow[] {
  const rows = new Map<string, CategoryReportRow>();

  records.forEach((record) => {
    if (record.deletedAt !== null) {
      return;
    }

    const template = templateForRecord(record);
    const key = reportCategoryKeyForRecord(record);
    const existing =
      rows.get(key) ??
      ({
        color: template?.color ?? skyBlue,
        expenseMinor: 0,
        icon: template?.icon ?? 'tag-outline',
        incomeMinor: 0,
        key,
        label: recordDisplayLabel(record, language, moneyNoteCopy[language].uncategorized),
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
      const key = reportCategoryKeyForRecord(record);
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
          label: recordDisplayLabel(record, language, moneyNoteCopy[language].uncategorized),
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
  return `${new Intl.NumberFormat(localeForLanguage(language), {
    maximumFractionDigits: 1,
    minimumFractionDigits: value < 10 && value % 1 !== 0 ? 1 : 0,
  }).format(value)} %`;
}

function formatReportMagnitude(
  amountMinor: number,
  { currencyCode, locale }: { currencyCode: string; locale: string },
): string {
  const sign = amountMinor < 0 ? '-' : '';

  return `${sign}${formatMoneyNoteAmountMagnitude(amountMinor, { currencyCode, locale })}`;
}

function annualReportModeLabel(
  mode: MoneyNoteAnnualReportMode,
  copy: typeof moneyNoteCopy.vi,
): string {
  if (mode === 'expense') {
    return copy.expense;
  }

  if (mode === 'income') {
    return copy.income;
  }

  return copy.net;
}

function annualReportModeAmount(totals: MoneyNoteTotals, mode: MoneyNoteAnnualReportMode): number {
  if (mode === 'expense') {
    return totals.expenseMinor;
  }

  if (mode === 'income') {
    return totals.incomeMinor;
  }

  return totals.netMinor;
}

function annualReportModeColor(mode: MoneyNoteAnnualReportMode): string {
  if (mode === 'expense') {
    return expenseColor;
  }

  if (mode === 'income') {
    return incomeColor;
  }

  return skyBlue;
}

function buildYearlyMonthReportRows(
  records: MoneyRecord[],
  mode: MoneyNoteAnnualReportMode,
): YearlyMonthReportRow[] {
  const rows = Array.from({ length: 12 }, (_, index) => ({
    amountMinor: 0,
    expenseMinor: 0,
    incomeMinor: 0,
    label: `T${index + 1}`,
    month: index + 1,
    netMinor: 0,
  }));

  records.forEach((record) => {
    if (record.deletedAt !== null) {
      return;
    }

    const monthIndex = Number(record.localDate.slice(5, 7)) - 1;

    if (Number.isNaN(monthIndex) || monthIndex < 0 || monthIndex > 11) {
      return;
    }

    const row = rows[monthIndex];

    if (record.kind === 'expense') {
      row.expenseMinor += record.amountMinor;
    } else {
      row.incomeMinor += record.amountMinor;
    }

    row.netMinor = row.incomeMinor - row.expenseMinor;
  });

  rows.forEach((row) => {
    row.amountMinor = annualReportModeAmount(row, mode);
  });

  return rows;
}

function shiftYear(year: number, years: number): number {
  return year + years;
}

function polarPoint(centerX: number, centerY: number, radius: number, angle: number) {
  const radians = (angle * Math.PI) / 180;

  return {
    x: centerX + Math.cos(radians) * radius,
    y: centerY + Math.sin(radians) * radius,
  };
}

function donutSegmentPath({
  centerX,
  centerY,
  endAngle,
  innerRadius,
  outerRadius,
  startAngle,
}: {
  centerX: number;
  centerY: number;
  endAngle: number;
  innerRadius: number;
  outerRadius: number;
  startAngle: number;
}): string {
  const outerStart = polarPoint(centerX, centerY, outerRadius, startAngle);
  const outerEnd = polarPoint(centerX, centerY, outerRadius, endAngle);
  const innerEnd = polarPoint(centerX, centerY, innerRadius, endAngle);
  const innerStart = polarPoint(centerX, centerY, innerRadius, startAngle);
  const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${innerStart.x} ${innerStart.y}`,
    'Z',
  ].join(' ');
}

function buildReportChartSegments({
  centerX,
  centerY,
  radius,
  rows,
  strokeWidth,
}: {
  centerX: number;
  centerY: number;
  radius: number;
  rows: ReportBreakdownRow[];
  strokeWidth: number;
}): ReportChartSegment[] {
  let angleOffset = -90;
  const innerRadius = radius - strokeWidth / 2;
  const outerRadius = radius + strokeWidth / 2;

  return rows.map((row) => {
    const sweepAngle = Math.max(0.1, (row.percent / 100) * 360);
    const startAngle = angleOffset;
    const endAngle = Math.min(angleOffset + sweepAngle, 269.999);
    const segment = {
      ...row,
      borderColor: '#EDF4F5',
      path: donutSegmentPath({
        centerX,
        centerY,
        endAngle,
        innerRadius,
        outerRadius,
        startAngle,
      }),
      softColor: '#F7FBFB',
    };

    angleOffset += sweepAngle;

    return segment;
  });
}

function escapeCsvCell(value: unknown): string {
  const text = String(value ?? '');

  return `"${text.replace(/"/g, '""')}"`;
}

function moneyRecordsToCsv(records: MoneyRecord[], language: AppLanguage): string {
  const header = ['date', 'kind', 'category', 'amountMinor', 'currencyCode', 'note'].map(
    escapeCsvCell,
  );
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

type MoneyNoteReportSnapshot = {
  preferences: UserPreferences;
  records: MoneyRecord[];
  totalCount: number;
  totals: MoneyNoteTotals;
};

async function loadMoneyNoteReportSnapshot(
  panelKind: MoneyNoteMorePanelKind,
  year?: number,
): Promise<AppResult<MoneyNoteReportSnapshot>> {
  const records: MoneyRecord[] = [];
  let offset = 0;
  let preferences: UserPreferences | null = null;
  let totalCount = 0;

  for (let page = 0; page < 100; page += 1) {
    const result = await loadMoneyHistory({
      ...morePanelRange(panelKind, year),
      limit: 50,
      offset,
      sort: 'date_desc',
      summaryMode: 'month',
    });

    if (!result.ok) {
      return result;
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
    return err(createAppError('unavailable', 'Preferences are not available.', 'settings'));
  }

  return ok({
    preferences,
    records,
    totalCount,
    totals: calculateMoneyNoteTotals(records),
  });
}

async function loadMoneyNoteExportSnapshot(
  panelKind: MoneyNoteMorePanelKind,
): Promise<MoneyNoteReportSnapshot> {
  const snapshot = await loadMoneyNoteReportSnapshot(panelKind);

  if (!snapshot.ok) {
    throw new Error(snapshot.error.message);
  }

  return snapshot.value;
}

function ScreenHeader({
  right,
  title,
  variant = 'default',
}: {
  right?: React.ReactNode;
  title: string;
  variant?: 'default' | 'entry';
}) {
  return (
    <View style={[styles.header, variant === 'entry' ? styles.entryHeader : null]}>
      {variant === 'entry' ? <EntryHeaderDecor /> : null}
      <Text
        adjustsFontSizeToFit
        minimumFontScale={0.82}
        numberOfLines={1}
        style={[styles.headerTitle, variant === 'entry' ? styles.entryHeaderTitle : null]}
      >
        {title}
      </Text>
      {right ? <View style={styles.headerRight}>{right}</View> : null}
    </View>
  );
}

function MoreHeaderButton() {
  const router = useRouter();

  return (
    <Pressable
      accessibilityLabel={moneyNoteCopy[useAppLanguage()].more}
      accessibilityRole="button"
      onPress={() => router.push('/(tabs)/settings')}
      style={styles.moreHeaderButton}
    >
      <View style={styles.moreHeaderButtonInner}>
        <MaterialCommunityIcons color={skyBlue} name="dots-horizontal" size={18} />
      </View>
    </Pressable>
  );
}

function MoneyNoteHeaderActions() {
  return (
    <View style={styles.headerActionGroup}>
      <HeaderLanguageButton />
      <MoreHeaderButton />
    </View>
  );
}

function IconButton({ label, onPress }: { label: string; onPress?: () => void }) {
  const iconName =
    label === '<'
      ? 'chevron-left'
      : label === '>'
        ? 'chevron-right'
        : label === '+'
          ? 'plus'
          : null;

  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.iconButton}>
      {iconName ? (
        <MaterialCommunityIcons color={ink} name={iconName as never} size={22} />
      ) : (
        <Text style={styles.iconButtonText}>{label}</Text>
      )}
    </Pressable>
  );
}

function EntryBackgroundDecor() {
  return (
    <Svg
      height="160"
      pointerEvents="none"
      preserveAspectRatio="none"
      style={styles.entryBackgroundDecor}
      viewBox="0 0 390 160"
      width="100%"
    >
      <Path
        d="M0 70 C30 54 38 24 68 42 C96 58 98 94 128 88 C160 82 167 40 201 48 C236 57 240 102 275 94 C306 88 311 52 339 55 C363 58 374 84 390 91 V160 H0 Z"
        fill="#E9D8FF"
        opacity="0.62"
      />
      <Path
        d="M0 112 C24 92 41 101 55 122 C73 93 99 92 111 124 C136 96 163 99 174 132 C203 108 230 112 244 139 C271 116 300 118 316 145 C344 128 368 132 390 148 V160 H0 Z"
        fill="#D9F9F8"
        opacity="0.92"
      />
      <Path
        d="M0 138 C26 124 43 129 57 153 C78 128 101 132 112 158 H0 Z"
        fill="#FFF5BD"
        opacity="0.78"
      />
      <Path
        d="M302 158 C312 128 344 126 355 151 C368 133 382 132 390 143 V160 H302 Z"
        fill="#FFD9EE"
        opacity="0.85"
      />
    </Svg>
  );
}

function EntryHeaderDecor() {
  return (
    <Svg
      height="100%"
      pointerEvents="none"
      preserveAspectRatio="none"
      style={styles.entryHeaderDecor}
      viewBox="0 0 390 88"
      width="100%"
    >
      <G opacity="0.52">
        <Circle cx="327" cy="22" fill="#B8F0ED" r="5" />
        <Path
          d="M117 18 C119 10 127 10 129 18 C137 18 141 23 137 28 H111 C107 23 109 18 117 18 Z"
          fill="#FFFFFF"
        />
        <Path
          d="M298 3 C301 12 303 14 311 17 C303 20 301 23 298 32 C295 23 293 20 285 17 C293 14 295 12 298 3 Z"
          fill="#FFFFFF"
        />
        <Path
          d="M307 35 C309 41 311 43 316 45 C311 47 309 49 307 55 C305 49 303 47 298 45 C303 43 305 41 307 35 Z"
          fill="#FFFFFF"
        />
      </G>
    </Svg>
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
        <Text style={[styles.kindTabText, active === 'expense' ? styles.kindTabTextActive : null]}>
          {copy.expense}
        </Text>
        <View
          style={[styles.kindTabLine, active === 'expense' ? styles.kindTabLineActive : null]}
        />
      </Pressable>
      <Pressable accessibilityRole="tab" onPress={() => onChange('income')} style={styles.kindTab}>
        <Text style={[styles.kindTabText, active === 'income' ? styles.kindTabTextActive : null]}>
          {copy.income}
        </Text>
        <View style={[styles.kindTabLine, active === 'income' ? styles.kindTabLineActive : null]} />
      </Pressable>
    </View>
  );
}

function CategoryIcon({ icon, size = 44 }: { color?: string; icon: string; size?: number }) {
  return <MoneyNoteCategoryIcon icon={icon} size={size} />;
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
          style={[
            styles.categoryTile,
            selectedId === category.id ? styles.categoryTileSelected : null,
          ]}
        >
          <View style={styles.categoryTileContent}>
            <CategoryIcon color={category.color} icon={category.icon} size={32} />
            <Text ellipsizeMode="tail" numberOfLines={1} style={styles.categoryTileLabel}>
              {categoryDisplayLabel(category, language)}
            </Text>
          </View>
        </Pressable>
      ))}
      <Pressable accessibilityRole="button" onPress={onEdit} style={styles.categoryTile}>
        <View style={styles.categoryTileContent}>
          <MaterialCommunityIcons color="#F3A64D" name="pencil-outline" size={30} />
          <Text ellipsizeMode="tail" numberOfLines={1} style={styles.categoryEditText}>
            {moneyNoteCopy[language].edit}
          </Text>
        </View>
      </Pressable>
    </View>
  );
}

function MoneyNoteRow({
  children,
  label,
  last = false,
}: {
  children: React.ReactNode;
  label: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.formRow, last ? styles.formRowLast : null]}>
      <Text style={styles.formRowLabel}>{label}</Text>
      <View style={styles.formRowBody}>{children}</View>
    </View>
  );
}

export function MoneyNoteEntryScreen() {
  const router = useRouter();
  const { copy, language } = useMoneyNoteCopy();
  const appBackground = useAppBackground();
  const capture = useManualMoneyCapture();
  const { reload, state, selectCategory, setKind, updateField } = capture;
  const baseTemplates =
    state.draft.kind === 'expense' ? expenseCategoryTemplates : incomeCategoryTemplates;
  const templates = useMemo(
    () => categoryOptionsForKind(baseTemplates, state.categories, state.draft.kind),
    [baseTemplates, state.categories, state.draft.kind],
  );
  const [selectedTemplateId, setSelectedTemplateId] = useState(templates[0].id);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const selectedTemplate =
    templates.find((template) => template.id === selectedTemplateId) ?? templates[0];
  const matchingCategory = selectedTemplate.isCustom
    ? null
    : findCategoryByTemplate(state.categories, selectedTemplate);
  const saving = state.status === 'saving';
  const currencyCode = state.preferences?.currencyCode ?? moneyNoteDefaultPreferences.currencyCode;
  const currencySuffix = currencySuffixForCode(currencyCode);
  const currencyUsesPrefix = currencyCode.toUpperCase() !== 'VND';
  const contentBackgroundColor = appBackground.photoUri
    ? 'transparent'
    : appBackground.colors.appBackground;

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
    const nextTemplate =
      kind === 'expense' ? expenseCategoryTemplates[0] : incomeCategoryTemplates[0];
    setSelectedTemplateId(nextTemplate.id);
    setKind(kind);
  };

  const selectTemplate = (template: MoneyNoteCategoryOption) => {
    setSelectedTemplateId(template.id);
    const category = template.categoryId
      ? null
      : findCategoryByTemplate(state.categories, template);
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
    <SafeAreaView
      edges={['top']}
      style={[styles.safeArea, { backgroundColor: appBackground.colors.appBackground }]}
    >
      <AppBackgroundFrame>
        <ScrollView
          contentContainerStyle={[styles.entryContent, { backgroundColor: contentBackgroundColor }]}
          keyboardShouldPersistTaps="handled"
        >
          <ScreenHeader right={<MoneyNoteHeaderActions />} title={copy.appTitle} variant="entry" />

          <View style={styles.entrySheet}>
            {!appBackground.photoUri ? <EntryBackgroundDecor /> : null}
            <KindTabs active={state.draft.kind} copy={copy} onChange={changeKind} />

            <View style={styles.formPanel}>
              <MoneyNoteRow label={copy.date}>
                <IconButton label="<" onPress={() => changeDateBy(-1)} />
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setDatePickerOpen((current) => !current)}
                  style={styles.datePill}
                >
                  <Text
                    adjustsFontSizeToFit
                    minimumFontScale={0.84}
                    numberOfLines={1}
                    style={styles.datePillText}
                  >
                    {formatMoneyNoteDate(state.draft.localDate, language)}
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
                  placeholderTextColor="#AAAAB5"
                  style={styles.textInput}
                  value={state.draft.note}
                />
              </MoneyNoteRow>

              <View style={[styles.formRow, styles.formRowLast]}>
                <Text style={styles.formRowLabel}>
                  {state.draft.kind === 'expense' ? copy.expenseAmount : copy.incomeAmount}
                </Text>
                {currencyUsesPrefix ? (
                  <Text style={styles.amountRowCurrency}>{currencySuffix}</Text>
                ) : null}
                <TextInput
                  keyboardType="number-pad"
                  onChangeText={(value) => updateField('amount', parseMoneyNoteAmountInput(value))}
                  placeholder="0"
                  placeholderTextColor={ink}
                  style={styles.amountInput}
                  value={formatMoneyNoteAmountInput(state.draft.amount)}
                />
                {currencyUsesPrefix ? null : (
                  <Text style={styles.amountRowCurrency}>{currencySuffix}</Text>
                )}
              </View>
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

            {state.fieldErrors.amount ? (
              <Text style={styles.warningText}>{state.fieldErrors.amount}</Text>
            ) : null}
            {state.actionError ? (
              <Text style={styles.warningText}>{state.actionError.message}</Text>
            ) : null}
            {state.status === 'saved' ? (
              <Text style={styles.successText}>
                {state.draft.kind === 'expense' ? copy.savedExpense : copy.savedIncome}
              </Text>
            ) : null}

            <Pressable
              accessibilityRole="button"
              disabled={saving || state.status === 'loading'}
              onPress={capture.save}
              style={[
                styles.primaryCta,
                styles.entryPrimaryCta,
                saving ? styles.primaryCtaDisabled : null,
              ]}
            >
              <Text style={[styles.primaryCtaText, styles.entryPrimaryCtaText]}>
                {saving
                  ? copy.saving
                  : state.draft.kind === 'expense'
                    ? copy.saveExpenseCta
                    : copy.saveIncomeCta}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </AppBackgroundFrame>
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
  const language = useAppLanguage();
  const [visibleMonth, setVisibleMonth] = useState(() => parseLocalDate(value));
  const days = useMemo(() => buildMoneyNoteCalendarMonth(visibleMonth), [visibleMonth]);
  const weekdayLabels = moneyNoteWeekdayLabelsForLanguage(language, { startsOnMonday: true });

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
            ]}
          >
            <Text
              style={[
                styles.inlineDayText,
                !day.inCurrentMonth ? styles.dayTextMuted : null,
                day.dayOfWeek === 6 && day.inCurrentMonth ? styles.saturdayText : null,
                day.dayOfWeek === 0 && day.inCurrentMonth ? styles.sundayText : null,
              ]}
            >
              {day.dayOfMonth}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

type CalendarDetailTab = 'journal' | 'spending';

function CalendarPageHeader({ title }: { title: string }) {
  return (
    <View style={styles.calendarPageHeader}>
      <View>
        <Text numberOfLines={1} style={styles.calendarPageTitle}>
          {title}
        </Text>
      </View>
      <MoneyNoteHeaderActions />
    </View>
  );
}

function CalendarMonthSwitcher({
  displayLocalDate,
  language,
  monthDate,
  onChange,
}: {
  displayLocalDate?: string;
  language: AppLanguage;
  monthDate: Date;
  onChange: (date: Date) => void;
}) {
  const dateLabel = formatMoneyNoteDate(displayLocalDate ?? formatLocalDate(monthDate), language);

  return (
    <View style={styles.calendarMonthSwitcher}>
      <Pressable
        accessibilityRole="button"
        onPress={() => onChange(shiftMonth(monthDate, -1))}
        style={styles.calendarStepButton}
      >
        <MaterialCommunityIcons color="#18325C" name="chevron-left" size={30} />
      </Pressable>
      <View style={styles.calendarMonthPill}>
        <Text
          adjustsFontSizeToFit
          minimumFontScale={0.84}
          numberOfLines={1}
          style={styles.calendarMonthText}
        >
          {dateLabel}
        </Text>
        <MaterialCommunityIcons
          color="#20C8C4"
          name="calendar-month-outline"
          size={18}
          style={styles.calendarMonthIcon}
        />
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={() => onChange(shiftMonth(monthDate, 1))}
        style={styles.calendarStepButton}
      >
        <MaterialCommunityIcons color="#18325C" name="chevron-right" size={30} />
      </Pressable>
    </View>
  );
}

function CalendarDetailTabs({
  active,
  copy,
  onChange,
}: {
  active: CalendarDetailTab;
  copy: typeof moneyNoteCopy.vi;
  onChange: (tab: CalendarDetailTab) => void;
}) {
  return (
    <View style={styles.calendarDetailTabs}>
      <Pressable
        accessibilityRole="tab"
        onPress={() => onChange('spending')}
        style={[
          styles.calendarDetailTab,
          active === 'spending' ? styles.calendarDetailTabActive : null,
        ]}
      >
        <MaterialCommunityIcons
          color={active === 'spending' ? '#14BBB7' : '#9AA4B5'}
          name="wallet-outline"
          size={24}
        />
        <Text
          style={[
            styles.calendarDetailTabText,
            active === 'spending' ? styles.calendarDetailTabTextActive : null,
          ]}
        >
          {copy.expense}
        </Text>
      </Pressable>
      <Pressable
        accessibilityRole="tab"
        onPress={() => onChange('journal')}
        style={[
          styles.calendarDetailTab,
          active === 'journal' ? styles.calendarDetailTabActive : null,
        ]}
      >
        <MaterialCommunityIcons
          color={active === 'journal' ? '#14BBB7' : '#18325C'}
          name="book-open-variant-outline"
          size={24}
        />
        <Text
          style={[
            styles.calendarDetailTabText,
            active === 'journal' ? styles.calendarDetailTabTextActive : null,
          ]}
        >
          {copy.journal}
        </Text>
        {active === 'journal' ? (
          <View style={styles.calendarJournalHeart}>
            <MaterialCommunityIcons color="#FF4F77" name="heart" size={20} />
          </View>
        ) : null}
      </Pressable>
    </View>
  );
}

function ReportPageHeader({ title }: { title: string }) {
  return (
    <View style={styles.reportPageHeader}>
      <Text numberOfLines={1} style={styles.reportPageTitle}>
        {title}
      </Text>
      <MoneyNoteHeaderActions />
    </View>
  );
}

function ReportKindTabs({
  active,
  copy,
  onChange,
}: {
  active: 'expense' | 'income';
  copy: typeof moneyNoteCopy.vi;
  onChange: (kind: 'expense' | 'income') => void;
}) {
  return (
    <View style={styles.reportKindTabs}>
      <Pressable
        accessibilityRole="tab"
        onPress={() => onChange('expense')}
        style={styles.reportKindTab}
      >
        <Text
          style={[
            styles.reportKindTabText,
            active === 'expense' ? styles.reportKindTabTextActive : null,
          ]}
        >
          {copy.expense}
        </Text>
        <View
          style={[
            styles.reportKindTabLine,
            active === 'expense' ? styles.reportKindTabLineActive : null,
          ]}
        />
      </Pressable>
      <Pressable
        accessibilityRole="tab"
        onPress={() => onChange('income')}
        style={styles.reportKindTab}
      >
        <Text
          style={[
            styles.reportKindTabText,
            active === 'income' ? styles.reportKindTabTextActive : null,
          ]}
        >
          {copy.income}
        </Text>
        <View
          style={[
            styles.reportKindTabLine,
            active === 'income' ? styles.reportKindTabLineActive : null,
          ]}
        />
      </Pressable>
    </View>
  );
}

function CalendarSummaryMetricCard({
  amount,
  icon,
  label,
  tone,
}: {
  amount: string;
  icon: 'expense' | 'income' | 'total';
  label: string;
  tone: 'expense' | 'income' | 'total';
}) {
  const amountStyle =
    tone === 'expense'
      ? styles.calendarMetricAmountExpense
      : tone === 'income'
        ? styles.calendarMetricAmountIncome
        : styles.calendarMetricAmountTotal;
  const cardStyle =
    tone === 'expense'
      ? styles.calendarMetricCardExpense
      : tone === 'income'
        ? styles.calendarMetricCardIncome
        : styles.calendarMetricCardTotal;

  return (
    <View style={[styles.calendarMetricCard, cardStyle]}>
      <MoneyNoteSummaryIcon name={icon} size={34} />
      <View style={styles.calendarMetricText}>
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.72}
          style={[styles.calendarMetricLabel, amountStyle]}
        >
          {label}
        </Text>
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.72}
          style={[styles.calendarMetricAmount, amountStyle]}
        >
          {amount}
        </Text>
      </View>
    </View>
  );
}

function CalendarRecordTable({
  copy,
  currencyCode,
  language,
  locale,
  onRecordPress,
  records,
  selectedLocalDate,
  selectedTotals,
}: {
  copy: typeof moneyNoteCopy.vi;
  currencyCode: string;
  language: AppLanguage;
  locale: string;
  onRecordPress: (record: MoneyRecord) => void;
  records: MoneyRecord[];
  selectedLocalDate: string;
  selectedTotals: MoneyNoteTotals;
}) {
  const selectedNetStyle = selectedTotals.netMinor < 0 ? styles.expenseAmount : styles.incomeAmount;

  return (
    <View style={styles.calendarRecordTable}>
      <View style={styles.calendarRecordTableDateRow}>
        <MaterialCommunityIcons color="#18325C" name="calendar-month" size={18} />
        <Text style={styles.calendarRecordDateText}>
          {formatMoneyNoteShortDate(selectedLocalDate, language)}
        </Text>
      </View>
      <View style={styles.calendarRecordTableInner}>
        <View style={styles.calendarRecordTableHeader}>
          <Text style={styles.calendarRecordTableHeaderText}>
            {formatMoneyNoteShortDate(selectedLocalDate, language)}
          </Text>
          <Text style={[styles.calendarRecordTableHeaderAmount, selectedNetStyle]}>
            {formatMoneyNoteAmount(selectedTotals.netMinor, { currencyCode, locale })}
          </Text>
        </View>
        {records.length === 0 ? <Text style={styles.calendarEmptyText}>{copy.noData}</Text> : null}
        {records.map((record) => {
          const template = templateForRecord(record);
          const fallback = record.kind === 'expense' ? copy.expense : copy.income;

          return (
            <Pressable
              accessibilityRole="button"
              key={record.id}
              onPress={() => onRecordPress(record)}
              style={styles.calendarRecordTableRow}
            >
              {template ? (
                <CategoryIcon color={template.color} icon={template.icon} />
              ) : (
                <MaterialCommunityIcons
                  color={record.kind === 'expense' ? expenseColor : incomeColor}
                  name="cash"
                  size={30}
                />
              )}
              <Text numberOfLines={1} style={styles.calendarRecordTableTitle}>
                {recordDisplayLabel(record, language, fallback)}
              </Text>
              <Text
                style={[
                  styles.calendarRecordTableAmount,
                  record.kind === 'expense' ? styles.expenseAmount : styles.incomeAmount,
                ]}
              >
                {formatMoneyNoteAmount(record.amountMinor, {
                  currencyCode: record.currencyCode,
                  locale,
                })}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function CalendarSpendingPanel({
  copy,
  currencyCode,
  language,
  locale,
  onRecordPress,
  records,
  selectedLocalDate,
  selectedTotals,
}: {
  copy: typeof moneyNoteCopy.vi;
  currencyCode: string;
  language: AppLanguage;
  locale: string;
  onRecordPress: (record: MoneyRecord) => void;
  records: MoneyRecord[];
  selectedLocalDate: string;
  selectedTotals: MoneyNoteTotals;
}) {
  const formatAmount = (amountMinor: number) =>
    formatMoneyNoteAmount(amountMinor, { currencyCode, locale });

  return (
    <View style={styles.calendarDetailBody}>
      <View style={styles.calendarMetricRow}>
        <CalendarSummaryMetricCard
          amount={formatAmount(selectedTotals.incomeMinor)}
          icon="income"
          label={copy.income}
          tone="income"
        />
        <CalendarSummaryMetricCard
          amount={formatAmount(selectedTotals.expenseMinor)}
          icon="expense"
          label={copy.expense}
          tone="expense"
        />
        <CalendarSummaryMetricCard
          amount={formatAmount(selectedTotals.netMinor)}
          icon="total"
          label={copy.net}
          tone="total"
        />
      </View>
      <CalendarRecordTable
        copy={copy}
        currencyCode={currencyCode}
        language={language}
        locale={locale}
        onRecordPress={onRecordPress}
        records={records}
        selectedLocalDate={selectedLocalDate}
        selectedTotals={selectedTotals}
      />
    </View>
  );
}

function CalendarMoodPill({
  language,
  moodId,
}: {
  language: AppLanguage;
  moodId: JournalMoodId;
}) {
  const mood = moodDefinitionFor(moodId);

  return (
    <View style={[styles.calendarMoodPill, { backgroundColor: mood.softColor }]}>
      <MoodFaceIcon moodId={moodId} size={24} />
      <Text style={[styles.calendarMoodPillText, { color: mood.color }]}>
        {journalMoodLabel(mood, language)}
      </Text>
    </View>
  );
}

function CalendarJournalRow({
  copy,
  entry,
  isLast,
}: {
  copy: typeof moneyNoteCopy.vi;
  entry: JournalEntry;
  isLast: boolean;
}) {
  const note = entry.note?.trim() || copy.journalNoteFallback;

  return (
    <View style={styles.calendarJournalRow}>
      <View style={styles.calendarJournalTimeColumn}>
        <Text style={styles.calendarJournalTimeText}>{entry.localTime}</Text>
        <View style={styles.calendarJournalDot} />
        {isLast ? null : <View style={styles.calendarJournalLine} />}
      </View>
      <MoodFaceIcon moodId={entry.moodId} size={50} />
      <View style={styles.calendarJournalNoteWrap}>
        <Text numberOfLines={2} style={styles.calendarJournalNote}>
          {note}
        </Text>
      </View>
      <Image
        source={{ uri: entry.photoUri }}
        style={styles.calendarJournalThumb}
        transition={140}
      />
    </View>
  );
}

function CalendarJournalPanel({
  copy,
  entries,
  language,
  selectedLocalDate,
}: {
  copy: typeof moneyNoteCopy.vi;
  entries: JournalEntry[];
  language: AppLanguage;
  selectedLocalDate: string;
}) {
  const moodId = entries[0]?.moodId;

  return (
    <View style={styles.calendarDetailBody}>
      <View style={styles.calendarJournalCard}>
        <View style={styles.calendarJournalCardHeader}>
          {moodId ? <CalendarMoodPill language={language} moodId={moodId} /> : <View />}
          <View style={styles.calendarJournalDateBadge}>
            <MaterialCommunityIcons color="#18325C" name="calendar-month" size={18} />
            <Text style={styles.calendarRecordDateText}>
              {formatMoneyNoteShortDate(selectedLocalDate, language)}
            </Text>
          </View>
        </View>
        {entries.length === 0 ? (
          <Text style={styles.calendarEmptyText}>{copy.calendarJournalEmpty}</Text>
        ) : null}
        {entries.map((entry, index) => (
          <CalendarJournalRow
            copy={copy}
            entry={entry}
            isLast={index === entries.length - 1}
            key={entry.id}
          />
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
  const formatAmount = (amountMinor: number) =>
    formatMoneyNoteAmount(amountMinor, { currencyCode, locale });
  const netAmountStyle = totals.netMinor < 0 ? styles.expenseAmount : styles.incomeAmount;

  return (
    <View style={styles.summaryStrip}>
      <View style={styles.summaryCell}>
        <Text style={styles.summaryLabel}>{copy.income}</Text>
        <Text style={[styles.summaryAmount, styles.incomeAmount]}>
          {formatAmount(totals.incomeMinor)}
        </Text>
      </View>
      <View style={styles.summaryDivider} />
      <View style={styles.summaryCell}>
        <Text style={styles.summaryLabel}>{copy.expense}</Text>
        <Text style={[styles.summaryAmount, styles.expenseAmount]}>
          {formatAmount(totals.expenseMinor)}
        </Text>
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
  const appBackground = useAppBackground();
  const { width: viewportWidth } = useWindowDimensions();
  const [monthDate, setMonthDate] = useState(() => new Date());
  const [selectedLocalDate, setSelectedLocalDate] = useState(() => formatLocalDate(new Date()));
  const [detailTab, setDetailTab] = useState<CalendarDetailTab>('spending');
  const monthData = useMoneyNoteMonthData(monthDate);
  const days = useMemo(() => buildMoneyNoteCalendarMonth(monthDate), [monthDate]);
  const weekdayLabels = moneyNoteWeekdayLabelsForLanguage(language, { startsOnMonday: true });
  const selectedJournalDate = useMemo(() => parseLocalDate(selectedLocalDate), [selectedLocalDate]);
  const journalOverview = useJournalOverview(selectedJournalDate, monthDate);
  const journalEntries = journalOverview.state.data?.entries ?? [];
  const journalMoodByDate = useMemo(() => {
    const dayMoods = journalOverview.state.data?.monthSummary.dayMoods ?? [];

    return new Map<string, (typeof dayMoods)[number]>(
      dayMoods.map((item) => [String(item.localDate), item]),
    );
  }, [journalOverview.state.data]);
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
  const contentBackgroundColor = 'transparent';
  const calendarDayCellSize = useMemo(() => Math.floor((viewportWidth - 42) / 7), [viewportWidth]);

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
    <SafeAreaView
      edges={['top']}
      style={[styles.safeArea, { backgroundColor: appBackground.colors.appBackground }]}
    >
      <AppBackgroundFrame>
        <ScrollView
          contentContainerStyle={[
            styles.plainContent,
            styles.calendarContent,
            { backgroundColor: contentBackgroundColor },
          ]}
        >
          <CalendarPageHeader title={copy.calendar} />
          <CalendarMonthSwitcher
            displayLocalDate={selectedLocalDate}
            language={language}
            monthDate={monthDate}
            onChange={setMonthDate}
          />
          <View style={styles.calendarGrid}>
            {weekdayLabels.map((label, index) => (
              <View key={label} style={styles.weekdayCell}>
                <Text
                  style={[
                    styles.weekdayText,
                    index === 5 ? styles.saturdayText : null,
                    index === 6 ? styles.sundayText : null,
                  ]}
                >
                  {label}
                </Text>
              </View>
            ))}
            {days.map((day) => {
              const dayTotals = dailyTotals[day.localDate];
              const dayNet = dayTotals?.netMinor ?? 0;
              const hasAmount = dayNet !== 0;
              const isSelected = selectedLocalDate === day.localDate;
              const mood = journalMoodByDate.get(day.localDate);

              return (
                <Pressable
                  accessibilityRole="button"
                  key={day.localDate}
                  onPress={() => selectDay(day.localDate, day.inCurrentMonth)}
                  style={[
                    styles.dayCell,
                    { height: calendarDayCellSize, width: calendarDayCellSize },
                    day.isToday && day.inCurrentMonth ? styles.dayCellToday : null,
                  ]}
                >
                  <View
                    style={[styles.calendarDayTile, isSelected ? styles.dayCellSelected : null]}
                  >
                    <View style={styles.calendarDayHeader}>
                      <Text
                        style={[
                          styles.dayText,
                          !day.inCurrentMonth ? styles.dayTextMuted : null,
                          day.dayOfWeek === 6 && day.inCurrentMonth ? styles.saturdayText : null,
                          day.dayOfWeek === 0 && day.inCurrentMonth ? styles.sundayText : null,
                        ]}
                      >
                        {day.dayOfMonth}
                      </Text>
                      {mood ? <MoodFaceIcon moodId={mood.moodId} size={16} /> : null}
                    </View>
                    {hasAmount ? (
                      <Text
                        adjustsFontSizeToFit
                        minimumFontScale={0.72}
                        numberOfLines={1}
                        style={[
                          styles.dayAmountText,
                          dayNet < 0 ? styles.expenseAmount : styles.incomeAmount,
                        ]}
                      >
                        {formatMoneyNoteAmountMagnitude(dayNet, {
                          currencyCode: monthData.currencyCode,
                          locale: monthData.locale,
                        })}
                      </Text>
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </View>

          {monthData.status === 'loading' ? <ActivityIndicator color={skyBlue} /> : null}
          {monthData.status === 'failed' ? (
            <Text style={styles.warningText}>
              {monthData.error?.message ?? copy.couldNotLoadData}
            </Text>
          ) : null}
          <View style={styles.calendarDetailPanel}>
            <CalendarDetailTabs active={detailTab} copy={copy} onChange={setDetailTab} />
            {detailTab === 'spending' ? (
              <CalendarSpendingPanel
                copy={copy}
                currencyCode={monthData.currencyCode}
                language={language}
                locale={monthData.locale}
                onRecordPress={(record) => router.push(`/money/${record.id}`)}
                records={selectedRecords}
                selectedLocalDate={selectedLocalDate}
                selectedTotals={selectedTotals}
              />
            ) : (
              <CalendarJournalPanel
                copy={copy}
                entries={journalEntries}
                language={language}
                selectedLocalDate={selectedLocalDate}
              />
            )}
          </View>
        </ScrollView>
      </AppBackgroundFrame>
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
  const formatAmount = (amountMinor: number) =>
    formatMoneyNoteAmount(amountMinor, { currencyCode, locale });
  const netAmountStyle = totals.netMinor < 0 ? styles.expenseAmount : styles.incomeAmount;

  return (
    <View style={styles.reportCard}>
      <View style={styles.reportTopRow}>
        <View style={styles.reportHalf}>
          <Text style={styles.reportSummaryLabel}>{copy.expense}</Text>
          <Text style={[styles.reportAmount, styles.expenseAmount]}>
            -{formatAmount(totals.expenseMinor)}
          </Text>
        </View>
        <View style={styles.reportVerticalLine} />
        <View style={styles.reportHalf}>
          <Text style={styles.reportSummaryLabel}>{copy.income}</Text>
          <Text style={[styles.reportAmount, styles.incomeAmount]}>
            +{formatAmount(totals.incomeMinor)}
          </Text>
        </View>
      </View>
      <View style={styles.reportBottomRow}>
        <MaterialCommunityIcons color="#BCEDE8" name="star-four-points" size={22} />
        <Text style={styles.reportSummaryLabel}>{copy.net}</Text>
        <Text style={[styles.reportNet, netAmountStyle]}>{formatAmount(totals.netMinor)}</Text>
        <MaterialCommunityIcons color="#BCEDE8" name="star-four-points" size={22} />
      </View>
    </View>
  );
}

function ReportChartCallout({
  language,
  segment,
  slot,
}: {
  language: AppLanguage;
  segment: ReportChartSegment;
  slot: ReportCalloutSlot;
}) {
  return (
    <View
      style={[
        styles.reportChartCallout,
        styles[`reportChartCallout${slot}`],
        { backgroundColor: segment.softColor, borderColor: segment.borderColor },
      ]}
    >
      <View style={[styles.reportChartCalloutDot, { backgroundColor: segment.color }]} />
      <CategoryIcon icon={segment.icon} size={32} />
      <View style={styles.reportChartCalloutTextWrap}>
        <Text numberOfLines={1} style={styles.reportChartCalloutLabel}>
          {segment.label}
        </Text>
        <Text numberOfLines={1} style={[styles.reportChartCalloutPercent, { color: segment.color }]}>
          {formatReportPercent(segment.percent, language)}
        </Text>
      </View>
    </View>
  );
}

const reportDonutPalette = [
  { borderColor: '#F8DCE7', color: '#EE6C9B', softColor: '#FFF5F8' },
  { borderColor: '#D9F0FA', color: '#58C2DE', softColor: '#F2FAFF' },
  { borderColor: '#F7DED4', color: '#FF8065', softColor: '#FFF5F0' },
  { borderColor: '#D8F3EF', color: '#56D1C5', softColor: '#F2FCFA' },
  { borderColor: '#FFE9BC', color: '#F8BA4E', softColor: '#FFF9EA' },
  { borderColor: '#E3DCFF', color: '#9788F3', softColor: '#F6F3FF' },
];
const reportCalloutSlots = ['BottomRight', 'BottomLeft', 'TopLeft', 'TopRight'] as const;
type ReportCalloutSlot = (typeof reportCalloutSlots)[number];

function sortReportChartRows(rows: ReportBreakdownRow[]): ReportBreakdownRow[] {
  return [...rows].sort((left, right) => right.amountMinor - left.amountMinor);
}

function reportChartColorByKey(rows: ReportBreakdownRow[]): Map<string, string> {
  return new Map(
    sortReportChartRows(rows).map((row, index) => [
      row.key,
      reportDonutPalette[index % reportDonutPalette.length].color,
    ]),
  );
}

function reportDetailMonthChip(monthDate: Date, language: AppLanguage): string {
  if (language === 'en') {
    return monthDate.toLocaleDateString('en-US', { month: 'short' });
  }

  if (language === 'zh-Hant') {
    return `${monthDate.getMonth() + 1}月`;
  }

  return `T${monthDate.getMonth() + 1}`;
}

function reportTrendMonthLabel(monthDate: Date, language: AppLanguage): string {
  const month = monthDate.getMonth() + 1;

  if (language === 'en') {
    return month === 1
      ? `${monthDate.getFullYear()}`
      : monthDate.toLocaleDateString('en-US', { month: 'short' });
  }

  if (language === 'zh-Hant') {
    return month === 1 ? `${monthDate.getFullYear()}/01` : `${month}月`;
  }

  return month === 1 ? `01/${monthDate.getFullYear()}` : `T${month}`;
}

function buildCategoryTrendRows(
  records: MoneyRecord[],
  monthDate: Date,
  language: AppLanguage,
): CategoryMonthlyTrendRow[] {
  return Array.from({ length: 6 }, (_, index) => {
    const rowMonth = shiftMonth(monthDate, index - 5);
    const monthKey = formatReportMonthParam(rowMonth);
    const amountMinor = records
      .filter((record) => record.localDate.slice(0, 7) === monthKey)
      .reduce((total, record) => total + record.amountMinor, 0);

    return {
      amountMinor,
      key: monthKey,
      label: reportTrendMonthLabel(rowMonth, language),
      monthDate: rowMonth,
    };
  });
}

function niceChartStep(rawStep: number): number {
  if (rawStep <= 0) {
    return 100;
  }

  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const normalized = rawStep / magnitude;
  const niceNormalized =
    normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 2.5 ? 2.5 : normalized <= 5 ? 5 : 10;

  return niceNormalized * magnitude;
}

function groupRecordsByLocalDate(records: MoneyRecord[]): { localDate: string; records: MoneyRecord[] }[] {
  const grouped = new Map<string, MoneyRecord[]>();

  records.forEach((record) => {
    const existing = grouped.get(record.localDate) ?? [];
    existing.push(record);
    grouped.set(record.localDate, existing);
  });

  return Array.from(grouped.entries()).map(([localDate, groupedRecords]) => ({
    localDate,
    records: groupedRecords,
  }));
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
  const chartHeight = 296;
  const chartWidth = 344;
  const centerX = chartWidth / 2;
  const centerY = chartHeight / 2;
  const radius = 60;
  const strokeWidth = 28;
  const chartRows = sortReportChartRows(rows);
  const segments = buildReportChartSegments({
    centerX,
    centerY,
    radius,
    rows: chartRows,
    strokeWidth,
  }).map((segment, index) => ({
    ...segment,
    borderColor: reportDonutPalette[index % reportDonutPalette.length].borderColor,
    color: reportDonutPalette[index % reportDonutPalette.length].color,
    softColor: reportDonutPalette[index % reportDonutPalette.length].softColor,
  }));
  const calloutSegments = segments.slice(0, 4);
  const centerSegment = chartRows[0];

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
          {segments.map((segment) => (
            <Path
              d={segment.path}
              fill={segment.color}
              key={segment.key}
              stroke="#FFFFFF"
              strokeLinejoin="round"
              strokeWidth={2}
            />
          ))}
        </Svg>
        <View style={styles.reportChartHole}>
          {centerSegment ? <CategoryIcon icon={centerSegment.icon} size={58} /> : null}
        </View>
        {calloutSegments.map((segment, index) => (
          <ReportChartCallout
            key={`callout-${segment.key}`}
            language={language}
            segment={segment}
            slot={reportCalloutSlots[index]}
          />
        ))}
        {rows.length === 0 ? <Text style={styles.reportChartEmptyText}>{copy.noData}</Text> : null}
      </View>
    </View>
  );
}

function ReportBreakdownList({
  currencyCode,
  language,
  locale,
  onRowPress,
  rows,
}: {
  currencyCode: string;
  language: AppLanguage;
  locale: string;
  onRowPress?: (row: ReportBreakdownRow) => void;
  rows: ReportBreakdownRow[];
}) {
  if (rows.length === 0) {
    return (
      <View style={styles.reportBreakdownList}>
        <Text style={styles.reportEmptyListText}>{moneyNoteCopy[language].noData}</Text>
      </View>
    );
  }

  const displayRows = sortReportChartRows(rows);
  const chartColorByKey = reportChartColorByKey(rows);

  return (
    <View style={styles.reportBreakdownList}>
      {displayRows.slice(0, 6).map((row, index) => (
        <Pressable
          accessibilityRole={onRowPress ? 'button' : undefined}
          disabled={!onRowPress}
          key={row.key}
          onPress={onRowPress ? () => onRowPress(row) : undefined}
          style={[
            styles.reportBreakdownRow,
            index === Math.min(displayRows.length, 6) - 1 ? styles.reportBreakdownRowLast : null,
          ]}
        >
          <View
            style={[
              styles.reportBreakdownColorDot,
              { backgroundColor: chartColorByKey.get(row.key) ?? row.color },
            ]}
          />
          <CategoryIcon icon={row.icon} size={42} />
          <Text numberOfLines={1} style={styles.reportBreakdownTitle}>
            {row.label}
          </Text>
          <Text style={styles.reportBreakdownAmount}>
            {formatMoneyNoteAmount(row.amountMinor, { currencyCode, locale })}
          </Text>
          <Text style={styles.reportBreakdownPercent}>
            {formatReportPercent(row.percent, language)}
          </Text>
          <MaterialCommunityIcons color="#666666" name="chevron-right" size={22} />
        </Pressable>
      ))}
    </View>
  );
}

export function MoneyNoteReportScreen() {
  const { copy, language } = useMoneyNoteCopy();
  const router = useRouter();
  const appBackground = useAppBackground();
  const [monthDate, setMonthDate] = useState(() => new Date());
  const [activeKind, setActiveKind] = useState<'expense' | 'income'>('expense');
  const monthData = useMoneyNoteMonthData(monthDate);
  const breakdownRows = useMemo(
    () => buildReportBreakdownRows(monthData.records, activeKind, language),
    [activeKind, language, monthData.records],
  );
  const chartColorByKey = useMemo(() => reportChartColorByKey(breakdownRows), [breakdownRows]);
  const openCategoryDetail = useCallback(
    (row: ReportBreakdownRow) => {
      const params = new URLSearchParams({
        categoryKey: row.key,
        color: chartColorByKey.get(row.key) ?? row.color,
        icon: row.icon,
        kind: activeKind,
        label: row.label,
        month: formatReportMonthParam(monthDate),
      });

      router.push(`/report-category-detail?${params.toString()}` as never);
    },
    [activeKind, chartColorByKey, monthDate, router],
  );
  const contentBackgroundColor = 'transparent';

  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.safeArea, { backgroundColor: appBackground.colors.appBackground }]}
    >
      <AppBackgroundFrame>
        <ScrollView
          contentContainerStyle={[
            styles.reportContent,
            { backgroundColor: contentBackgroundColor },
          ]}
        >
          <ReportPageHeader title={copy.report} />
          <CalendarMonthSwitcher
            language={language}
            monthDate={monthDate}
            onChange={setMonthDate}
          />
          <ReportSummaryCard
            copy={copy}
            currencyCode={monthData.currencyCode}
            locale={monthData.locale}
            totals={monthData.totals}
          />
          <ReportKindTabs active={activeKind} copy={copy} onChange={setActiveKind} />
          <View style={styles.reportBody}>
            {monthData.status === 'loading' ? <ActivityIndicator color={skyBlue} /> : null}
            {monthData.status === 'failed' ? (
              <Text style={styles.warningText}>
                {monthData.error?.message ?? copy.couldNotLoadReport}
              </Text>
            ) : null}
            {monthData.status === 'ready' ? (
              <>
                <ReportDonutChart copy={copy} language={language} rows={breakdownRows} />
                <ReportBreakdownList
                  currencyCode={monthData.currencyCode}
                  language={language}
                  locale={monthData.locale}
                  onRowPress={openCategoryDetail}
                  rows={breakdownRows}
                />
              </>
            ) : null}
          </View>
        </ScrollView>
      </AppBackgroundFrame>
    </SafeAreaView>
  );
}

function CategoryDetailTrendChart({
  accentColor,
  copy,
  currencyCode,
  kind,
  language,
  locale,
  rows,
}: {
  accentColor: string;
  copy: typeof moneyNoteCopy.vi;
  currencyCode: string;
  kind: MoneyRecordKind;
  language: AppLanguage;
  locale: string;
  rows: CategoryMonthlyTrendRow[];
}) {
  const maxMinor = Math.max(...rows.map((row) => row.amountMinor), 0);
  const stepMinor = niceChartStep(maxMinor / 6);
  const scaleMaxMinor = stepMinor * 6;
  const gridValues = [6, 5, 4, 3, 2, 1, 0].map((step) => stepMinor * step);
  const title = kind === 'expense' ? copy.spendingByMonth : copy.incomeByMonth;

  return (
    <View style={styles.categoryDetailChartCard}>
      <View style={styles.categoryDetailChartHeader}>
        <View style={styles.categoryDetailChartIcon}>
          <MaterialCommunityIcons color={skyBlue} name="chart-bar" size={22} />
        </View>
        <Text style={styles.categoryDetailChartTitle}>{title}</Text>
      </View>
      <View style={styles.categoryTrendChartArea}>
        <View style={styles.categoryTrendYAxis}>
          {gridValues.map((value) => (
            <Text key={value} numberOfLines={1} style={styles.categoryTrendYAxisLabel}>
              {formatMoneyNoteAmount(value, { currencyCode, locale })}
            </Text>
          ))}
        </View>
        <View style={styles.categoryTrendPlot}>
          <View pointerEvents="none" style={styles.categoryTrendGrid}>
            {gridValues.map((value) => (
              <View key={value} style={styles.categoryTrendGridLine} />
            ))}
          </View>
          <View style={styles.categoryTrendBarsLayer}>
            {rows.map((row) => {
              const barHeightPercent =
                row.amountMinor === 0 ? 0 : Math.max(3, (row.amountMinor / scaleMaxMinor) * 100);
              const valueLabelBottom: DimensionValue =
                row.amountMinor === 0 ? 16 : `${Math.min(92, barHeightPercent + 4)}%`;

              return (
                <View key={row.key} style={styles.categoryTrendBarSlot}>
                  <Text
                    adjustsFontSizeToFit
                    minimumFontScale={0.72}
                    numberOfLines={1}
                    style={[
                      styles.categoryTrendBarValue,
                      { bottom: valueLabelBottom, color: accentColor },
                    ]}
                  >
                    {formatMoneyNoteAmount(row.amountMinor, { currencyCode, locale })}
                  </Text>
                  <View
                    style={[
                      styles.categoryTrendBar,
                      {
                        backgroundColor: accentColor,
                        height: `${barHeightPercent}%`,
                        opacity: row.amountMinor === 0 ? 0 : 1,
                      },
                    ]}
                  />
                  <View style={[styles.categoryTrendDot, { backgroundColor: skyBlue }]} />
                </View>
              );
            })}
          </View>
        </View>
      </View>
      <View style={styles.categoryTrendXAxis}>
        <View style={styles.categoryTrendXAxisSpacer} />
        {rows.map((row) => (
          <Text key={row.key} numberOfLines={1} style={styles.categoryTrendXAxisLabel}>
            {row.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

function CategoryDetailRecordGroups({
  accentColor,
  currencyCode,
  icon,
  kind,
  label,
  language,
  locale,
  onRecordPress,
  records,
}: {
  accentColor: string;
  currencyCode: string;
  icon: string;
  kind: MoneyRecordKind;
  label: string;
  language: AppLanguage;
  locale: string;
  onRecordPress: (record: MoneyRecord) => void;
  records: MoneyRecord[];
}) {
  const groups = groupRecordsByLocalDate(records);

  return (
    <View style={styles.categoryDetailRecordList}>
      {groups.map((group) => {
        const totalMinor = group.records.reduce((total, record) => total + record.amountMinor, 0);
        const signedTotalMinor = kind === 'expense' ? -totalMinor : totalMinor;

        return (
          <View key={group.localDate} style={styles.categoryDetailRecordCard}>
            <View style={styles.categoryDetailRecordDateRow}>
              <View style={styles.categoryDetailDateLeft}>
                <MaterialCommunityIcons color={skyBlue} name="calendar-month-outline" size={24} />
                <Text numberOfLines={1} style={styles.categoryDetailRecordDateText}>
                  {formatMoneyNoteDate(group.localDate, language)}
                </Text>
              </View>
              <Text
                numberOfLines={1}
                style={[
                  styles.categoryDetailRecordDateAmount,
                  kind === 'expense' ? styles.expenseAmount : styles.incomeAmount,
                ]}
              >
                {formatMoneyNoteAmount(signedTotalMinor, { currencyCode, locale })}
              </Text>
            </View>
            {group.records.map((record) => (
              <Pressable
                accessibilityRole="button"
                key={record.id}
                onPress={() => onRecordPress(record)}
                style={styles.categoryDetailRecordRow}
              >
                <View style={styles.categoryDetailRecordIconWrap}>
                  <CategoryIcon icon={icon} size={40} />
                </View>
                <Text numberOfLines={1} style={styles.categoryDetailRecordTitle}>
                  {label}
                </Text>
                <MaterialCommunityIcons
                  color={accentColor}
                  name="star-four-points"
                  size={18}
                  style={styles.categoryDetailRecordSpark}
                />
                <Text numberOfLines={1} style={styles.categoryDetailRecordAmount}>
                  {formatMoneyNoteAmount(record.amountMinor, {
                    currencyCode: record.currencyCode,
                    locale,
                  })}
                </Text>
              </Pressable>
            ))}
          </View>
        );
      })}
    </View>
  );
}

export function MoneyNoteReportCategoryDetailScreen() {
  const { copy, language } = useMoneyNoteCopy();
  const router = useRouter();
  const appBackground = useAppBackground();
  const params = useLocalSearchParams<{
    categoryKey?: string;
    color?: string;
    icon?: string;
    kind?: MoneyRecordKind;
    label?: string;
    month?: string;
  }>();
  const categoryKey = searchParamValue(params.categoryKey) ?? '';
  const kind = searchParamValue(params.kind) === 'income' ? 'income' : 'expense';
  const label = searchParamValue(params.label) ?? copy.category;
  const icon = searchParamValue(params.icon) ?? (kind === 'expense' ? 'tag-outline' : 'cash-plus');
  const accentColor = searchParamValue(params.color) ?? (kind === 'expense' ? expenseColor : incomeColor);
  const monthDate = useMemo(
    () => parseReportMonthParam(searchParamValue(params.month)),
    [params.month],
  );
  const data = useReportCategoryDetailData({ categoryKey, kind, monthDate });
  const selectedMonthKey = formatReportMonthParam(monthDate);
  const selectedRecords = useMemo(
    () => data.records.filter((record) => record.localDate.slice(0, 7) === selectedMonthKey),
    [data.records, selectedMonthKey],
  );
  const trendRows = useMemo(
    () => buildCategoryTrendRows(data.records, monthDate, language),
    [data.records, language, monthDate],
  );
  const selectedTotalMinor = selectedRecords.reduce((total, record) => total + record.amountMinor, 0);

  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.safeArea, { backgroundColor: appBackground.colors.appBackground }]}
    >
      <AppBackgroundFrame>
        <ScrollView contentContainerStyle={styles.categoryDetailContent}>
          <View style={styles.categoryDetailHero}>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.back()}
              style={styles.categoryDetailBackButton}
            >
              <MaterialCommunityIcons color="#043D3D" name="arrow-left" size={23} />
            </Pressable>
            <View style={styles.categoryDetailHeroMain}>
              <CategoryIcon icon={icon} size={56} />
              <View style={styles.categoryDetailHeroTextColumn}>
                <Text
                  adjustsFontSizeToFit
                  minimumFontScale={0.68}
                  numberOfLines={1}
                  style={styles.categoryDetailTitle}
                >
                  {label}
                </Text>
                <View style={styles.categoryDetailChips}>
                  <View style={styles.categoryDetailAmountChip}>
                    <Text
                      numberOfLines={1}
                      style={[styles.categoryDetailAmountChipText, { color: accentColor }]}
                    >
                      {formatMoneyNoteAmount(selectedTotalMinor, {
                        currencyCode: data.currencyCode,
                        locale: data.locale,
                      })}
                    </Text>
                  </View>
                  <View style={styles.categoryDetailMonthChip}>
                    <Text style={styles.categoryDetailMonthChipText}>
                      {reportDetailMonthChip(monthDate, language)}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
            <MaterialCommunityIcons
              color="#A5E4DE"
              name="star-four-points"
              size={20}
              style={styles.categoryDetailHeroStar}
            />
            <MaterialCommunityIcons
              color="#FFFFFF"
              name="cloud"
              size={32}
              style={styles.categoryDetailHeroCloud}
            />
          </View>
          {data.status === 'loading' ? <ActivityIndicator color={skyBlue} /> : null}
          {data.status === 'failed' ? (
            <Text style={styles.warningText}>{data.error?.message ?? copy.couldNotLoadReport}</Text>
          ) : null}
          {data.status === 'ready' ? (
            <>
              <CategoryDetailTrendChart
                accentColor={accentColor}
                copy={copy}
                currencyCode={data.currencyCode}
                kind={kind}
                language={language}
                locale={data.locale}
                rows={trendRows}
              />
              {selectedRecords.length === 0 ? (
                <View style={styles.categoryDetailEmptyCard}>
                  <Text style={styles.reportEmptyListText}>{copy.noData}</Text>
                </View>
              ) : (
                <CategoryDetailRecordGroups
                  accentColor={accentColor}
                  currencyCode={data.currencyCode}
                  icon={icon}
                  kind={kind}
                  label={label}
                  language={language}
                  locale={data.locale}
                  onRecordPress={(record) => router.push(`/money/${record.id}`)}
                  records={selectedRecords}
                />
              )}
            </>
          ) : null}
        </ScrollView>
      </AppBackgroundFrame>
    </SafeAreaView>
  );
}

function ReportDetailHeader({ right, title }: { right?: React.ReactNode; title: string }) {
  const router = useRouter();

  return (
    <View style={styles.reportDetailHeader}>
      <IconButton label="<" onPress={() => router.back()} />
      <Text numberOfLines={1} style={styles.reportDetailHeaderTitle}>
        {title}
      </Text>
      <View style={styles.reportDetailHeaderRight}>{right}</View>
    </View>
  );
}

function YearSwitcher({
  label,
  onChange,
  year,
}: {
  label: string;
  onChange: (year: number) => void;
  year: number;
}) {
  return (
    <View style={styles.monthSwitcher}>
      <IconButton label="<" onPress={() => onChange(shiftYear(year, -1))} />
      <View style={styles.monthPill}>
        <Text numberOfLines={1} style={styles.monthPillText}>
          {label}
        </Text>
        <MaterialCommunityIcons
          color={skyBlue}
          name="calendar-month-outline"
          size={22}
          style={styles.monthPillCalendarIcon}
        />
      </View>
      <IconButton label=">" onPress={() => onChange(shiftYear(year, 1))} />
    </View>
  );
}

function AnnualReportModeTabs({
  active,
  copy,
  onChange,
}: {
  active: MoneyNoteAnnualReportMode;
  copy: typeof moneyNoteCopy.vi;
  onChange: (mode: MoneyNoteAnnualReportMode) => void;
}) {
  const modes: MoneyNoteAnnualReportMode[] = ['expense', 'income', 'net'];

  return (
    <View style={styles.reportModeTabs}>
      {modes.map((mode) => {
        const selected = active === mode;

        return (
          <Pressable
            accessibilityRole="tab"
            key={mode}
            onPress={() => onChange(mode)}
            style={[styles.reportModeTab, selected ? styles.reportModeTabActive : null]}
          >
            <Text
              style={[styles.reportModeTabText, selected ? styles.reportModeTabTextActive : null]}
            >
              {annualReportModeLabel(mode, copy)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function YearlyBarChart({
  color,
  currencyCode,
  locale,
  rows,
}: {
  color: string;
  currencyCode: string;
  locale: string;
  rows: YearlyMonthReportRow[];
}) {
  const maxMinor = Math.max(...rows.map((row) => Math.abs(row.amountMinor)), 0);
  const scaleMax = maxMinor > 0 ? maxMinor : 100;
  const gridValues = [4, 3, 2, 1, 0].map((step) => Math.round((scaleMax * step) / 4));

  return (
    <View style={styles.yearChart}>
      <View style={styles.yearChartPlot}>
        {gridValues.map((value) => (
          <View key={value} style={styles.yearChartGridRow}>
            <Text numberOfLines={1} style={styles.yearChartGridLabel}>
              {formatMoneyNoteAmount(value, { currencyCode, locale })}
            </Text>
            <View style={styles.yearChartGridLine} />
          </View>
        ))}
        <View style={styles.yearBarsLayer}>
          {rows.map((row) => {
            const amount = Math.abs(row.amountMinor);
            const percent = amount === 0 ? 0 : Math.max(2, (amount / scaleMax) * 100);

            return (
              <View key={row.month} style={styles.yearBarSlot}>
                <View
                  style={[
                    styles.yearBar,
                    {
                      backgroundColor: color,
                      height: `${percent}%`,
                    },
                  ]}
                />
              </View>
            );
          })}
        </View>
      </View>
      <View style={styles.yearMonthAxis}>
        {rows.map((row) => (
          <Text key={row.month} style={styles.yearMonthLabel}>
            {row.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

function ReportLoadingState({
  copy,
  data,
  language,
}: {
  copy: typeof moneyNoteCopy.vi;
  data: MorePanelDataState;
  language: AppLanguage;
}) {
  if (data.status === 'loading') {
    return <ActivityIndicator color={skyBlue} style={styles.loadingIndicator} />;
  }

  if (data.status === 'failed') {
    return <Text style={styles.warningText}>{data.error?.message ?? copy.couldNotLoadReport}</Text>;
  }

  if (data.status !== 'ready') {
    return <Text style={styles.mutedText}>{copy.noData}</Text>;
  }

  return null;
}

function AllTimeTotalsTable({
  copy,
  currencyCode,
  language,
  locale,
  totals,
}: {
  copy: typeof moneyNoteCopy.vi;
  currencyCode: string;
  language: AppLanguage;
  locale: string;
  totals: MoneyNoteTotals;
}) {
  const currencySuffix = currencySuffixForCode(currencyCode);
  const rows = [
    { amountMinor: totals.incomeMinor, label: copy.income },
    { amountMinor: totals.expenseMinor, label: copy.expense },
    { amountMinor: totals.netMinor, label: copy.net },
    { divider: true, key: 'divider' },
    { amountMinor: 0, label: copy.initialBalance },
    { amountMinor: totals.netMinor, label: copy.net },
  ];

  return (
    <View style={styles.allTimeTable}>
      {rows.map((row, index) =>
        'divider' in row ? (
          <View key={row.key} style={styles.allTimeTableDivider} />
        ) : (
          <View key={`${row.label}-${index}`} style={styles.allTimeTableRow}>
            <Text numberOfLines={1} style={styles.allTimeTableLabel}>
              {row.label}
            </Text>
            <Text style={styles.allTimeTableAmount}>
              {formatReportMagnitude(row.amountMinor, { currencyCode, locale })}
            </Text>
            <Text style={styles.allTimeTableCurrency}>{currencySuffix}</Text>
          </View>
        ),
      )}
    </View>
  );
}

export function MoneyNoteAllTimeReportScreen() {
  const { copy, language } = useMoneyNoteCopy();
  const data = useMoneyNoteReportData('reportAllTime');

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.reportDetailContent}>
        <ReportDetailHeader title={copy.reportAllTime} />
        {data.status === 'ready' ? (
          <AllTimeTotalsTable
            copy={copy}
            currencyCode={data.currencyCode}
            language={language}
            locale={data.locale}
            totals={data.totals}
          />
        ) : (
          <ReportLoadingState copy={copy} data={data} language={language} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

export function MoneyNoteYearReportScreen() {
  const { copy, language } = useMoneyNoteCopy();
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [activeMode, setActiveMode] = useState<MoneyNoteAnnualReportMode>('expense');
  const data = useMoneyNoteReportData('reportYear', year);
  const monthRows = useMemo(
    () => buildYearlyMonthReportRows(data.records, activeMode),
    [activeMode, data.records],
  );
  const totalMinor = annualReportModeAmount(data.totals, activeMode);
  const amountStyle =
    activeMode === 'net'
      ? totalMinor < 0
        ? styles.expenseAmount
        : styles.incomeAmount
      : activeMode === 'expense'
        ? styles.expenseAmount
        : styles.incomeAmount;
  const yearLabel = `${year}(01/01 - 31/12)`;

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.reportDetailContent}>
        <ReportDetailHeader
          right={<MaterialCommunityIcons color={ink} name="calendar-month-outline" size={28} />}
          title={copy.reportYear}
        />
        <YearSwitcher label={yearLabel} onChange={setYear} year={year} />
        <AnnualReportModeTabs active={activeMode} copy={copy} onChange={setActiveMode} />
        {data.status === 'ready' ? (
          <>
            <YearlyBarChart
              color={annualReportModeColor(activeMode)}
              currencyCode={data.currencyCode}
              locale={data.locale}
              rows={monthRows}
            />
            <View style={styles.yearTotalRow}>
              <Text style={styles.yearTotalLabel}>{copy.net}</Text>
              <Text style={[styles.yearTotalAmount, amountStyle]}>
                {formatMoneyNoteAmount(totalMinor, {
                  currencyCode: data.currencyCode,
                  locale: data.locale,
                })}
              </Text>
            </View>
            <View style={styles.yearMonthList}>
              {monthRows.map((row) => (
                <View key={row.month} style={styles.yearMonthRow}>
                  <Text style={styles.yearMonthRowLabel}>
                    {copy.monthPrefix} {row.month}
                  </Text>
                  <Text
                    style={[
                      styles.yearMonthRowAmount,
                      activeMode === 'net'
                        ? row.amountMinor < 0
                          ? styles.expenseAmount
                          : styles.incomeAmount
                        : null,
                    ]}
                  >
                    {formatMoneyNoteAmount(row.amountMinor, {
                      currencyCode: data.currencyCode,
                      locale: data.locale,
                    })}
                  </Text>
                </View>
              ))}
            </View>
          </>
        ) : (
          <ReportLoadingState copy={copy} data={data} language={language} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function MoneyNoteCategoryReportDetailScreen({
  panelKind,
  title,
}: {
  panelKind: 'categoryAllTime' | 'categoryYear';
  title: string;
}) {
  const { copy, language } = useMoneyNoteCopy();
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [activeKind, setActiveKind] = useState<'expense' | 'income'>('expense');
  const data = useMoneyNoteReportData(panelKind, panelKind === 'categoryYear' ? year : undefined);
  const breakdownRows = useMemo(
    () => buildReportBreakdownRows(data.records, activeKind, language),
    [activeKind, data.records, language],
  );

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.reportDetailContent}>
        <ReportDetailHeader
          right={
            panelKind === 'categoryYear' ? (
              <MaterialCommunityIcons color={ink} name="calendar-month-outline" size={28} />
            ) : undefined
          }
          title={title}
        />
        {panelKind === 'categoryYear' ? (
          <YearSwitcher label={`${year}`} onChange={setYear} year={year} />
        ) : null}
        <KindTabs active={activeKind} copy={copy} onChange={setActiveKind} />
        <View style={styles.reportBody}>
          {data.status === 'ready' ? (
            <>
              <ReportDonutChart copy={copy} language={language} rows={breakdownRows} />
              <ReportBreakdownList
                currencyCode={data.currencyCode}
                language={language}
                locale={data.locale}
                rows={breakdownRows}
              />
            </>
          ) : (
            <ReportLoadingState copy={copy} data={data} language={language} />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export function MoneyNoteCategoryYearReportScreen() {
  const { copy } = useMoneyNoteCopy();

  return (
    <MoneyNoteCategoryReportDetailScreen panelKind="categoryYear" title={copy.categoryYearReport} />
  );
}

export function MoneyNoteCategoryAllTimeReportScreen() {
  const { language } = useMoneyNoteCopy();
  const title = moneyNoteCopy[language].allTime;

  return <MoneyNoteCategoryReportDetailScreen panelKind="categoryAllTime" title={title} />;
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
      <MaterialCommunityIcons
        color={skyBlue}
        name={icon as never}
        size={28}
        style={styles.moreIcon}
      />
      <Text numberOfLines={1} style={styles.moreTitle}>
        {title}
      </Text>
      {right ? <Text style={styles.moreRight}>{right}</Text> : null}
    </Pressable>
  );
}

function MoreDivider() {
  const appBackground = useAppBackground();

  return (
    <View style={[styles.moreDivider, { backgroundColor: appBackground.colors.appBackground }]} />
  );
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
  const recordsLabel = `${data.totalCount} ${copy.recordsInView}`;

  return (
    <View style={styles.morePanel}>
      <Text style={styles.morePanelTitle}>{titleByKind[kind]}</Text>
      {data.status === 'loading' ? <ActivityIndicator color={skyBlue} /> : null}
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
                      row.incomeMinor - row.expenseMinor < 0
                        ? styles.expenseAmount
                        : styles.incomeAmount,
                    ]}
                  >
                    {formatAmount(row.incomeMinor - row.expenseMinor)}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.moreReportList}>
              {data.records.length === 0 ? (
                <Text style={styles.mutedText}>{copy.noData}</Text>
              ) : null}
              {data.records.slice(0, 6).map((record) => (
                <View key={record.id} style={styles.moreReportRow}>
                  <MaterialCommunityIcons
                    color={record.kind === 'expense' ? expenseColor : incomeColor}
                    name={
                      record.kind === 'expense'
                        ? 'arrow-down-circle-outline'
                        : 'arrow-up-circle-outline'
                    }
                    size={28}
                    style={styles.moreReportIcon}
                  />
                  <View style={styles.moreReportText}>
                    <Text numberOfLines={1} style={styles.moreReportTitle}>
                      {recordDisplayLabel(record, language, copy.category)}
                    </Text>
                    <Text style={styles.moreReportMeta}>
                      {formatMoneyNoteShortDate(record.localDate, language)}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.moreReportAmount,
                      record.kind === 'expense' ? styles.expenseAmount : styles.incomeAmount,
                    ]}
                  >
                    {formatAmount(
                      record.kind === 'expense' ? -record.amountMinor : record.amountMinor,
                    )}
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
                ]}
              >
                <Text style={styles.morePanelButtonText}>
                  {fileBusy
                    ? copy.saving
                    : kind === 'export'
                      ? copy.createCsv
                      : copy.createJsonBackup}
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
  const appBackground = useAppBackground();
  const preferences = usePreferenceSettings();
  const [languageOpen, setLanguageOpen] = useState(false);
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [backgroundOpen, setBackgroundOpen] = useState(false);
  const [backgroundError, setBackgroundError] = useState<string | null>(null);
  const [backgroundStatus, setBackgroundStatus] = useState<'failed' | 'idle' | 'saved' | 'saving'>(
    'idle',
  );
  const [languageStatus, setLanguageStatus] = useState<'failed' | 'idle' | 'saved' | 'saving'>(
    'idle',
  );
  const [activePanel, setActivePanel] = useState<MoneyNoteMorePanelKind | null>(null);
  const [fileBusy, setFileBusy] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [fileMessage, setFileMessage] = useState<string | null>(null);
  const visibleCurrency =
    preferences.state.form.currencyCode || moneyNoteDefaultPreferences.currencyCode;
  const panelData = useMoneyNoteMorePanelData(activePanel);
  const visibleBackground =
    appBackground.kind === 'photo'
      ? copy.backgroundFromPhoto
      : backgroundDisplayName(
          appBackground.id === 'photo' ? 'mint' : appBackground.id,
          appLanguage,
        );
  const contentBackgroundColor = 'transparent';

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

  const changeBackground = useCallback(
    (backgroundId: AppBackgroundId) => {
      setBackgroundError(null);
      if (backgroundId === appBackground.id) {
        setBackgroundStatus('saved');
        setBackgroundOpen(false);
        return;
      }

      setBackgroundStatus('saving');
      void saveStoredAppBackground(backgroundId)
        .then(() => {
          setBackgroundStatus('saved');
          setBackgroundOpen(false);
        })
        .catch(() => setBackgroundStatus('failed'));
    },
    [appBackground.id],
  );

  const choosePhotoBackground = useCallback(async () => {
    setBackgroundError(null);
    setBackgroundStatus('saving');

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        setBackgroundError(copy.backgroundPermissionDenied);
        setBackgroundStatus('failed');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: false,
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.9,
      });

      if (result.canceled) {
        setBackgroundStatus('idle');
        return;
      }

      const photoUri = result.assets[0]?.uri;

      if (!photoUri) {
        setBackgroundStatus('failed');
        setBackgroundError(copy.backgroundFailed);
        return;
      }

      await saveStoredAppBackgroundPhoto(photoUri);
      setBackgroundStatus('saved');
      setBackgroundOpen(false);
    } catch (error) {
      setBackgroundStatus('failed');
      setBackgroundError(error instanceof Error ? error.message : copy.backgroundFailed);
    }
  }, [copy.backgroundFailed, copy.backgroundPermissionDenied]);

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
    <SafeAreaView
      edges={['top']}
      style={[styles.safeArea, { backgroundColor: appBackground.colors.appBackground }]}
    >
      <AppBackgroundFrame>
        <ScrollView
          contentContainerStyle={[styles.moreContent, { backgroundColor: contentBackgroundColor }]}
        >
          <ScreenHeader title={copy.more} />
          <MoreDivider />
          <MoreRow
            icon="cog-outline"
            onPress={() => router.push('/preferences')}
            title={copy.basicSettings}
          />
          <MoreDivider />
          <MoreRow
            icon="chart-box-outline"
            onPress={() => router.push('/report-year')}
            title={copy.reportYear}
          />
          <MoreRow
            icon="chart-pie"
            onPress={() => router.push('/report-category-year')}
            title={copy.categoryYearReport}
          />
          <MoreRow
            icon="chart-box-outline"
            onPress={() => router.push('/report-all-time')}
            title={copy.reportAllTime}
          />
          <MoreRow
            icon="chart-pie"
            onPress={() => router.push('/report-category-all-time')}
            title={copy.categoryAllTimeReport}
          />
          <MoreDivider />
          <MoreRow
            icon="download-outline"
            onPress={() => togglePanel('export')}
            title={copy.exportData}
          />
          {renderActivePanel('export')}
          <MoreRow
            icon="archive-arrow-down-outline"
            onPress={() => togglePanel('backup')}
            title={copy.backupData}
          />
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
                  ]}
                >
                  <Text
                    style={[
                      styles.languageOptionText,
                      option.value === appLanguage ? styles.languageOptionTextSelected : null,
                    ]}
                  >
                    {languageDisplayName(option.value, appLanguage)}
                  </Text>
                </Pressable>
              ))}
              {languageStatus === 'saving' ? (
                <Text style={styles.mutedText}>{copy.saving}</Text>
              ) : null}
              {languageStatus === 'saved' ? (
                <Text style={styles.successTextInline}>{copy.languageSaved}</Text>
              ) : null}
              {languageStatus === 'failed' ? (
                <Text style={styles.warningText}>{copy.languageFailed}</Text>
              ) : null}
            </View>
          ) : null}
          <MoreRow
            icon="palette-outline"
            onPress={() => setBackgroundOpen((current) => !current)}
            right={visibleBackground}
            title={copy.background}
          />
          {backgroundOpen ? (
            <View style={styles.backgroundPanel}>
              <Pressable
                accessibilityRole="button"
                disabled={backgroundStatus === 'saving'}
                onPress={choosePhotoBackground}
                style={styles.backgroundPhotoButton}
              >
                <MaterialCommunityIcons color="#FFFFFF" name="image-plus" size={24} />
                <Text style={styles.backgroundPhotoButtonText}>
                  {backgroundStatus === 'saving' ? copy.saving : copy.backgroundChoosePhoto}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={backgroundStatus === 'saving'}
                onPress={() => changeBackground('mint')}
                style={styles.backgroundDefaultButton}
              >
                <Text style={styles.backgroundDefaultButtonText}>{copy.backgroundDefault}</Text>
              </Pressable>
              {appBackgroundOptions.map((option) => {
                const selected = appBackground.kind === 'preset' && option.id === appBackground.id;

                return (
                  <Pressable
                    accessibilityRole="button"
                    key={option.id}
                    onPress={() => changeBackground(option.id)}
                    style={[
                      styles.backgroundOption,
                      selected ? styles.backgroundOptionSelected : null,
                    ]}
                  >
                    <View
                      style={[
                        styles.backgroundSwatch,
                        { backgroundColor: option.colors.appBackground },
                      ]}
                    />
                    <Text
                      style={[
                        styles.backgroundOptionText,
                        selected ? styles.backgroundOptionTextSelected : null,
                      ]}
                    >
                      {backgroundDisplayName(option.id, appLanguage)}
                    </Text>
                  </Pressable>
                );
              })}
              {backgroundStatus === 'saving' ? (
                <Text style={styles.mutedText}>{copy.saving}</Text>
              ) : null}
              {backgroundStatus === 'saved' ? (
                <Text style={styles.successTextInline}>{copy.backgroundSaved}</Text>
              ) : null}
              {backgroundStatus === 'failed' ? (
                <Text style={styles.warningText}>{backgroundError ?? copy.backgroundFailed}</Text>
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
                  const selected =
                    preferences.state.form.currencyCode.toUpperCase() === option.code;

                  return (
                    <Pressable
                      accessibilityRole="button"
                      key={option.code}
                      onPress={() => selectQuickCurrency(option)}
                      style={[
                        styles.currencyOption,
                        selected ? styles.currencyOptionSelected : null,
                      ]}
                    >
                      <Text
                        style={[
                          styles.currencyOptionText,
                          selected ? styles.currencyOptionTextSelected : null,
                        ]}
                      >
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
                style={[
                  styles.inlineSaveButton,
                  preferences.state.status === 'saving' ? styles.primaryCtaDisabled : null,
                ]}
              >
                <Text style={styles.inlineSaveButtonText}>
                  {preferences.state.status === 'saving' ? copy.saving : copy.saveCurrency}
                </Text>
              </Pressable>
              {preferences.state.status === 'saved' ? (
                <Text style={styles.successTextInline}>{copy.currencySaved}</Text>
              ) : null}
              {preferences.state.saveError ? (
                <Text style={styles.warningText}>{copy.saveFailed}</Text>
              ) : null}
              {Object.keys(preferences.state.fieldErrors).length > 0 ? (
                <Text style={styles.warningText}>{copy.saveFailed}</Text>
              ) : null}
            </View>
          ) : null}
        </ScrollView>
      </AppBackgroundFrame>
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
  const appBackground = useAppBackground();
  const [languageStatus, setLanguageStatus] = useState<'failed' | 'idle' | 'saved' | 'saving'>(
    'idle',
  );
  const saving = state.status === 'saving';
  const usesWholeUnitCurrency = state.form.currencyCode.toUpperCase() === 'VND';
  const contentBackgroundColor = 'transparent';

  const updateCurrency = (value: string) => {
    const normalized = value
      .replace(/[^a-z]/gi, '')
      .toUpperCase()
      .slice(0, 3);
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
    <SafeAreaView
      edges={['top']}
      style={[styles.safeArea, { backgroundColor: appBackground.colors.appBackground }]}
    >
      <AppBackgroundFrame>
        <ScrollView
          contentContainerStyle={[
            styles.preferencesContent,
            { backgroundColor: contentBackgroundColor },
          ]}
          keyboardShouldPersistTaps="handled"
        >
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
                    style={[
                      styles.preferenceSegmentOption,
                      selected ? styles.preferenceSegmentOptionActive : null,
                    ]}
                  >
                    <Text
                      style={[
                        styles.preferenceSegmentLabel,
                        selected ? styles.preferenceSegmentLabelActive : null,
                      ]}
                    >
                      {languageDisplayName(option.value, appLanguage)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {languageStatus === 'saving' ? (
              <Text style={styles.preferenceHelper}>{copy.saving}</Text>
            ) : null}
            {languageStatus === 'saved' ? (
              <Text style={styles.successTextInline}>{copy.languageSaved}</Text>
            ) : null}
            {languageStatus === 'failed' ? (
              <Text style={styles.warningText}>{copy.languageFailed}</Text>
            ) : null}
          </View>

          <View style={styles.preferenceSection}>
            <Text style={styles.preferenceSectionTitle}>{copy.currency}</Text>
            <PreferenceField
              helper={
                appLanguage === 'en' ? 'Recommended default: TWD.' : 'Mặc định khuyến nghị: TWD.'
              }
              label={copy.currencyCode}
              onChangeText={updateCurrency}
              value={state.form.currencyCode}
            />
            <PreferenceField
              helper={
                appLanguage === 'en'
                  ? 'Use zh-TW to display NT$ and Taiwan currency style.'
                  : 'Dùng zh-TW để hiển thị NT$ đúng kiểu Đài Loan.'
              }
              label={copy.locale}
              onChangeText={(value) => updateField('locale', value)}
              value={state.form.locale}
            />
            <PreferenceField
              helper={
                appLanguage === 'en'
                  ? 'First day of the monthly reporting cycle.'
                  : 'Ngày bắt đầu chu kỳ báo cáo tháng.'
              }
              keyboardType="number-pad"
              label={appLanguage === 'en' ? 'Monthly reset day' : 'Ngày chốt tháng'}
              onChangeText={(value) =>
                updateField('monthlyBudgetResetDay', value.replace(/[^\d]/g, ''))
              }
              value={state.form.monthlyBudgetResetDay}
            />
            <PreferenceField
              helper={
                appLanguage === 'en'
                  ? 'Leave 0 if you do not use wage tracking.'
                  : 'Có thể để 0 nếu không dùng tính lương.'
              }
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
            {state.saveError ? (
              <Text style={styles.warningText}>{state.saveError.message}</Text>
            ) : null}
            {state.status === 'saved' ? (
              <Text style={styles.successText}>{copy.settingsSaved}</Text>
            ) : null}

            <Pressable
              accessibilityRole="button"
              disabled={saving}
              onPress={save}
              style={[styles.primaryCta, saving ? styles.primaryCtaDisabled : null]}
            >
              <Text style={styles.primaryCtaText}>{saving ? copy.saving : copy.saveSettings}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </AppBackgroundFrame>
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
  const [deleteError, setDeleteError] = useState<AppError | null>(null);
  const [deletingRecord, setDeletingRecord] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const editStartedFor = useRef<string | null>(null);
  const editScreenMounted = useRef(false);
  const baseTemplates =
    state.draft.kind === 'expense' ? expenseCategoryTemplates : incomeCategoryTemplates;
  const templates = useMemo(
    () => categoryOptionsForKind(baseTemplates, state.categories, state.draft.kind),
    [baseTemplates, state.categories, state.draft.kind],
  );
  const selectedTemplateId = categoryOptionIdForDraft(
    templates,
    state.draft.categoryId,
    state.draft.merchantOrSource,
  );
  const selectedTemplate =
    templates.find((template) => template.id === selectedTemplateId) ?? templates[0];
  const saving = state.status === 'saving' || deletingRecord;
  const currencyCode =
    state.preferences?.currencyCode ??
    recordToEdit?.currencyCode ??
    moneyNoteDefaultPreferences.currencyCode;
  const currencySuffix = currencySuffixForCode(currencyCode);
  const currencyUsesPrefix = currencyCode.toUpperCase() !== 'VND';

  useEnsureMoneyNoteDefaults(state.status, state.categories, capture.reload);

  useEffect(() => {
    editScreenMounted.current = true;

    return () => {
      editScreenMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!moneyRecordId) {
      return;
    }

    let cancelled = false;
    setRecordLoadError(null);
    setDeleteError(null);
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
      const timeout = setTimeout(() => {
        router.back();
      }, 0);

      return () => clearTimeout(timeout);
    }

    return undefined;
  }, [router, state.status]);

  useEffect(() => {
    if (state.status === 'saved' && state.lastMutation === 'updated') {
      router.back();
    }
  }, [router, state.lastMutation, state.status]);

  const changeKind = (kind: 'expense' | 'income') => {
    const nextTemplate =
      kind === 'expense' ? expenseCategoryTemplates[0] : incomeCategoryTemplates[0];
    setKind(kind);
    selectCategory(findCategoryByTemplate(state.categories, nextTemplate)?.id ?? null);
    updateField('merchantOrSource', nextTemplate.label);
  };

  const selectTemplate = (template: MoneyNoteCategoryOption) => {
    const category = template.categoryId
      ? null
      : findCategoryByTemplate(state.categories, template);
    selectCategory(template.categoryId ?? category?.id ?? null);
    updateField('merchantOrSource', template.label);
  };

  const deleteRecord = () => {
    if (!moneyRecordId || deletingRecord) {
      return;
    }

    setDeleteError(null);
    setDeletingRecord(true);

    void deleteMoneyRecord({ id: moneyRecordId }).then((result) => {
      if (!editScreenMounted.current) {
        return;
      }

      if (!result.ok) {
        setDeleteError(result.error);
        setDeletingRecord(false);
        return;
      }

      router.back();

      setTimeout(() => {
        notifyMoneyRecordsChanged('deleted', result.value.record);
      }, 80);
    });
  };

  const confirmDeleteRecord = () => {
    if (deletingRecord) {
      return;
    }

    const confirmation = moneyNoteDeleteConfirmCopy[language];

    Alert.alert(confirmation.title, confirmation.message, [
      {
        style: 'cancel',
        text: confirmation.cancel,
      },
      {
        onPress: deleteRecord,
        style: 'destructive',
        text: copy.delete,
      },
    ]);
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
            {copy.editTitle}
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
                  style={styles.datePill}
                >
                  <Text numberOfLines={1} style={styles.datePillText}>
                    {formatMoneyNoteDate(state.draft.localDate, language)}
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
                  placeholderTextColor="#AAAAB5"
                  style={styles.textInput}
                  value={state.draft.note}
                />
              </MoneyNoteRow>

              <View style={[styles.formRow, styles.formRowLast]}>
                <Text style={styles.formRowLabel}>
                  {state.draft.kind === 'expense' ? copy.expenseAmount : copy.incomeAmount}
                </Text>
                {currencyUsesPrefix ? (
                  <Text style={styles.amountRowCurrency}>{currencySuffix}</Text>
                ) : null}
                <TextInput
                  keyboardType="number-pad"
                  onChangeText={(value) => updateField('amount', parseMoneyNoteAmountInput(value))}
                  placeholder="0"
                  placeholderTextColor={ink}
                  style={styles.amountInput}
                  value={formatMoneyNoteAmountInput(state.draft.amount)}
                />
                {currencyUsesPrefix ? null : (
                  <Text style={styles.amountRowCurrency}>{currencySuffix}</Text>
                )}
              </View>
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

            {state.fieldErrors.amount ? (
              <Text style={styles.warningText}>{state.fieldErrors.amount}</Text>
            ) : null}
            {state.actionError ? (
              <Text style={styles.warningText}>{state.actionError.message}</Text>
            ) : null}
            {deleteError ? <Text style={styles.warningText}>{deleteError.message}</Text> : null}
            {state.status === 'saved' ? (
              <Text style={styles.successText}>{copy.recordUpdated}</Text>
            ) : null}

            <Pressable
              accessibilityRole="button"
              disabled={saving}
              onPress={capture.save}
              style={[styles.primaryCta, saving ? styles.primaryCtaDisabled : null]}
            >
              <Text style={styles.primaryCtaText}>{saving ? copy.saving : copy.overwrite}</Text>
            </Pressable>
            <View style={styles.editFooterActions}>
              <View />
              <Pressable
                accessibilityRole="button"
                disabled={deletingRecord}
                onPress={confirmDeleteRecord}
              >
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
  const baseTemplates =
    activeKind === 'expense' ? expenseCategoryTemplates : incomeCategoryTemplates;
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
              ]}
            >
              <Text style={styles.inlineSaveButtonText}>
                {categoryActionStatus === 'saving' ? copy.saving : copy.addCategory}
              </Text>
            </Pressable>
          </View>
        ) : null}
        {categoryActionError ? (
          <Text style={styles.warningText}>{categoryActionError.message}</Text>
        ) : null}
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
  allTimeTable: {
    backgroundColor: '#FFFFFF',
    borderTopColor: line,
    borderTopWidth: 1,
  },
  allTimeTableAmount: {
    ...moneyType.titleSmall,
    color: ink,
    minWidth: 112,
    textAlign: 'right',
  },
  allTimeTableCurrency: {
    ...moneyType.titleSmall,
    color: ink,
    minWidth: 54,
    textAlign: 'right',
  },
  allTimeTableDivider: {
    backgroundColor: panel,
    borderBottomColor: line,
    borderBottomWidth: 1,
    borderTopColor: line,
    borderTopWidth: 1,
    height: 50,
  },
  allTimeTableLabel: {
    ...moneyType.titleSmall,
    color: ink,
    flex: 1,
  },
  allTimeTableRow: {
    alignItems: 'center',
    borderBottomColor: line,
    borderBottomWidth: 1,
    flexDirection: 'row',
    minHeight: 74,
    paddingHorizontal: 24,
  },
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
    ...moneyType.body,
    backgroundColor: lightBlue,
    borderRadius: 16,
    color: ink,
    flex: 1,
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 18,
    fontWeight: '600',
    height: 38,
    includeFontPadding: false,
    lineHeight: 22,
    paddingHorizontal: 14,
    paddingVertical: 0,
    textAlignVertical: 'center',
  },
  amountRowCurrency: {
    color: ink,
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
    marginLeft: 4,
    marginRight: 10,
  },
  calendarContent: {
    paddingBottom: 122,
    paddingTop: 6,
  },
  calendarDayHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  calendarDayTile: {
    aspectRatio: 1,
    borderRadius: 12,
    justifyContent: 'space-between',
    paddingHorizontal: 3,
    paddingVertical: 2,
    width: '100%',
  },
  calendarDetailBody: {
    gap: 8,
    paddingHorizontal: 14,
    paddingTop: 10,
  },
  calendarDetailPanel: {
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderColor: '#DFF1F2',
    borderRadius: 28,
    borderWidth: 1,
    elevation: 5,
    marginHorizontal: 10,
    marginTop: 12,
    paddingBottom: 14,
    paddingTop: 8,
    shadowColor: '#8FCFD0',
    shadowOffset: {
      height: 8,
      width: 0,
    },
    shadowOpacity: 0.2,
    shadowRadius: 18,
  },
  calendarDetailTab: {
    alignItems: 'center',
    borderRadius: 22,
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 40,
    position: 'relative',
  },
  calendarDetailTabActive: {
    backgroundColor: '#DDF5F1',
  },
  calendarDetailTabText: {
    ...moneyType.label,
    color: '#18325C',
  },
  calendarDetailTabTextActive: {
    color: '#18325C',
  },
  calendarDetailTabs: {
    alignSelf: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderColor: '#DDE7EE',
    borderRadius: 24,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    maxWidth: 330,
    minHeight: 46,
    padding: 3,
    width: '82%',
  },
  calendarGrid: {
    backgroundColor: 'rgba(255, 255, 255, 0.97)',
    borderColor: '#E2EEF2',
    borderRadius: 28,
    borderWidth: 1,
    elevation: 4,
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: 10,
    marginTop: 8,
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 10,
    shadowColor: '#9CDCDD',
    shadowOffset: {
      height: 7,
      width: 0,
    },
    shadowOpacity: 0.18,
    shadowRadius: 16,
  },
  calendarJournalCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E4EEF2',
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  calendarJournalCardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  calendarJournalDateBadge: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  calendarJournalDot: {
    backgroundColor: '#4B92EE',
    borderColor: '#FFFFFF',
    borderRadius: 6,
    borderWidth: 2,
    height: 12,
    position: 'absolute',
    right: 1,
    top: 30,
    width: 12,
  },
  calendarJournalHeart: {
    position: 'absolute',
    right: 12,
    top: -10,
    transform: [{ rotate: '-12deg' }],
  },
  calendarJournalLine: {
    backgroundColor: '#B9DBFF',
    bottom: -16,
    position: 'absolute',
    right: 6,
    top: 42,
    width: 1,
  },
  calendarJournalNote: {
    ...moneyType.labelSmall,
    color: '#18325C',
  },
  calendarJournalNoteWrap: {
    borderBottomColor: '#E8EEF4',
    borderBottomWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 58,
    paddingHorizontal: 8,
  },
  calendarJournalRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    minHeight: 72,
  },
  calendarJournalThumb: {
    backgroundColor: '#DDE7E7',
    borderRadius: 10,
    height: 54,
    width: 82,
  },
  calendarJournalTimeColumn: {
    alignSelf: 'stretch',
    justifyContent: 'center',
    position: 'relative',
    width: 56,
  },
  calendarJournalTimeText: {
    ...moneyType.caption,
    color: '#2F80ED',
    fontFamily: 'Montserrat_700Bold',
    fontWeight: '700',
  },
  calendarMetricAmount: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0,
    lineHeight: 19,
    marginTop: 2,
  },
  calendarMetricAmountExpense: {
    color: expenseColor,
  },
  calendarMetricAmountIncome: {
    color: '#13B5AF',
  },
  calendarMetricAmountTotal: {
    color: '#2F80ED',
  },
  calendarMetricCard: {
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 4,
    minHeight: 62,
    paddingHorizontal: 5,
    paddingVertical: 7,
  },
  calendarMetricCardExpense: {
    backgroundColor: '#FFF6F7',
    borderColor: '#FFC8D2',
  },
  calendarMetricCardIncome: {
    backgroundColor: '#EFFCF9',
    borderColor: '#9DE5DD',
  },
  calendarMetricCardTotal: {
    backgroundColor: '#F3F8FF',
    borderColor: '#B8D6FF',
  },
  calendarMetricLabel: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0,
    lineHeight: 16,
  },
  calendarMetricRow: {
    flexDirection: 'row',
    gap: 8,
  },
  calendarMetricText: {
    flex: 1,
    minWidth: 0,
  },
  calendarMonthIcon: {
    color: skyBlue,
    fontSize: 18,
    fontWeight: '400',
    position: 'absolute',
    right: 18,
  },
  calendarMonthPill: {
    alignItems: 'center',
    backgroundColor: lightBlue,
    borderColor: '#CBECEA',
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    height: 50,
    justifyContent: 'center',
    paddingHorizontal: 44,
  },
  calendarMonthSwitcher: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 24,
    paddingBottom: 2,
    paddingHorizontal: 24,
  },
  calendarMonthText: {
    color: ink,
    flex: 1,
    fontFamily: 'Montserrat_500Medium',
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: 0,
    lineHeight: 22,
    minWidth: 0,
    textAlign: 'center',
  },
  calendarMoodPill: {
    alignItems: 'center',
    borderRadius: 18,
    flexDirection: 'row',
    gap: 6,
    minHeight: 36,
    paddingHorizontal: 12,
  },
  calendarMoodPillText: {
    ...moneyType.labelSmall,
  },
  calendarPageHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 78,
    paddingBottom: 6,
    paddingLeft: 22,
    paddingRight: 14,
    paddingTop: 6,
  },
  calendarPageTitle: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 0,
    lineHeight: 31,
    color: '#18325C',
  },
  calendarRecordDateText: {
    ...moneyType.labelSmall,
    color: '#18325C',
  },
  calendarRecordTable: {
    gap: 10,
  },
  calendarRecordTableAmount: {
    ...moneyType.label,
    marginLeft: 8,
  },
  calendarRecordTableDateRow: {
    alignItems: 'center',
    alignSelf: 'flex-end',
    flexDirection: 'row',
    gap: 6,
    marginRight: 12,
  },
  calendarRecordTableHeader: {
    alignItems: 'center',
    backgroundColor: '#EFF8F7',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    flexDirection: 'row',
    minHeight: 52,
    paddingHorizontal: 18,
  },
  calendarRecordTableHeaderAmount: {
    ...moneyType.label,
    marginLeft: 10,
  },
  calendarRecordTableHeaderText: {
    ...moneyType.label,
    color: ink,
    flex: 1,
  },
  calendarRecordTableInner: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E4EEF2',
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  calendarRecordTableRow: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderTopColor: '#EEF3F6',
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 14,
    minHeight: 62,
    paddingHorizontal: 18,
  },
  calendarRecordTableTitle: {
    ...moneyType.labelSmall,
    color: ink,
    flex: 1,
  },
  calendarStepButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#EBF2F3',
    borderRadius: 24,
    borderWidth: 1,
    elevation: 2,
    height: 48,
    justifyContent: 'center',
    shadowColor: '#8BA7B0',
    shadowOffset: {
      height: 5,
      width: 0,
    },
    shadowOpacity: 0.14,
    shadowRadius: 9,
    width: 48,
  },
  categoryEditText: {
    ...moneyType.caption,
    color: ink,
    fontSize: 11,
    includeFontPadding: false,
    lineHeight: 15,
    marginTop: 6,
    textAlign: 'center',
    width: '88%',
  },
  categoryGrid: {
    columnGap: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 12,
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
    backgroundColor: 'transparent',
    gap: 12,
    paddingHorizontal: 24,
    paddingTop: 18,
  },
  categoryTile: {
    alignItems: 'center',
    aspectRatio: 1,
    backgroundColor: '#FFFFFF',
    borderColor: '#EEF4F4',
    borderRadius: 14,
    borderWidth: 1.5,
    flexBasis: '22%',
    flexGrow: 0,
    flexShrink: 0,
    justifyContent: 'center',
    paddingHorizontal: 6,
    shadowColor: '#9AB4B4',
    shadowOffset: {
      height: 8,
      width: 0,
    },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 3,
  },
  categoryTileContent: {
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ translateY: -4 }],
    width: '100%',
  },
  categoryTileLabel: {
    ...moneyType.caption,
    color: ink,
    fontSize: 11,
    includeFontPadding: false,
    lineHeight: 15,
    marginTop: 6,
    textAlign: 'center',
    width: '88%',
  },
  categoryTileSelected: {
    backgroundColor: '#F3FFFF',
    borderColor: skyBlue,
    elevation: 5,
    shadowOpacity: 0.16,
    transform: [{ scale: 1.025 }],
    zIndex: 2,
  },
  currencySuffix: {
    ...moneyType.body,
    color: ink,
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 20,
    marginLeft: 4,
    textDecorationLine: 'underline',
  },
  currencyPrefix: {
    ...moneyType.body,
    color: ink,
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 20,
    marginRight: 4,
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
    borderColor: '#CBECEA',
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'space-between',
    minHeight: 38,
    paddingHorizontal: 12,
  },
  datePillIcon: {
    color: skyBlue,
    fontSize: 18,
    fontWeight: '400',
  },
  datePillText: {
    ...moneyType.body,
    color: ink,
    flex: 1,
    fontFamily: 'Montserrat_500Medium',
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 19,
  },
  deleteActionText: {
    ...moneyType.label,
    color: expenseColor,
  },
  dayCell: {
    alignItems: 'center',
    borderColor: '#E8F0F3',
    borderRightWidth: 1,
    borderTopWidth: 1,
    justifyContent: 'center',
    padding: 4,
  },
  dayAmountText: {
    alignSelf: 'center',
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0,
    lineHeight: 12,
    marginTop: 1,
    textAlign: 'center',
    width: '100%',
  },
  dayCellSelected: {
    backgroundColor: '#D8F6F4',
    borderColor: '#B2E7E4',
    borderWidth: 1,
    borderRadius: 12,
  },
  dayCellToday: {
    backgroundColor: '#F0FBFB',
  },
  dayRecordSection: {
    backgroundColor: '#FFFFFF',
    paddingBottom: 18,
  },
  dayText: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0,
    lineHeight: 18,
    color: '#18325C',
  },
  dayTextMuted: {
    color: '#AAB3C2',
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
    backgroundColor: panel,
    minHeight: '100%',
  },
  entryBackgroundDecor: {
    bottom: 0,
    left: 0,
    opacity: 0.9,
    position: 'absolute',
    right: 0,
  },
  entryHeader: {
    backgroundColor: 'transparent',
    minHeight: 78,
    paddingBottom: 6,
    paddingLeft: 22,
    paddingRight: 14,
    paddingTop: 6,
    position: 'relative',
  },
  entryHeaderDecor: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  entryHeaderTitle: {
    fontSize: 24,
    lineHeight: 31,
  },
  entryPrimaryCta: {
    alignSelf: 'center',
    borderRadius: 22,
    marginHorizontal: 0,
    marginTop: 16,
    minHeight: 46,
    width: '76%',
  },
  entryPrimaryCtaText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 21,
  },
  entrySheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    minHeight: 680,
    overflow: 'hidden',
    paddingBottom: 34,
    position: 'relative',
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
    borderColor: '#EEF4F4',
    borderRadius: 24,
    borderWidth: 1,
    elevation: 5,
    marginHorizontal: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
    shadowColor: '#94AFAF',
    shadowOffset: {
      height: 12,
      width: 0,
    },
    shadowOpacity: 0.16,
    shadowRadius: 18,
  },
  formRow: {
    alignItems: 'center',
    borderBottomColor: line,
    borderBottomWidth: 1,
    flexDirection: 'row',
    minHeight: 52,
  },
  formRowBody: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 4,
  },
  formRowLabel: {
    ...moneyType.body,
    color: ink,
    fontFamily: 'Montserrat_500Medium',
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 19,
    width: 82,
  },
  formRowLast: {
    borderBottomWidth: 0,
  },
  header: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    minHeight: 56,
    paddingHorizontal: 18,
  },
  headerRight: {
    marginLeft: 10,
    zIndex: 30,
  },
  headerActionGroup: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    zIndex: 30,
  },
  moreHeaderButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#EEF3F5',
    borderRadius: 20,
    borderWidth: 1,
    elevation: 5,
    height: 40,
    justifyContent: 'center',
    shadowColor: '#8BA7B0',
    shadowOffset: {
      height: 6,
      width: 0,
    },
    shadowOpacity: 0.18,
    shadowRadius: 11,
    width: 40,
  },
  moreHeaderButtonInner: {
    alignItems: 'center',
    borderColor: '#EDF3F4',
    borderRadius: 15,
    borderWidth: 1,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  headerTitle: {
    ...moneyType.title,
    color: ink,
    flex: 1,
  },
  iconButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E2ECEF',
    borderRadius: 12,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    minWidth: 30,
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
    borderRadius: 3,
    height: 5,
    marginTop: 10,
    width: '100%',
  },
  kindTabLineActive: {
    backgroundColor: skyBlue,
  },
  kindTabText: {
    ...moneyType.body,
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 17,
    fontWeight: '600',
    lineHeight: 23,
    color: '#BBBBBB',
  },
  kindTabTextActive: {
    color: skyBlue,
  },
  kindTabs: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    flexDirection: 'row',
    height: 60,
    overflow: 'hidden',
    paddingHorizontal: 26,
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
  backgroundOption: {
    alignItems: 'center',
    borderColor: line,
    borderRadius: 8,
    borderWidth: 1,
    flexBasis: '30%',
    flexGrow: 1,
    gap: 8,
    minHeight: 82,
    justifyContent: 'center',
    padding: 10,
  },
  backgroundOptionSelected: {
    borderColor: skyBlue,
    borderWidth: 2,
  },
  backgroundOptionText: {
    ...moneyType.caption,
    color: ink,
    textAlign: 'center',
  },
  backgroundOptionTextSelected: {
    color: skyBlue,
    fontWeight: '700',
  },
  backgroundPanel: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    padding: 14,
  },
  backgroundDefaultButton: {
    alignItems: 'center',
    borderColor: line,
    borderRadius: 10,
    borderWidth: 1,
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 16,
    width: '100%',
  },
  backgroundDefaultButtonText: {
    ...moneyType.button,
    color: ink,
  },
  backgroundPhotoButton: {
    alignItems: 'center',
    backgroundColor: skyBlue,
    borderRadius: 12,
    flexDirection: 'row',
    gap: 8,
    minHeight: 52,
    justifyContent: 'center',
    paddingHorizontal: 18,
    width: '100%',
  },
  backgroundPhotoButtonText: {
    ...moneyType.button,
    color: '#FFFFFF',
  },
  backgroundSwatch: {
    borderColor: line,
    borderRadius: 18,
    borderWidth: 1,
    height: 36,
    width: 36,
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
    paddingBottom: 132,
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
    borderRadius: 18,
    elevation: 5,
    justifyContent: 'center',
    marginHorizontal: 28,
    marginTop: 16,
    minHeight: 46,
    shadowColor: '#26AFA9',
    shadowOffset: {
      height: 9,
      width: 0,
    },
    shadowOpacity: 0.24,
    shadowRadius: 12,
  },
  primaryCtaDisabled: {
    opacity: 0.55,
  },
  primaryCtaText: {
    ...moneyType.body,
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
  categoryDetailAmountChip: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    elevation: 2,
    justifyContent: 'center',
    minHeight: 30,
    minWidth: 92,
    paddingHorizontal: 12,
    shadowColor: '#95B4BD',
    shadowOffset: {
      height: 5,
      width: 0,
    },
    shadowOpacity: 0.12,
    shadowRadius: 12,
  },
  categoryDetailAmountChipText: {
    fontFamily: 'Montserrat_800ExtraBold',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0,
    lineHeight: 21,
  },
  categoryDetailBackButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E7F3F3',
    borderRadius: 12,
    borderWidth: 1,
    elevation: 3,
    height: 36,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    shadowColor: '#95B4BD',
    shadowOffset: {
      height: 7,
      width: 0,
    },
    shadowOpacity: 0.15,
    shadowRadius: 14,
    top: 8,
    width: 36,
    zIndex: 2,
  },
  categoryDetailChartCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderColor: '#DDF3F0',
    borderRadius: 24,
    borderWidth: 1,
    elevation: 5,
    marginHorizontal: 14,
    marginTop: 8,
    paddingBottom: 14,
    paddingHorizontal: 14,
    paddingTop: 14,
    shadowColor: '#95B4BD',
    shadowOffset: {
      height: 10,
      width: 0,
    },
    shadowOpacity: 0.15,
    shadowRadius: 20,
  },
  categoryDetailChartHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  categoryDetailChartIcon: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#DDF3F0',
    borderRadius: 18,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    shadowColor: '#95B4BD',
    shadowOffset: {
      height: 5,
      width: 0,
    },
    shadowOpacity: 0.13,
    shadowRadius: 12,
    width: 36,
  },
  categoryDetailChartTitle: {
    fontFamily: 'Montserrat_800ExtraBold',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0,
    lineHeight: 22,
    color: ink,
  },
  categoryDetailChips: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 3,
  },
  categoryDetailContent: {
    paddingBottom: 120,
    paddingHorizontal: 0,
    paddingTop: 10,
  },
  categoryDetailDateLeft: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 12,
    minWidth: 0,
  },
  categoryDetailEmptyCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderColor: '#EDF4F5',
    borderRadius: 18,
    borderWidth: 1,
    marginHorizontal: 14,
    marginTop: 16,
    overflow: 'hidden',
  },
  categoryDetailHero: {
    minHeight: 96,
    marginHorizontal: 14,
    position: 'relative',
  },
  categoryDetailHeroMain: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    marginLeft: 54,
    marginRight: 84,
    paddingTop: 0,
  },
  categoryDetailHeroTextColumn: {
    flex: 1,
    minWidth: 0,
  },
  categoryDetailHeroCloud: {
    position: 'absolute',
    right: 8,
    top: 0,
  },
  categoryDetailHeroStar: {
    position: 'absolute',
    right: 70,
    top: 8,
  },
  categoryDetailMonthChip: {
    alignItems: 'center',
    backgroundColor: '#F2FCFA',
    borderColor: '#DDF3F0',
    borderRadius: 15,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 30,
    minWidth: 58,
    paddingHorizontal: 12,
  },
  categoryDetailMonthChipText: {
    color: skyBlue,
    fontFamily: 'Montserrat_800ExtraBold',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0,
    lineHeight: 20,
  },
  categoryDetailRecordAmount: {
    color: ink,
    fontFamily: 'Montserrat_800ExtraBold',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0,
    lineHeight: 22,
    marginLeft: 'auto',
  },
  categoryDetailRecordCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderColor: '#DDF3F0',
    borderRadius: 18,
    borderWidth: 1,
    elevation: 4,
    marginHorizontal: 14,
    marginTop: 16,
    overflow: 'hidden',
    shadowColor: '#95B4BD',
    shadowOffset: {
      height: 8,
      width: 0,
    },
    shadowOpacity: 0.12,
    shadowRadius: 18,
  },
  categoryDetailRecordDateAmount: {
    fontFamily: 'Montserrat_800ExtraBold',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0,
    lineHeight: 20,
    marginLeft: 10,
  },
  categoryDetailRecordDateRow: {
    alignItems: 'center',
    backgroundColor: '#F2FCFA',
    borderBottomColor: '#DDF3F0',
    borderBottomWidth: 1,
    flexDirection: 'row',
    minHeight: 42,
    paddingHorizontal: 14,
  },
  categoryDetailRecordDateText: {
    color: '#0D7770',
    flex: 1,
    fontFamily: 'Montserrat_800ExtraBold',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0,
    lineHeight: 20,
  },
  categoryDetailRecordIconWrap: {
    alignItems: 'center',
    backgroundColor: '#FFF5F0',
    borderRadius: 24,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  categoryDetailRecordList: {
    paddingTop: 4,
  },
  categoryDetailRecordRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    minHeight: 64,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  categoryDetailRecordSpark: {
    marginLeft: -8,
  },
  categoryDetailRecordTitle: {
    color: ink,
    fontFamily: 'Montserrat_800ExtraBold',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0,
    lineHeight: 23,
    maxWidth: '44%',
  },
  categoryDetailTitle: {
    color: '#0E2239',
    fontFamily: 'Montserrat_800ExtraBold',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 0,
    lineHeight: 30,
    marginTop: 0,
    textAlign: 'left',
    width: '100%',
  },
  categoryTrendBar: {
    borderRadius: 7,
    minHeight: 0,
    bottom: 0,
    position: 'absolute',
    width: 26,
  },
  categoryTrendBarsLayer: {
    bottom: 0,
    flexDirection: 'row',
    gap: 6,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  categoryTrendBarSlot: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-end',
    minWidth: 0,
    position: 'relative',
  },
  categoryTrendBarValue: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0,
    lineHeight: 16,
    maxWidth: 50,
    position: 'absolute',
    textAlign: 'center',
  },
  categoryTrendChartArea: {
    flexDirection: 'row',
    minHeight: 214,
  },
  categoryTrendDot: {
    bottom: -5,
    borderRadius: 5,
    height: 10,
    position: 'absolute',
    width: 10,
  },
  categoryTrendGrid: {
    bottom: 0,
    justifyContent: 'space-between',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  categoryTrendGridLine: {
    borderTopColor: '#D9DFE3',
    borderTopWidth: 1,
    borderStyle: 'dashed',
    height: 1,
  },
  categoryTrendPlot: {
    borderBottomColor: '#8EDDD8',
    borderBottomWidth: 2,
    flex: 1,
    marginTop: 2,
    position: 'relative',
  },
  categoryTrendXAxis: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
  },
  categoryTrendXAxisLabel: {
    color: '#3F4756',
    flex: 1,
    fontFamily: 'Montserrat_500Medium',
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0,
    lineHeight: 18,
    minWidth: 0,
    textAlign: 'center',
  },
  categoryTrendXAxisSpacer: {
    width: 76,
  },
  categoryTrendYAxis: {
    justifyContent: 'space-between',
    paddingBottom: 0,
    paddingRight: 8,
    width: 76,
  },
  categoryTrendYAxisLabel: {
    color: '#3F4756',
    fontFamily: 'Montserrat_500Medium',
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0,
    lineHeight: 15,
    textAlign: 'right',
  },
  reportContent: {
    paddingBottom: 112,
    paddingTop: 0,
  },
  reportAmount: {
    color: ink,
    fontFamily: 'Montserrat_800ExtraBold',
    fontSize: 23,
    fontWeight: '800',
    letterSpacing: 0,
    lineHeight: 29,
    marginTop: 8,
  },
  reportBody: {
    backgroundColor: 'transparent',
    minHeight: 360,
    paddingBottom: 8,
  },
  reportBreakdownAmount: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0,
    lineHeight: 20,
    color: ink,
    marginLeft: 8,
    minWidth: 78,
    textAlign: 'right',
  },
  reportBreakdownColorDot: {
    borderColor: '#FFFFFF',
    borderRadius: 6,
    borderWidth: 2,
    height: 12,
    width: 12,
  },
  reportBreakdownList: {
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderColor: '#EDF4F5',
    borderRadius: 20,
    borderWidth: 1,
    elevation: 4,
    marginHorizontal: 18,
    marginTop: 16,
    overflow: 'hidden',
    shadowColor: '#95B4BD',
    shadowOffset: {
      height: 8,
      width: 0,
    },
    shadowOpacity: 0.13,
    shadowRadius: 18,
  },
  reportBreakdownPercent: {
    fontFamily: 'Montserrat_500Medium',
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 0,
    lineHeight: 19,
    color: '#5B606B',
    marginLeft: 10,
    minWidth: 42,
    textAlign: 'right',
  },
  reportBreakdownRow: {
    alignItems: 'center',
    borderBottomColor: '#EEF3F6',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 8,
    minHeight: 60,
    paddingHorizontal: 16,
  },
  reportBreakdownRowLast: {
    borderBottomWidth: 0,
  },
  reportBreakdownTitle: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0,
    lineHeight: 20,
    color: ink,
    flex: 1,
  },
  reportBottomRow: {
    alignItems: 'center',
    borderTopColor: '#E8EFF1',
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
    minHeight: 54,
  },
  reportCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderColor: '#EDF4F5',
    borderRadius: 22,
    borderWidth: 1,
    elevation: 5,
    marginHorizontal: 18,
    marginTop: 14,
    overflow: 'hidden',
    shadowColor: '#95B4BD',
    shadowOffset: {
      height: 10,
      width: 0,
    },
    shadowOpacity: 0.15,
    shadowRadius: 20,
  },
  reportChartCallout: {
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    elevation: 1,
    flexDirection: 'row',
    gap: 5,
    height: 54,
    paddingHorizontal: 7,
    position: 'absolute',
    shadowColor: '#9DB8B8',
    shadowOffset: {
      height: 6,
      width: 0,
    },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    width: 138,
  },
  reportChartCalloutBottomLeft: {
    bottom: 16,
    left: 12,
  },
  reportChartCalloutBottomRight: {
    bottom: 16,
    right: 12,
  },
  reportChartCalloutDot: {
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  reportChartCalloutLabel: {
    color: ink,
    fontFamily: 'Montserrat_700Bold',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0,
    lineHeight: 17,
    minWidth: 0,
  },
  reportChartCalloutLabelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 2,
    marginTop: 2,
  },
  reportChartCalloutPercent: {
    fontFamily: 'Montserrat_800ExtraBold',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0,
    lineHeight: 20,
  },
  reportChartCalloutTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  reportChartCalloutTopLeft: {
    left: 12,
    top: 16,
  },
  reportChartCalloutTopRight: {
    right: 12,
    top: 16,
  },
  reportChartCanvas: {
    alignItems: 'center',
    alignSelf: 'center',
    height: 296,
    justifyContent: 'center',
    maxWidth: 344,
    width: '100%',
  },
  reportChartEmptyText: {
    ...moneyType.body,
    color: muted,
    position: 'absolute',
  },
  reportChartHole: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E9EFEF',
    borderRadius: 44,
    borderWidth: 5,
    height: 88,
    justifyContent: 'center',
    left: '50%',
    marginLeft: -44,
    marginTop: -44,
    position: 'absolute',
    top: '50%',
    width: 88,
  },
  reportChartPanel: {
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderColor: '#EDF4F5',
    borderRadius: 20,
    borderWidth: 1,
    elevation: 4,
    marginHorizontal: 18,
    minHeight: 310,
    paddingHorizontal: 8,
    paddingVertical: 8,
    shadowColor: '#95B4BD',
    shadowOffset: {
      height: 8,
      width: 0,
    },
    shadowOpacity: 0.12,
    shadowRadius: 18,
  },
  reportEmptyListText: {
    ...moneyType.body,
    color: muted,
    paddingHorizontal: 18,
    paddingVertical: 22,
    textAlign: 'center',
  },
  reportDetailContent: {
    backgroundColor: '#FFFFFF',
    paddingBottom: 28,
  },
  reportDetailHeader: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomColor: line,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 12,
    minHeight: 64,
    paddingHorizontal: 18,
  },
  reportDetailHeaderRight: {
    alignItems: 'flex-end',
    minWidth: 40,
  },
  reportDetailHeaderTitle: {
    ...moneyType.title,
    color: ink,
    flex: 1,
  },
  reportHalf: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 14,
  },
  reportKindTab: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-end',
  },
  reportKindTabLine: {
    backgroundColor: 'transparent',
    borderRadius: 3,
    height: 4,
    marginTop: 9,
    width: '92%',
  },
  reportKindTabLineActive: {
    backgroundColor: '#12C7C2',
  },
  reportKindTabs: {
    backgroundColor: 'transparent',
    flexDirection: 'row',
    height: 50,
    marginHorizontal: 28,
    marginTop: 12,
  },
  reportKindTabText: {
    color: '#A7A3B3',
    fontFamily: 'Montserrat_700Bold',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0,
    lineHeight: 23,
  },
  reportKindTabTextActive: {
    color: '#12C7C2',
  },
  reportModeTab: {
    alignItems: 'center',
    borderColor: skyBlue,
    borderRightWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 52,
  },
  reportModeTabActive: {
    backgroundColor: skyBlue,
  },
  reportModeTabText: {
    ...moneyType.labelSmall,
    color: skyBlue,
  },
  reportModeTabTextActive: {
    color: '#FFFFFF',
  },
  reportModeTabs: {
    borderColor: skyBlue,
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: 'row',
    marginHorizontal: 22,
    marginTop: 14,
    overflow: 'hidden',
  },
  reportNet: {
    color: incomeColor,
    fontFamily: 'Montserrat_800ExtraBold',
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 0,
    lineHeight: 32,
  },
  reportPageHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 78,
    paddingBottom: 6,
    paddingLeft: 22,
    paddingRight: 14,
    paddingTop: 6,
  },
  reportPageTitle: {
    color: '#0F2445',
    flex: 1,
    fontFamily: 'Montserrat_700Bold',
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 0,
    lineHeight: 31,
  },
  reportSummaryLabel: {
    color: ink,
    fontFamily: 'Montserrat_700Bold',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0,
    lineHeight: 22,
  },
  reportTopRow: {
    flexDirection: 'row',
    minHeight: 86,
  },
  reportVerticalLine: {
    alignSelf: 'center',
    backgroundColor: '#E8EFF1',
    height: 62,
    width: 1,
  },
  yearBar: {
    borderRadius: 2,
    minHeight: 0,
    width: 16,
  },
  yearBarSlot: {
    alignItems: 'center',
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
  },
  yearBarsLayer: {
    alignItems: 'flex-end',
    bottom: 12,
    flexDirection: 'row',
    left: 76,
    position: 'absolute',
    right: 14,
    top: 8,
  },
  yearChart: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 6,
    paddingTop: 22,
  },
  yearChartGridLabel: {
    ...moneyType.caption,
    color: '#666666',
    width: 70,
  },
  yearChartGridLine: {
    backgroundColor: '#D2D8D8',
    flex: 1,
    height: 1,
  },
  yearChartGridRow: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
  },
  yearChartPlot: {
    height: 270,
    position: 'relative',
  },
  yearMonthAxis: {
    flexDirection: 'row',
    marginLeft: 76,
    marginRight: 14,
    paddingBottom: 18,
    paddingTop: 8,
  },
  yearMonthLabel: {
    ...moneyType.caption,
    color: '#666666',
    flex: 1,
    textAlign: 'center',
  },
  yearMonthList: {
    backgroundColor: '#FFFFFF',
    borderTopColor: line,
    borderTopWidth: 1,
  },
  yearMonthRow: {
    alignItems: 'center',
    borderBottomColor: line,
    borderBottomWidth: 1,
    flexDirection: 'row',
    minHeight: 68,
    paddingHorizontal: 22,
  },
  yearMonthRowAmount: {
    ...moneyType.label,
    color: ink,
  },
  yearMonthRowLabel: {
    ...moneyType.label,
    color: ink,
    flex: 1,
  },
  yearTotalAmount: {
    ...moneyType.label,
    color: ink,
  },
  yearTotalLabel: {
    ...moneyType.label,
    color: ink,
    flex: 1,
  },
  yearTotalRow: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderTopColor: line,
    borderTopWidth: 1,
    flexDirection: 'row',
    minHeight: 68,
    paddingHorizontal: 22,
  },
  safeArea: {
    backgroundColor: '#FFFFFF',
    flex: 1,
  },
  saturdayText: {
    color: incomeColor,
  },
  sectionLabel: {
    ...moneyType.body,
    color: ink,
    fontFamily: 'Montserrat_500Medium',
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 21,
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
    backgroundColor: '#FFFFFF',
    borderColor: '#DCEFF0',
    borderRadius: 16,
    borderWidth: 1,
    color: ink,
    flex: 1,
    fontSize: 14,
    lineHeight: 19,
    minHeight: 38,
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
    backgroundColor: 'transparent',
    justifyContent: 'center',
    minHeight: 34,
    width: `${100 / 7}%`,
  },
  weekdayText: {
    ...moneyType.label,
    color: '#18325C',
  },
});
