import { createAppError } from './app-error';
import { err, ok, type AppResult } from './result';

export type EntityId = string & { readonly __brand: 'EntityId' };

export function asEntityId(value: string): AppResult<EntityId> {
  const normalized = value.trim();

  if (normalized.length === 0) {
    return err(createAppError('validation_failed', 'Entity id cannot be empty.'));
  }

  return ok(normalized as EntityId);
}
