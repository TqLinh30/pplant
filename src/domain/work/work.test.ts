import { parseWorkEntryRow } from './schemas';
import { calculateEarnedIncomeMinor, calculateShiftDurationMinutes } from './work-time';

const fixedNow = '2026-05-08T00:00:00.000Z';

function createRow(overrides: Record<string, unknown> = {}) {
  return {
    breakMinutes: 0,
    categoryId: null,
    createdAt: fixedNow,
    deletedAt: null,
    durationMinutes: 120,
    earnedIncomeMinor: 3000,
    endedAtLocalDate: null,
    endedAtLocalTime: null,
    entryMode: 'hours',
    id: 'work-1',
    localDate: '2026-05-08',
    note: null,
    paid: true,
    source: 'manual',
    sourceOfTruth: 'manual',
    startedAtLocalDate: null,
    startedAtLocalTime: null,
    updatedAt: fixedNow,
    wageCurrencyCode: 'USD',
    wageMinorPerHour: 1500,
    wageSource: 'default',
    workspaceId: 'local-workspace',
    ...overrides,
  };
}

describe('work entry calculations', () => {
  it('calculates earned income from direct paid minutes and wage snapshots', () => {
    expect(calculateEarnedIncomeMinor({ durationMinutes: 90, paid: true, wageMinorPerHour: 1500 })).toEqual({
      ok: true,
      value: 2250,
    });
    expect(calculateEarnedIncomeMinor({ durationMinutes: 90, paid: false, wageMinorPerHour: 1500 })).toEqual({
      ok: true,
      value: 0,
    });
  });

  it('calculates shift duration across midnight after break subtraction', () => {
    const result = calculateShiftDurationMinutes({
      breakMinutes: 30,
      endedAtLocalDate: '2026-05-09',
      endedAtLocalTime: '01:15',
      startedAtLocalDate: '2026-05-08',
      startedAtLocalTime: '22:00',
    });

    expect(result).toEqual({ ok: true, value: 165 });
  });

  it('rejects invalid shifts and break bounds', () => {
    const reversed = calculateShiftDurationMinutes({
      breakMinutes: 0,
      endedAtLocalDate: '2026-05-08',
      endedAtLocalTime: '12:00',
      startedAtLocalDate: '2026-05-08',
      startedAtLocalTime: '13:00',
    });
    const tooMuchBreak = calculateShiftDurationMinutes({
      breakMinutes: 60,
      endedAtLocalDate: '2026-05-08',
      endedAtLocalTime: '13:00',
      startedAtLocalDate: '2026-05-08',
      startedAtLocalTime: '12:00',
    });

    expect(reversed.ok).toBe(false);
    expect(tooMuchBreak.ok).toBe(false);
  });
});

describe('work entry parsing', () => {
  it('parses direct hours and topics', () => {
    const parsed = parseWorkEntryRow(createRow({ categoryId: 'cat-work' }), ['topic-job']);

    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.value).toMatchObject({
        categoryId: 'cat-work',
        durationMinutes: 120,
        entryMode: 'hours',
        topicIds: ['topic-job'],
      });
    }
  });

  it('parses shift entries with local date-time values and wage overrides', () => {
    const parsed = parseWorkEntryRow(
      createRow({
        breakMinutes: 15,
        durationMinutes: 225,
        earnedIncomeMinor: 7875,
        endedAtLocalDate: '2026-05-09',
        endedAtLocalTime: '01:00',
        entryMode: 'shift',
        localDate: '2026-05-08',
        startedAtLocalDate: '2026-05-08',
        startedAtLocalTime: '21:00',
        wageMinorPerHour: 2100,
        wageSource: 'override',
      }),
    );

    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.value).toMatchObject({
        breakMinutes: 15,
        endedAtLocalDate: '2026-05-09',
        endedAtLocalTime: '01:00',
        entryMode: 'shift',
        wageSource: 'override',
      });
    }
  });

  it('rejects direct hour entries with shift-only fields', () => {
    const parsed = parseWorkEntryRow(
      createRow({
        endedAtLocalDate: '2026-05-08',
        endedAtLocalTime: '12:00',
      }),
    );

    expect(parsed.ok).toBe(false);
  });
});
