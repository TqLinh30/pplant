import type { PplantDatabase } from '@/data/db/client';
import { createAppError } from '@/domain/common/app-error';
import { err, ok, type AppResult } from '@/domain/common/result';
import { redactDiagnosticEvent } from '@/diagnostics/redact';
import type { DiagnosticEvent } from '@/diagnostics/events';

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
      const redacted = redactDiagnosticEvent(input);

      try {
        database.$client.runSync(
          `INSERT INTO diagnostic_events
            (id, name, occurred_at, app_version, error_category, metadata_json, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          input.id,
          redacted.name,
          redacted.occurredAt,
          redacted.appVersion,
          redacted.errorCategory,
          redacted.metadata ? JSON.stringify(redacted.metadata) : null,
          input.createdAt,
        );

        return ok(redacted);
      } catch (cause) {
        return err(createAppError('unavailable', 'Diagnostic event could not be recorded.', 'none', cause));
      }
    },
  };
}
