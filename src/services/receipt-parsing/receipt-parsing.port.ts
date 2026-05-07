import type { NormalizedReceiptParseResult } from '@/domain/receipts/types';
import type { AppResult } from '@/domain/common/result';

export type ReceiptParsingRequest = {
  receiptDraftId: string;
  imageUri?: string;
};

export type ReceiptParsingPort = {
  parseReceiptDraft(request: ReceiptParsingRequest): Promise<AppResult<NormalizedReceiptParseResult>>;
};
