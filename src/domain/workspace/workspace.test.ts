import { createLocalWorkspace, currentWorkspaceSchemaVersion, localWorkspaceId } from './types';
import { parseWorkspaceRow } from './schemas';

const fixedNow = new Date('2026-05-08T00:00:00.000Z');

describe('workspace domain', () => {
  it('creates the deterministic single-user local workspace', () => {
    const result = createLocalWorkspace({ now: fixedNow });

    expect(result).toEqual({
      ok: true,
      value: {
        id: localWorkspaceId,
        createdAt: fixedNow.toISOString(),
        updatedAt: fixedNow.toISOString(),
        schemaVersion: currentWorkspaceSchemaVersion,
      },
    });
  });

  it('validates workspace rows at repository boundaries', () => {
    const result = parseWorkspaceRow({
      id: localWorkspaceId,
      createdAt: fixedNow.toISOString(),
      updatedAt: fixedNow.toISOString(),
      schemaVersion: currentWorkspaceSchemaVersion,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.id).toBe(localWorkspaceId);
    }
  });

  it('rejects invalid workspace rows', () => {
    const result = parseWorkspaceRow({
      id: '',
      createdAt: 'not-a-date',
      updatedAt: fixedNow.toISOString(),
      schemaVersion: 0,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('validation_failed');
    }
  });
});
