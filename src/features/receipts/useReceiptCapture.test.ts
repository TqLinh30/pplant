import { createAppError } from '@/domain/common/app-error';

import {
  initialReceiptCaptureState,
  receiptCaptureReducer,
} from './useReceiptCapture';

describe('receipt capture state', () => {
  it('tracks permission-denied and canceled outcomes without draft data', () => {
    const denied = receiptCaptureReducer(initialReceiptCaptureState, {
      outcome: {
        reason: 'camera_permission',
        status: 'permission_denied',
      },
      type: 'capture_succeeded',
    });
    const canceled = receiptCaptureReducer(denied, {
      outcome: {
        source: 'library',
        status: 'canceled',
      },
      type: 'capture_succeeded',
    });

    expect(denied.status).toBe('permission_denied');
    expect(denied.draft).toBeNull();
    expect(canceled.status).toBe('canceled');
    expect(canceled.draft).toBeNull();
  });

  it('keeps capture errors recoverable', () => {
    const failed = receiptCaptureReducer(initialReceiptCaptureState, {
      error: createAppError('unavailable', 'Receipt image could not be saved locally.', 'manual_entry'),
      type: 'capture_failed',
    });

    expect(failed.status).toBe('failed');
    expect(failed.actionError?.recovery).toBe('manual_entry');
  });
});
