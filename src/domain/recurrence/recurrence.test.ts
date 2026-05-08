import { generateRecurrenceOccurrences } from './generate-occurrences';
import { parseRecurrenceRuleRow } from './schemas';

const fixedNow = '2026-05-08T00:00:00.000Z';

function createRuleRow(overrides: Record<string, unknown> = {}) {
  return {
    amountMinor: 1250,
    categoryId: 'cat-food',
    createdAt: fixedNow,
    currencyCode: 'USD',
    deletedAt: null,
    endsOnLocalDate: null,
    frequency: 'monthly',
    id: 'rule-rent',
    lastGeneratedLocalDate: null,
    merchantOrSource: 'Rent',
    moneyKind: 'expense',
    note: null,
    ownerKind: 'money',
    pausedAt: null,
    source: 'recurring',
    sourceOfTruth: 'manual',
    startsOnLocalDate: '2026-01-31',
    stoppedAt: null,
    updatedAt: fixedNow,
    workspaceId: 'local',
    ...overrides,
  };
}

describe('recurrence domain', () => {
  it('generates daily and weekly occurrences from local date strings', () => {
    const daily = generateRecurrenceOccurrences({
      frequency: 'daily',
      maxCount: 4,
      startsOnLocalDate: '2026-05-08',
      throughLocalDate: '2026-05-11',
    });
    const weekly = generateRecurrenceOccurrences({
      frequency: 'weekly',
      maxCount: 3,
      startsOnLocalDate: '2026-05-04',
      throughLocalDate: '2026-05-20',
    });

    expect(daily).toEqual({ ok: true, value: ['2026-05-08', '2026-05-09', '2026-05-10', '2026-05-11'] });
    expect(weekly).toEqual({ ok: true, value: ['2026-05-04', '2026-05-11', '2026-05-18'] });
  });

  it('clamps monthly occurrences to the original anchor day', () => {
    const result = generateRecurrenceOccurrences({
      frequency: 'monthly',
      maxCount: 5,
      startsOnLocalDate: '2026-01-31',
      throughLocalDate: '2026-05-31',
    });

    expect(result).toEqual({
      ok: true,
      value: ['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30', '2026-05-31'],
    });
  });

  it('handles leap-day monthly recurrence deterministically', () => {
    const result = generateRecurrenceOccurrences({
      frequency: 'monthly',
      maxCount: 4,
      startsOnLocalDate: '2024-02-29',
      throughLocalDate: '2024-05-31',
    });

    expect(result).toEqual({
      ok: true,
      value: ['2024-02-29', '2024-03-29', '2024-04-29', '2024-05-29'],
    });
  });

  it('honors from, end, stop, skip, and max count bounds', () => {
    const result = generateRecurrenceOccurrences({
      endsOnLocalDate: '2026-05-20',
      frequency: 'daily',
      fromLocalDate: '2026-05-10',
      maxCount: 3,
      skippedLocalDates: ['2026-05-11'],
      startsOnLocalDate: '2026-05-08',
      stoppedOnLocalDate: '2026-05-15',
      throughLocalDate: '2026-05-31',
    });

    expect(result).toEqual({ ok: true, value: ['2026-05-10', '2026-05-12', '2026-05-13'] });
  });

  it('rejects impossible dates and invalid bounds', () => {
    expect(
      generateRecurrenceOccurrences({
        frequency: 'monthly',
        maxCount: 5,
        startsOnLocalDate: '2026-02-30',
        throughLocalDate: '2026-05-31',
      }).ok,
    ).toBe(false);
    expect(
      generateRecurrenceOccurrences({
        frequency: 'daily',
        maxCount: 0,
        startsOnLocalDate: '2026-05-08',
        throughLocalDate: '2026-05-31',
      }).ok,
    ).toBe(false);
  });

  it('parses recurring money rules and rejects non-recurring provenance', () => {
    const parsed = parseRecurrenceRuleRow(createRuleRow(), ['topic-home']);
    const invalidSource = parseRecurrenceRuleRow(createRuleRow({ source: 'manual' }));
    const invalidEnd = parseRecurrenceRuleRow(createRuleRow({ endsOnLocalDate: '2025-12-31' }));

    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.value.frequency).toBe('monthly');
      expect(parsed.value.source).toBe('recurring');
      expect(parsed.value.sourceOfTruth).toBe('manual');
      expect(parsed.value.topicIds).toEqual(['topic-home']);
    }
    expect(invalidSource.ok).toBe(false);
    expect(invalidEnd.ok).toBe(false);
  });
});
