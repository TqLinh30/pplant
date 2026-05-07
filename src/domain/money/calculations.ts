import { addMoney, type Money } from '@/domain/common/money';
import type { AppResult } from '@/domain/common/result';

export function sumMoney(values: Money[]): AppResult<Money | null> {
  if (values.length === 0) {
    return { ok: true, value: null };
  }

  return values.slice(1).reduce<AppResult<Money>>(
    (result, value) => (result.ok ? addMoney(result.value, value) : result),
    { ok: true, value: values[0] },
  );
}
