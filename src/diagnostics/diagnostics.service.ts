import { ok, type AppResult } from '@/domain/common/result';

import type { DiagnosticEvent } from './events';
import { redactDiagnosticEvent } from './redact';

export async function recordDiagnosticEvent(event: DiagnosticEvent): Promise<AppResult<DiagnosticEvent>> {
  return ok(redactDiagnosticEvent(event));
}
