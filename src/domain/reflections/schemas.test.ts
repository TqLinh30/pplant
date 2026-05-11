import { localWorkspaceId } from '@/domain/workspace/types';

import { parseReflectionRow, parseSaveReflectionInput } from './schemas';

const fixedNow = '2026-05-08T00:00:00.000Z';

function validSaveInput(overrides: Record<string, unknown> = {}) {
  return {
    id: 'reflection-1',
    period: {
      endDateExclusive: '2026-05-11',
      kind: 'week',
      startDate: '2026-05-04',
    },
    promptId: 'remember_period',
    promptText: 'What do you want to remember about this period?',
    responseText: 'The week felt clearer after I wrote it down.',
    state: 'answered',
    timestamp: fixedNow,
    workspaceId: localWorkspaceId,
    ...overrides,
  };
}

describe('reflection schemas', () => {
  it('accepts answered reflection inputs with trimmed response text', () => {
    const parsed = parseSaveReflectionInput(
      validSaveInput({
        responseText: '  The week felt clearer after I wrote it down.  ',
      }),
    );

    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.value.responseText).toBe('The week felt clearer after I wrote it down.');
      expect(parsed.value.state).toBe('answered');
      expect(parsed.value.source).toBe('manual');
      expect(parsed.value.sourceOfTruth).toBe('manual');
    }
  });

  it('accepts skipped reflection inputs without response text', () => {
    const parsed = parseSaveReflectionInput(
      validSaveInput({
        responseText: null,
        state: 'skipped',
      }),
    );

    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.value.responseText).toBeNull();
      expect(parsed.value.state).toBe('skipped');
    }
  });

  it('rejects invalid period kind, dates, state, timestamps, and overlong answers', () => {
    const invalidCases = [
      validSaveInput({ period: { endDateExclusive: '2026-05-11', kind: 'day', startDate: '2026-05-04' } }),
      validSaveInput({ period: { endDateExclusive: '2026-05-04', kind: 'week', startDate: '2026-05-04' } }),
      validSaveInput({ state: 'draft' }),
      validSaveInput({ timestamp: 'not-a-date' }),
      validSaveInput({ responseText: 'x'.repeat(1001) }),
      validSaveInput({ promptId: '' }),
      validSaveInput({ promptText: '' }),
    ];

    for (const input of invalidCases) {
      expect(parseSaveReflectionInput(input).ok).toBe(false);
    }
  });

  it('rejects answered reflections without response text', () => {
    const parsed = parseSaveReflectionInput(validSaveInput({ responseText: '   ' }));

    expect(parsed.ok).toBe(false);
  });

  it('parses reflection rows for persistence reads', () => {
    const parsed = parseReflectionRow({
      createdAt: fixedNow,
      deletedAt: null,
      id: 'reflection-1',
      periodEndDateExclusive: '2026-05-11',
      periodKind: 'week',
      periodStartDate: '2026-05-04',
      promptId: 'remember_period',
      promptText: 'What do you want to remember about this period?',
      responseText: 'The week felt clearer after I wrote it down.',
      source: 'manual',
      sourceOfTruth: 'manual',
      state: 'answered',
      updatedAt: fixedNow,
      workspaceId: localWorkspaceId,
    });

    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.value.period.kind).toBe('week');
      expect(parsed.value.deletedAt).toBeNull();
    }
  });
});
