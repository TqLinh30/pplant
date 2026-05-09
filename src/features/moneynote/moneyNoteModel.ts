import type { MoneyRecord } from '@/domain/money/types';

export type MoneyNoteCategoryTemplate = {
  color: string;
  icon: string;
  id: string;
  label: string;
};

export type MoneyNoteTotals = {
  expenseMinor: number;
  incomeMinor: number;
  netMinor: number;
};

export type MoneyNoteCalendarDay = {
  dayOfMonth: number;
  dayOfWeek: number;
  inCurrentMonth: boolean;
  isToday: boolean;
  localDate: string;
};

export const moneyNoteDefaultPreferences = {
  currencyCode: 'VND',
  defaultHourlyWageMinor: 0,
  locale: 'vi-VN',
  monthlyBudgetResetDay: 1,
} as const;

export const expenseCategoryTemplates: MoneyNoteCategoryTemplate[] = [
  { color: '#F39822', icon: 'food-fork-drink', id: 'expense-food', label: 'Ăn uống' },
  { color: '#16B65C', icon: 'bottle-soda-outline', id: 'expense-daily', label: 'Chi tiêu hằng ngày' },
  { color: '#2C5FB8', icon: 'tshirt-crew-outline', id: 'expense-clothes', label: 'Quần áo' },
  { color: '#E84786', icon: 'lipstick', id: 'expense-cosmetics', label: 'Mỹ phẩm' },
  { color: '#F0D928', icon: 'glass-cocktail', id: 'expense-social', label: 'Phí giao lưu' },
  { color: '#5FE1AD', icon: 'pill', id: 'expense-health', label: 'Y tế' },
  { color: '#F0515F', icon: 'notebook-edit-outline', id: 'expense-education', label: 'Giáo dục' },
  { color: '#45CBE4', icon: 'water-pump', id: 'expense-electricity', label: 'Tiền điện' },
  { color: '#A56A3E', icon: 'train', id: 'expense-transport', label: 'Đi lại' },
  { color: '#737373', icon: 'cellphone', id: 'expense-phone', label: 'Phí liên lạc' },
  { color: '#E98BB7', icon: 'home-outline', id: 'expense-rent', label: 'Tiền nhà' },
];

export const incomeCategoryTemplates: MoneyNoteCategoryTemplate[] = [
  { color: '#12B956', icon: 'wallet-outline', id: 'income-salary', label: 'Tiền lương' },
  { color: '#F39822', icon: 'piggy-bank-outline', id: 'income-allowance', label: 'Tiền phụ cấp' },
  { color: '#F0515F', icon: 'gift-outline', id: 'income-bonus', label: 'Tiền thưởng' },
  { color: '#45CBE4', icon: 'sack-percent', id: 'income-extra', label: 'Thu nhập phụ' },
  { color: '#55D6BE', icon: 'chart-line', id: 'income-investment', label: 'Đầu tư' },
  { color: '#EF8BBB', icon: 'hand-coin-outline', id: 'income-temporary', label: 'Thu nhập tạm thời' },
];

export const allMoneyNoteCategoryTemplates = [
  ...expenseCategoryTemplates,
  ...incomeCategoryTemplates,
] as const;

export function formatLocalDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;
}

export function parseLocalDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);

  return new Date(year, month - 1, day);
}

export function shiftLocalDate(value: string, days: number): string {
  const date = parseLocalDate(value);
  date.setDate(date.getDate() + days);

  return formatLocalDate(date);
}

export function formatMoneyNoteDate(value: string): string {
  const date = parseLocalDate(value);
  const weekdays = ['CN', 'T.2', 'T.3', 'T.4', 'T.5', 'T.6', 'T.7'];

  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(
    2,
    '0',
  )}/${date.getFullYear()} (${weekdays[date.getDay()]})`;
}

export function monthLabel(date: Date): string {
  return `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
}

export function getMonthBounds(date: Date): { dateFrom: string; dateTo: string } {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);

  return {
    dateFrom: formatLocalDate(start),
    dateTo: formatLocalDate(end),
  };
}

export function shiftMonth(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

export function buildMoneyNoteCalendarMonth(date: Date, today = new Date()): MoneyNoteCalendarDay[] {
  const firstOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  const mondayOffset = (firstOfMonth.getDay() + 6) % 7;
  const cursor = new Date(firstOfMonth);
  cursor.setDate(firstOfMonth.getDate() - mondayOffset);

  return Array.from({ length: 42 }, () => {
    const current = new Date(cursor);
    const localDate = formatLocalDate(current);
    cursor.setDate(cursor.getDate() + 1);

    return {
      dayOfMonth: current.getDate(),
      dayOfWeek: current.getDay(),
      inCurrentMonth: current.getMonth() === date.getMonth(),
      isToday: localDate === formatLocalDate(today),
      localDate,
    };
  });
}

export function calculateMoneyNoteTotals(records: MoneyRecord[]): MoneyNoteTotals {
  return records.reduce<MoneyNoteTotals>(
    (totals, record) => {
      if (record.deletedAt !== null) {
        return totals;
      }

      if (record.kind === 'expense') {
        totals.expenseMinor += record.amountMinor;
      } else {
        totals.incomeMinor += record.amountMinor;
      }

      totals.netMinor = totals.incomeMinor - totals.expenseMinor;
      return totals;
    },
    { expenseMinor: 0, incomeMinor: 0, netMinor: 0 },
  );
}

export function formatDong(amountMinor: number): string {
  const sign = amountMinor < 0 ? '-' : '';
  const absolute = Math.abs(amountMinor);

  return `${sign}${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(absolute)}đ`;
}
