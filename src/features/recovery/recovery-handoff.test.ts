import type { RecoveryItem } from '@/services/recovery/recovery.service';

import { isRecoveryHandoffForTarget, type RecoveryHandoffTarget } from './recovery-handoff';

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

describe('recovery handoff matching', () => {
  it('matches edit handoffs to the expected target kind and id', () => {
    const handoff: RecoveryHandoffTarget = {
      action: 'edit',
      item: taskItem,
      sequence: 1,
    };

    expect(isRecoveryHandoffForTarget(handoff, 'task', 'task-1', ['edit'])).toBe(true);
    expect(isRecoveryHandoffForTarget(handoff, 'task', 'task-2', ['edit'])).toBe(false);
    expect(isRecoveryHandoffForTarget(handoff, 'reminder_occurrence', 'task-1', ['edit'])).toBe(false);
  });

  it('does not route reschedule handoffs into edit-only task surfaces', () => {
    const handoff: RecoveryHandoffTarget = {
      action: 'reschedule',
      item: {
        ...taskItem,
        availableActions: ['reschedule', 'edit', 'dismiss'],
        targetKind: 'reminder_occurrence',
      },
      sequence: 2,
    };

    expect(isRecoveryHandoffForTarget(handoff, 'reminder_occurrence', 'task-1')).toBe(true);
    expect(isRecoveryHandoffForTarget(handoff, 'reminder_occurrence', 'task-1', ['edit'])).toBe(false);
    expect(isRecoveryHandoffForTarget(null, 'reminder_occurrence', 'task-1')).toBe(false);
  });
});
