import type { CurrencyCode, Money } from '@/domain/common/money';
import type { EntityId } from '@/domain/common/ids';
import type { LocalDate } from '@/domain/common/date-rules';
import type { WorkspaceId } from '@/domain/workspace/types';

export type MoneyRecordKind = 'expense' | 'income';
export type MoneyRecordSource = 'manual';
export type MoneyRecordSourceOfTruth = 'manual';
export type MoneyRecordMerchantOrSource = string & { readonly __brand: 'MoneyRecordMerchantOrSource' };
export type MoneyRecordNote = string & { readonly __brand: 'MoneyRecordNote' };

export type MoneyRecordDraft = {
  kind: MoneyRecordKind;
  amount: Money;
  localDate: string;
  categoryId?: string;
  topicIds: string[];
  merchantOrSource?: string;
  note?: string;
};

export type MoneyRecord = {
  id: EntityId;
  workspaceId: WorkspaceId;
  kind: MoneyRecordKind;
  amountMinor: number;
  currencyCode: CurrencyCode;
  localDate: LocalDate;
  categoryId: EntityId | null;
  topicIds: EntityId[];
  merchantOrSource: MoneyRecordMerchantOrSource | null;
  note: MoneyRecordNote | null;
  source: MoneyRecordSource;
  sourceOfTruth: MoneyRecordSourceOfTruth;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type SaveManualMoneyRecordInput = {
  id: string;
  workspaceId: string;
  kind: MoneyRecordKind;
  amountMinor: number;
  currencyCode: string;
  localDate: string;
  categoryId?: string | null;
  topicIds: string[];
  merchantOrSource?: string | null;
  note?: string | null;
  source: MoneyRecordSource;
  sourceOfTruth: MoneyRecordSourceOfTruth;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
};
