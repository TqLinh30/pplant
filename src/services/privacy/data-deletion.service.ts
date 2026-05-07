import { ok, type AppResult } from '@/domain/common/result';
import type { DataDeletionPlan } from '@/domain/privacy/deletion-plan';

export async function previewDeletionPlan(plan: DataDeletionPlan): Promise<AppResult<DataDeletionPlan>> {
  return ok(plan);
}
