import { createAppError } from '@/domain/common/app-error';
import { err } from '@/domain/common/result';

import type { ReceiptParsingPort } from './receipt-parsing.port';

export const noopReceiptParser: ReceiptParsingPort = {
  async parseReceiptDraft() {
    return err(createAppError('unavailable', 'Receipt parsing is not configured.', 'manual_entry'));
  },
};
