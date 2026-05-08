import type { RecoveryEventRow } from '@/domain/recovery/schemas';
import type { SaveRecoveryEventInput } from '@/domain/recovery/types';
import { localWorkspaceId } from '@/domain/workspace/types';

import { createRecoveryRepository } from './recovery.repository';

const fixedNow = '2026-05-08T10:00:00.000Z';

class FakeRecoveryClient {
  readonly executedSql: string[] = [];
  events: RecoveryEventRow[] = [];

  runSync(source: string, ...params: unknown[]): unknown {
    this.executedSql.push(source);

    if (source.includes('INSERT INTO recovery_events')) {
      const [id, workspaceId, targetKind, targetId, occurrenceLocalDate, action, occurredAt, createdAt] = params;

      this.events.push({
        action: action as RecoveryEventRow['action'],
        createdAt: createdAt as string,
        id: id as string,
        occurredAt: occurredAt as string,
        occurrenceLocalDate: occurrenceLocalDate as string | null,
        targetId: targetId as string,
        targetKind: targetKind as RecoveryEventRow['targetKind'],
        workspaceId: workspaceId as string,
      });
    }

    return { changes: 1 };
  }

  getAllSync<T>(source: string, ...params: unknown[]): T[] {
    this.executedSql.push(source);

    if (source.includes('occurred_at >= ?')) {
      const [workspaceId, occurredAt] = params;

      return this.events
        .filter((event) => event.workspaceId === workspaceId && event.occurredAt >= (occurredAt as string))
        .map((event) => ({ ...event }) as T);
    }

    const [workspaceId, targetKind, targetId, occurrenceLocalDate] = params;

    return this.events
      .filter(
        (event) =>
          event.workspaceId === workspaceId &&
          event.targetKind === targetKind &&
          event.targetId === targetId &&
          event.occurrenceLocalDate === occurrenceLocalDate,
      )
      .map((event) => ({ ...event }) as T);
  }
}

function createInput(overrides: Partial<SaveRecoveryEventInput> = {}): SaveRecoveryEventInput {
  return {
    action: 'dismiss',
    createdAt: fixedNow,
    id: 'recovery-1',
    occurredAt: fixedNow,
    occurrenceLocalDate: '2026-05-07',
    targetId: 'reminder-1',
    targetKind: 'reminder_occurrence',
    workspaceId: localWorkspaceId,
    ...overrides,
  };
}

describe('recovery repository', () => {
  it('stores only recovery target and action data', async () => {
    const client = new FakeRecoveryClient();
    const repository = createRecoveryRepository({ $client: client } as never);

    const created = await repository.createEvent(createInput());

    expect(created.ok).toBe(true);
    expect(client.events).toEqual([
      {
        action: 'dismiss',
        createdAt: fixedNow,
        id: 'recovery-1',
        occurredAt: fixedNow,
        occurrenceLocalDate: '2026-05-07',
        targetId: 'reminder-1',
        targetKind: 'reminder_occurrence',
        workspaceId: localWorkspaceId,
      },
    ]);
    expect(JSON.stringify(client.events)).not.toContain('title');
    expect(JSON.stringify(client.events)).not.toContain('platform');
  });

  it('lists target events and reports resolved targets', async () => {
    const client = new FakeRecoveryClient();
    const repository = createRecoveryRepository({ $client: client } as never);

    await repository.createEvent(createInput());

    const listed = await repository.listEventsForTarget(
      localWorkspaceId,
      'reminder_occurrence',
      'reminder-1' as never,
      '2026-05-07',
    );
    const resolved = await repository.hasResolutionEvent(
      localWorkspaceId,
      'reminder_occurrence',
      'reminder-1' as never,
      '2026-05-07',
    );

    expect(listed.ok && listed.value).toHaveLength(1);
    expect(resolved).toEqual({ ok: true, value: true });
  });

  it('lists events since a timestamp for bounded recovery windows', async () => {
    const client = new FakeRecoveryClient();
    const repository = createRecoveryRepository({ $client: client } as never);

    await repository.createEvent(createInput({ id: 'old', occurredAt: '2026-05-01T00:00:00.000Z' }));
    await repository.createEvent(createInput({ id: 'new', occurredAt: fixedNow }));

    const listed = await repository.listEventsSince(localWorkspaceId, '2026-05-08T00:00:00.000Z');

    expect(listed.ok && listed.value.map((event) => event.id)).toEqual(['new']);
  });
});
