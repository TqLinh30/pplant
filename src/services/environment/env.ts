import { z } from 'zod';

import { err, ok, type AppResult } from '@/domain/common/result';
import { createAppError } from '@/domain/common/app-error';

const envSchema = z.object({
  EXPO_PUBLIC_DIAGNOSTICS_ENABLED: z.enum(['true', 'false']).default('false'),
  EXPO_PUBLIC_OCR_PROVIDER: z.string().optional(),
});

export type AppEnvironment = z.infer<typeof envSchema>;

export function readEnvironment(raw: Record<string, string | undefined>): AppResult<AppEnvironment> {
  const parsed = envSchema.safeParse(raw);

  if (!parsed.success) {
    return err(createAppError('validation_failed', 'Environment configuration is invalid.'));
  }

  return ok(parsed.data);
}
