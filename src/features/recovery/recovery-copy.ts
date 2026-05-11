import type { RecoveryAction } from '@/domain/recovery/types';
import type { RecoveryItem, RecoveryItemReason } from '@/services/recovery/recovery.service';

export const recoveryPanelTitle = 'Needs a next step';
export const recoveryPanelDescription = 'You can choose what happens next.';

const reasonCopy: Record<RecoveryItemReason, { description: string; status: string }> = {
  receipt_parsing_failed: {
    description: 'Parsing did not finish. Retry, edit the receipt draft, enter manually, or discard it.',
    status: 'Receipt parsing needs attention',
  },
  receipt_parsing_queued: {
    description: 'Receipt parsing is queued. You can retry, edit the draft, enter manually, or discard it.',
    status: 'Receipt parsing queued',
  },
  receipt_parsing_retry_exhausted: {
    description: 'Automatic parsing is paused. Choose retry manually, edit, enter manually, or discard it.',
    status: 'Automatic parsing paused',
  },
  receipt_parsing_running: {
    description: 'Receipt parsing was in progress. You can edit the draft, enter manually, or discard it.',
    status: 'Receipt parsing in progress',
  },
  reminder_not_active: {
    description: 'Reminder did not stay active. You can choose what happens next.',
    status: 'Reminder did not stay active',
  },
  reminder_time_passed: {
    description: 'Reminder time has passed. You can choose what happens next.',
    status: 'Reminder needs a next step',
  },
  task_deadline_passed: {
    description: 'This was still open after its date.',
    status: 'This was still open after its date',
  },
  task_recurrence_open: {
    description: 'This occurrence is still open from an earlier day.',
    status: 'This occurrence is still open',
  },
};

const actionLabels: Record<RecoveryAction, string> = {
  complete: 'Complete',
  discard: 'Discard',
  dismiss: 'Dismiss for now',
  edit: 'Edit',
  manual_entry: 'Manual entry',
  pause: 'Pause',
  reschedule: 'Reschedule',
  retry: 'Retry',
  snooze: 'Snooze 30 min',
};

export function getRecoveryItemCopy(item: RecoveryItem) {
  return reasonCopy[item.reason];
}

export function getRecoveryActionLabel(action: RecoveryAction): string {
  return actionLabels[action];
}
