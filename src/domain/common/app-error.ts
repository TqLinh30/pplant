export type AppErrorCode =
  | 'validation_failed'
  | 'not_found'
  | 'unavailable'
  | 'permission_denied'
  | 'conflict'
  | 'unknown';

export type AppErrorRecovery =
  | 'retry'
  | 'edit'
  | 'manual_entry'
  | 'discard'
  | 'settings'
  | 'none';

export type AppError = {
  code: AppErrorCode;
  message: string;
  recovery: AppErrorRecovery;
  cause?: unknown;
};

export function createAppError(
  code: AppErrorCode,
  message: string,
  recovery: AppErrorRecovery = 'none',
  cause?: unknown,
): AppError {
  return {
    code,
    message,
    recovery,
    ...(cause === undefined ? {} : { cause }),
  };
}
