import { asEntityId } from '@/domain/common/ids';
import { localWorkspaceId } from '@/domain/workspace/types';

import {
  asCaptureDraftKind,
  asCaptureDraftSavedRecordKind,
  parseCaptureDraftPayload,
  parseCaptureDraftRow,
  serializeCaptureDraftPayload,
} from './schemas';

const fixedNow = '2026-05-08T00:00:00.000Z';

describe('capture draft domain', () => {
  it('validates draft kind, saved record kind, and JSON-object payloads', () => {
    expect(asCaptureDraftKind('expense')).toEqual({ ok: true, value: 'expense' });
    expect(asCaptureDraftSavedRecordKind('money_record')).toEqual({ ok: true, value: 'money_record' });
    expect(parseCaptureDraftPayload({ amount: '12.50' })).toEqual({
      ok: true,
      value: { amount: '12.50' },
    });
    expect(parseCaptureDraftPayload(['not-object']).ok).toBe(false);
    expect(asCaptureDraftKind('receipt').ok).toBe(false);
  });

  it('serializes and parses active draft rows', () => {
    const id = asEntityId('draft-expense');

    if (!id.ok) {
      throw new Error('id fixture failed');
    }

    const payload = serializeCaptureDraftPayload({ amount: '12.50', kind: 'expense' });

    expect(payload.ok).toBe(true);
    if (!payload.ok) {
      return;
    }

    const parsed = parseCaptureDraftRow({
      createdAt: fixedNow,
      discardedAt: null,
      id: id.value,
      kind: 'expense',
      lastSavedAt: fixedNow,
      payloadJson: payload.value,
      savedAt: null,
      savedRecordId: null,
      savedRecordKind: null,
      status: 'active',
      updatedAt: fixedNow,
      workspaceId: localWorkspaceId,
    });

    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.value).toMatchObject({
        id: 'draft-expense',
        kind: 'expense',
        payload: { amount: '12.50', kind: 'expense' },
        status: 'active',
      });
    }
  });

  it('requires saved draft linkage and discarded timestamps', () => {
    const savedWithoutLink = parseCaptureDraftRow({
      createdAt: fixedNow,
      discardedAt: null,
      id: 'draft-expense',
      kind: 'expense',
      lastSavedAt: fixedNow,
      payloadJson: '{}',
      savedAt: fixedNow,
      savedRecordId: null,
      savedRecordKind: 'money_record',
      status: 'saved',
      updatedAt: fixedNow,
      workspaceId: localWorkspaceId,
    });
    const discardedWithoutTimestamp = parseCaptureDraftRow({
      createdAt: fixedNow,
      discardedAt: null,
      id: 'draft-task',
      kind: 'task',
      lastSavedAt: fixedNow,
      payloadJson: '{}',
      savedAt: null,
      savedRecordId: null,
      savedRecordKind: null,
      status: 'discarded',
      updatedAt: fixedNow,
      workspaceId: localWorkspaceId,
    });

    expect(savedWithoutLink.ok).toBe(false);
    expect(discardedWithoutTimestamp.ok).toBe(false);
  });
});
