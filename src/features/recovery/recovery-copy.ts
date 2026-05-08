import type { RecoveryAction } from '@/domain/recovery/types';
import type { RecoveryItem, RecoveryItemReason } from '@/services/recovery/recovery.service';

export const recoveryPanelTitle = 'Needs a next step';
export const recoveryPanelDescription = 'You can choose what happens next.';

const reasonCopy: Record<RecoveryItemReason, { description: string; status: string }> = {
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
  dismiss: 'Dismiss for now',
  edit: 'Edit',
  pause: 'Pause',
  reschedule: 'Reschedule',
  snooze: 'Snooze 30 min',
};

export function getRecoveryItemCopy(item: RecoveryItem) {
  return reasonCopy[item.reason];
}

export function getRecoveryActionLabel(action: RecoveryAction): string {
  return actionLabels[action];
}
