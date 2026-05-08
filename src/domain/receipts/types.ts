import type { EntityId } from '@/domain/common/ids';
import type { WorkspaceId } from '@/domain/workspace/types';

export type ReceiptParsingState =
  | 'draft'
  | 'pending'
  | 'running'
  | 'parsed'
  | 'low_confidence'
  | 'failed'
  | 'reviewed'
  | 'saved'
  | 'retry_exhausted'
  | 'discarded';

export type ParsedReceiptField<T> = {
  value?: T;
  confidence: 'high' | 'medium' | 'low' | 'unknown';
  source: 'parsed' | 'manual' | 'estimated' | 'user_corrected';
};

export type NormalizedReceiptParseResult = {
  categoryId: ParsedReceiptField<string | null>;
  currency: string;
  duplicateSuspected: boolean;
  merchant: ParsedReceiptField<string>;
  localDate: ParsedReceiptField<string>;
  totalMinor: ParsedReceiptField<number>;
  lineItems: {
    label: ParsedReceiptField<string>;
    amountMinor: ParsedReceiptField<number>;
  }[];
  topicIds: ParsedReceiptField<string[]>;
  unknownFields: string[];
};

export const receiptParseJobStatuses = [
  'pending',
  'running',
  'parsed',
  'low_confidence',
  'reviewed',
  'saved',
  'failed',
  'retry_exhausted',
] as const;

export type ReceiptParseJobStatus = (typeof receiptParseJobStatuses)[number];

export type ReceiptParseJob = {
  attemptCount: number;
  completedAt: string | null;
  createdAt: string;
  deletedAt: string | null;
  id: EntityId;
  lastErrorCategory: string | null;
  normalizedResult: NormalizedReceiptParseResult | null;
  receiptDraftId: EntityId;
  requestedAt: string;
  retryWindowStartedAt: string | null;
  startedAt: string | null;
  status: ReceiptParseJobStatus;
  updatedAt: string;
  workspaceId: WorkspaceId;
};

export type ReceiptParseJobRow = {
  attemptCount: number;
  completedAt: string | null;
  createdAt: string;
  deletedAt: string | null;
  id: string;
  lastErrorCategory: string | null;
  receiptDraftId: string;
  requestedAt: string;
  resultJson: string | null;
  retryWindowStartedAt: string | null;
  startedAt: string | null;
  status: string;
  updatedAt: string;
  workspaceId: string;
};
