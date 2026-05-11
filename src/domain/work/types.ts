import type { LocalDate } from '@/domain/common/date-rules';
import type { EntityId } from '@/domain/common/ids';
import type { CurrencyCode } from '@/domain/common/money';
import type { WorkspaceId } from '@/domain/workspace/types';

export type LocalTime = string & { readonly __brand: 'LocalTime' };
export type WorkEntryMode = 'hours' | 'shift';
export type WorkEntrySource = 'manual';
export type WorkEntrySourceOfTruth = 'manual';
export type WorkEntryWageSource = 'default' | 'override';
export type WorkEntryNote = string & { readonly __brand: 'WorkEntryNote' };
export type WorkHistoryPaidFilter = 'paid' | 'unpaid';
export type WorkHistorySort = 'date_asc' | 'date_desc' | 'duration_asc' | 'duration_desc' | 'earned_asc' | 'earned_desc';
export type WorkHistorySummaryMode = 'day' | 'week' | 'month';

export type WorkEntry = {
  breakMinutes: number;
  categoryId: EntityId | null;
  createdAt: string;
  deletedAt: string | null;
  durationMinutes: number;
  earnedIncomeMinor: number;
  endedAtLocalDate: LocalDate | null;
  endedAtLocalTime: LocalTime | null;
  entryMode: WorkEntryMode;
  id: EntityId;
  localDate: LocalDate;
  note: WorkEntryNote | null;
  paid: boolean;
  source: WorkEntrySource;
  sourceOfTruth: WorkEntrySourceOfTruth;
  startedAtLocalDate: LocalDate | null;
  startedAtLocalTime: LocalTime | null;
  topicIds: EntityId[];
  updatedAt: string;
  wageCurrencyCode: CurrencyCode;
  wageMinorPerHour: number;
  wageSource: WorkEntryWageSource;
  workspaceId: WorkspaceId;
};

export type SaveWorkEntryInput = {
  breakMinutes: number;
  categoryId?: string | null;
  createdAt: string;
  deletedAt?: string | null;
  durationMinutes: number;
  earnedIncomeMinor: number;
  endedAtLocalDate?: string | null;
  endedAtLocalTime?: string | null;
  entryMode: WorkEntryMode;
  id: string;
  localDate: string;
  note?: string | null;
  paid: boolean;
  source: WorkEntrySource;
  sourceOfTruth: WorkEntrySourceOfTruth;
  startedAtLocalDate?: string | null;
  startedAtLocalTime?: string | null;
  topicIds: string[];
  updatedAt: string;
  wageCurrencyCode: string;
  wageMinorPerHour: number;
  wageSource: WorkEntryWageSource;
  workspaceId: string;
};

export type WorkHistoryQuery = {
  categoryId: EntityId | null;
  dateFrom: LocalDate | null;
  dateTo: LocalDate | null;
  entryMode: WorkEntryMode | null;
  limit: number;
  noteSearch: string | null;
  offset: number;
  paid: WorkHistoryPaidFilter | null;
  sort: WorkHistorySort;
  topicId: EntityId | null;
};

export type WorkHistoryPage = {
  hasMore: boolean;
  limit: number;
  offset: number;
  records: WorkEntry[];
  totalCount: number;
};
