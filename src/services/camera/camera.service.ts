import { createAppError } from '@/domain/common/app-error';
import { err, type AppResult } from '@/domain/common/result';

export type CapturedReceiptImage = {
  uri: string;
};

export async function captureReceiptImage(): Promise<AppResult<CapturedReceiptImage>> {
  return err(createAppError('unavailable', 'Camera capture is not implemented yet.', 'manual_entry'));
}
