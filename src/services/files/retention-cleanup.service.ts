import { ok, type AppResult } from '@/domain/common/result';

export async function cleanupAbandonedReceiptDrafts(): Promise<AppResult<{ cleaned: number }>> {
  return ok({ cleaned: 0 });
}
