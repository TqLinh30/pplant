import type { PplantDatabase } from '@/data/db/client';
import { createAppError } from '@/domain/common/app-error';
import { err, ok, type AppResult } from '@/domain/common/result';
import { redactDiagnosticEvent } from '@/diagnostics/redact';
import { validateDiagnosticEvent, type DiagnosticEvent } from '@/diagnostics/events';

export type SaveDiagnosticEventInput = DiagnosticEvent & {
  createdAt: string;
  id: string;
};

export type DiagnosticsRepository = {
  recordEvent(input: SaveDiagnosticEventInput): Promise<AppResult<DiagnosticEvent>>;
};

export function createDiagnosticsRepository(database: PplantDatabase): DiagnosticsRepository {
  return {
    async recordEvent(input) {
      const redacted = redactDiagnosticEvent({
        appVersion: input.appVersion,
        errorCategory: input.errorCategory,
        metadata: input.metadata,
        name: input.name,
        occurredAt: input.occurredAt,
      });
      const validated = validateDiagnosticEvent(redacted);

      if (!validated.ok) {
        return validated;
      }

      try {
        database.$client.runSync(
          `INSERT INTO diagnostic_events
            (id, name, occurred_at, app_version, error_category, metadata_json, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          input.id,
          validated.value.name,
          validated.value.occurredAt,
          validated.value.appVersion,
          validated.value.errorCategory,
          validated.value.metadata ? JSON.stringify(validated.value.metadata) : null,
          input.createdAt,
        );

        return ok(validated.value);
      } catch (cause) {
        return err(createAppError('unavailable', 'Diagnostic event could not be recorded.', 'none', cause));
      }
    },
  };
}
