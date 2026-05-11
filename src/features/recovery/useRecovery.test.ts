import { createAppError } from '@/domain/common/app-error';
import { ok } from '@/domain/common/result';
import type { RecoveryItem } from '@/services/recovery/recovery.service';

import { initialRecoveryState, recoveryReducer } from './useRecovery';

const taskItem: RecoveryItem = {
  availableActions: ['complete', 'edit', 'dismiss'],
  createdFromState: 'todo',
  id: 'task:task-1:state',
  occurrenceLocalDate: null,
  reason: 'task_deadline_passed',
  targetId: 'task-1' as never,
  targetKind: 'task',
  title: 'Biology homework',
};

const receiptItem: RecoveryItem = {
  availableActions: ['retry', 'edit', 'manual_entry', 'discard'],
  createdFromState: 'failed',
  id: 'receipt_parse_job:receipt-job-1:state',
  occurrenceLocalDate: null,
  reason: 'receipt_parsing_failed',
  relatedDraftId: 'draft-receipt' as never,
  targetId: 'receipt-job-1' as never,
  targetKind: 'receipt_parse_job',
  title: 'Receipt parsing',
};

describe('recovery hook reducer', () => {
  it('handles loading, empty, success, and handoff states', () => {
    const ready = recoveryReducer(initialRecoveryState, {
      data: { events: [], items: [taskItem] },
      type: 'load_succeeded',
    });
    const saved = recoveryReducer(ready, {
      action: 'complete',
      data: { events: [], items: [] },
      type: 'action_succeeded',
    });
    const handoff = recoveryReducer(ready, {
      action: 'edit',
      data: { events: [], items: [] },
      item: taskItem,
      type: 'handoff_succeeded',
    });

    expect(ready.status).toBe('ready');
    expect(saved.status).toBe('saved');
    expect(saved.items).toEqual([]);
    expect(handoff.editingTarget).toBe(taskItem);
    expect(handoff.lastAction).toBe('edit');
  });

  it('tracks receipt manual-entry handoff without losing target context', () => {
    const ready = recoveryReducer(initialRecoveryState, {
      data: { events: [], items: [receiptItem] },
      type: 'load_succeeded',
    });
    const handoff = recoveryReducer(ready, {
      action: 'manual_entry',
      data: { events: [], items: [receiptItem] },
      item: receiptItem,
      type: 'handoff_succeeded',
    });

    expect(handoff.status).toBe('saved');
    expect(handoff.editingTarget?.targetKind).toBe('receipt_parse_job');
    expect(handoff.editingTarget?.relatedDraftId).toBe('draft-receipt');
    expect(handoff.lastAction).toBe('manual_entry');
  });

  it('keeps a retryable action error without losing recovery items', () => {
    const ready = recoveryReducer(initialRecoveryState, {
      data: { events: [], items: [taskItem] },
      type: 'load_succeeded',
    });
    const failed = recoveryReducer(ready, {
      error: createAppError('unavailable', 'Action could not be saved.', 'retry'),
      type: 'action_failed',
    });

    expect(failed.status).toBe('ready');
    expect(failed.items).toEqual([taskItem]);
    expect(failed.actionError?.recovery).toBe('retry');
  });

  it('handles failed loading and empty loading states', () => {
    const empty = recoveryReducer(initialRecoveryState, {
      data: { events: [], items: [] },
      type: 'load_succeeded',
    });
    const failed = recoveryReducer(initialRecoveryState, {
      error: createAppError('unavailable', 'Recovery data unavailable.', 'retry'),
      type: 'load_failed',
    });

    expect(empty.status).toBe('empty');
    expect(failed.status).toBe('failed');
    expect(failed.loadError?.code).toBe('unavailable');
  });

  it('uses neutral user-facing recovery copy in item reasons', () => {
    expect(taskItem.reason).toBe('task_deadline_passed');
    expect(taskItem.availableActions).toEqual(['complete', 'edit', 'dismiss']);
    expect(ok(taskItem).ok).toBe(true);
  });
});
