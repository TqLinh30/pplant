import type { LocalDate } from '@/domain/common/date-rules';
import type { EntityId } from '@/domain/common/ids';
import type { CurrencyCode } from '@/domain/common/money';
import type {
  MoneyRecordKind,
  MoneyRecordMerchantOrSource,
  MoneyRecordNote,
  MoneyRecordSource,
  MoneyRecordSourceOfTruth,
} from '@/domain/money/types';
import type { WorkspaceId } from '@/domain/workspace/types';

export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly';
export type RecurrenceOwnerKind = 'money';
export type RecurrenceExceptionAction = 'skip';

export type RecurrenceRuleDraft = {
  frequency: RecurrenceFrequency;
  startsOnLocalDate: string;
  endsOnLocalDate?: string;
};

export type RecurrenceRule = {
  id: EntityId;
  workspaceId: WorkspaceId;
  ownerKind: RecurrenceOwnerKind;
  frequency: RecurrenceFrequency;
  startsOnLocalDate: LocalDate;
  endsOnLocalDate: LocalDate | null;
  lastGeneratedLocalDate: LocalDate | null;
  pausedAt: string | null;
  stoppedAt: string | null;
  deletedAt: string | null;
  moneyKind: MoneyRecordKind;
  amountMinor: number;
  currencyCode: CurrencyCode;
  categoryId: EntityId | null;
  topicIds: EntityId[];
  merchantOrSource: MoneyRecordMerchantOrSource | null;
  note: MoneyRecordNote | null;
  source: MoneyRecordSource;
  sourceOfTruth: MoneyRecordSourceOfTruth;
  createdAt: string;
  updatedAt: string;
};

export type RecurrenceException = {
  id: EntityId;
  recurrenceRuleId: EntityId;
  workspaceId: WorkspaceId;
  occurrenceLocalDate: LocalDate;
  action: RecurrenceExceptionAction;
  moneyRecordId: EntityId | null;
  createdAt: string;
  updatedAt: string;
};

export type SaveRecurringMoneyRuleInput = {
  id: string;
  workspaceId: string;
  frequency: RecurrenceFrequency;
  startsOnLocalDate: string;
  endsOnLocalDate?: string | null;
  lastGeneratedLocalDate?: string | null;
  pausedAt?: string | null;
  stoppedAt?: string | null;
  deletedAt?: string | null;
  moneyKind: MoneyRecordKind;
  amountMinor: number;
  currencyCode: string;
  categoryId?: string | null;
  topicIds: string[];
  merchantOrSource?: string | null;
  note?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SaveRecurrenceExceptionInput = {
  id: string;
  recurrenceRuleId: string;
  workspaceId: string;
  occurrenceLocalDate: string;
  action: RecurrenceExceptionAction;
  moneyRecordId?: string | null;
  createdAt: string;
  updatedAt: string;
};
