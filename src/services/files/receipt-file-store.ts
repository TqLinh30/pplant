import { createAppError } from '@/domain/common/app-error';
import { err, type AppResult } from '@/domain/common/result';

export async function persistReceiptImageReference(uri: string): Promise<AppResult<{ uri: string }>> {
  void uri;
  return err(createAppError('unavailable', 'Receipt file storage is not implemented yet.', 'manual_entry'));
}
