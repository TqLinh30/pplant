import type { AppError } from './app-error';

export type AppResult<T, E extends AppError = AppError> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export function ok<T>(value: T): AppResult<T> {
  return { ok: true, value };
}

export function err<E extends AppError>(error: E): AppResult<never, E> {
  return { ok: false, error };
}

export function isOk<T, E extends AppError>(result: AppResult<T, E>): result is { ok: true; value: T } {
  return result.ok;
}

export function isErr<T, E extends AppError>(result: AppResult<T, E>): result is { ok: false; error: E } {
  return !result.ok;
}
