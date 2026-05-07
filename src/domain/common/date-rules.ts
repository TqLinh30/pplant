import { createAppError } from './app-error';
import { err, ok, type AppResult } from './result';

export type LocalDate = string & { readonly __brand: 'LocalDate' };

export type WeekStartsOn = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const defaultWeekStartsOn: WeekStartsOn = 1;

export function asLocalDate(value: string): AppResult<LocalDate> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return err(createAppError('validation_failed', 'Local dates must use YYYY-MM-DD format.'));
  }

  return ok(value as LocalDate);
}
