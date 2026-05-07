import type { Money } from '@/domain/common/money';

export type MoneyRecordKind = 'expense' | 'income';

export type MoneyRecordDraft = {
  kind: MoneyRecordKind;
  amount: Money;
  localDate: string;
  categoryId?: string;
  topicIds: string[];
  merchantOrSource?: string;
  note?: string;
};
