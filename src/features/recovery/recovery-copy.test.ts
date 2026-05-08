import type { RecoveryItem } from '@/services/recovery/recovery.service';

import {
  getRecoveryActionLabel,
  getRecoveryItemCopy,
  recoveryPanelDescription,
  recoveryPanelTitle,
} from './recovery-copy';

const item: RecoveryItem = {
  availableActions: ['complete', 'snooze', 'reschedule', 'pause', 'edit', 'dismiss'],
  createdFromState: 'missed',
  id: 'reminder_occurrence:reminder-1:2026-05-08',
  occurrenceLocalDate: '2026-05-08' as never,
  reason: 'reminder_not_active',
  targetId: 'reminder-1' as never,
  targetKind: 'reminder_occurrence',
  title: 'Study reminder',
};

describe('recovery copy', () => {
  it('uses neutral non-shaming labels for recovery states and actions', () => {
    const copy = [
      recoveryPanelTitle,
      recoveryPanelDescription,
      getRecoveryItemCopy(item).description,
      getRecoveryItemCopy(item).status,
      ...item.availableActions.map(getRecoveryActionLabel),
    ].join(' ');

    expect(copy).toContain('Needs a next step');
    expect(copy).toContain('Reminder did not stay active');
    expect(copy).not.toMatch(/\b(failed|ignored|bad streak|late again|missed again)\b/i);
  });
});
