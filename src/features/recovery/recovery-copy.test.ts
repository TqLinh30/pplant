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

const receiptItem: RecoveryItem = {
  availableActions: ['retry', 'edit', 'manual_entry', 'discard'],
  createdFromState: 'retry_exhausted',
  id: 'receipt_parse_job:receipt-job-1:state',
  occurrenceLocalDate: null,
  reason: 'receipt_parsing_retry_exhausted',
  relatedDraftId: 'draft-receipt' as never,
  targetId: 'receipt-job-1' as never,
  targetKind: 'receipt_parse_job',
  title: 'Receipt parsing',
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

  it('labels receipt recovery actions without exposing sensitive receipt data', () => {
    const copy = [
      getRecoveryItemCopy(receiptItem).description,
      getRecoveryItemCopy(receiptItem).status,
      ...receiptItem.availableActions.map(getRecoveryActionLabel),
    ].join(' ');

    expect(copy).toContain('Automatic parsing is paused');
    expect(copy).toContain('Manual entry');
    expect(copy).toContain('Discard');
    expect(copy).not.toContain('file://');
  });
});
