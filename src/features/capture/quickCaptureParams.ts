import type { MoneyRecordKind } from '@/domain/money/types';

export function parseMoneyQuickCaptureParam(value: string | string[] | undefined): MoneyRecordKind | null {
  const candidate = Array.isArray(value) ? value[0] : value;

  if (candidate === 'expense' || candidate === 'income') {
    return candidate;
  }

  return null;
}
