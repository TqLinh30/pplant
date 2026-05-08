import {
  calculateMoneyPlanningPeriodSummary,
  calculateMoneyHistorySummaries,
} from './calculations';
import {
  asMoneyRecordMerchantOrSource,
  asMoneyRecordNote,
  asMoneyRecordTopicIds,
  maxMerchantOrSourceLength,
  maxMoneyRecordNoteLength,
  parseManualMoneyAmountInput,
  parseMoneyRecordRow,
} from './schemas';

const fixedNow = '2026-05-08T00:00:00.000Z';

function createRow(overrides: Record<string, unknown> = {}) {
  return {
    amountMinor: 1250,
    categoryId: 'cat-food',
    createdAt: fixedNow,
    currencyCode: 'USD',
    deletedAt: null,
    id: 'money-1',
    kind: 'expense',
    localDate: '2026-05-08',
    merchantOrSource: 'Campus cafe',
    note: 'Lunch',
    source: 'manual',
    sourceOfTruth: 'manual',
    updatedAt: fixedNow,
    userCorrectedAt: null,
    workspaceId: 'local',
    ...overrides,
  };
}

describe('money record domain', () => {
  it('parses manual money amount input into positive minor units', () => {
    expect(parseManualMoneyAmountInput('12.50', 'USD', 'en-US')).toEqual({ ok: true, value: 1250 });

    const zero = parseManualMoneyAmountInput('0', 'USD', 'en-US');
    const malformed = parseManualMoneyAmountInput('-1', 'USD', 'en-US');
    const tooManyDecimals = parseManualMoneyAmountInput('12.345', 'USD', 'en-US');

    expect(zero.ok).toBe(false);
    expect(malformed.ok).toBe(false);
    expect(tooManyDecimals.ok).toBe(false);
  });

  it('trims optional merchant/source and note and accepts blanks as null', () => {
    expect(asMoneyRecordMerchantOrSource(' Campus job ')).toEqual({ ok: true, value: 'Campus job' });
    expect(asMoneyRecordMerchantOrSource('   ')).toEqual({ ok: true, value: null });
    expect(asMoneyRecordNote(' Supplies ')).toEqual({ ok: true, value: 'Supplies' });
    expect(asMoneyRecordNote(undefined)).toEqual({ ok: true, value: null });
  });

  it('rejects over-limit merchant/source and note text', () => {
    expect(asMoneyRecordMerchantOrSource('x'.repeat(maxMerchantOrSourceLength + 1)).ok).toBe(false);
    expect(asMoneyRecordNote('x'.repeat(maxMoneyRecordNoteLength + 1)).ok).toBe(false);
  });

  it('validates unique topic ids', () => {
    expect(asMoneyRecordTopicIds(['topic-class', 'topic-food']).ok).toBe(true);

    const duplicate = asMoneyRecordTopicIds(['topic-class', 'topic-class']);
    const blank = asMoneyRecordTopicIds(['']);

    expect(duplicate.ok).toBe(false);
    expect(blank.ok).toBe(false);
  });

  it('parses persisted manual money records with optional metadata', () => {
    const parsed = parseMoneyRecordRow(createRow({ categoryId: null, merchantOrSource: '  Book sale ', note: '' }), [
      'topic-books',
    ]);

    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.value.categoryId).toBeNull();
      expect(parsed.value.topicIds).toEqual(['topic-books']);
      expect(parsed.value.merchantOrSource).toBe('Book sale');
      expect(parsed.value.note).toBeNull();
      expect(parsed.value.source).toBe('manual');
      expect(parsed.value.sourceOfTruth).toBe('manual');
      expect(parsed.value.userCorrectedAt).toBeNull();
    }
  });

  it('parses future receipt provenance and manual correction timestamps', () => {
    const parsed = parseMoneyRecordRow(
      createRow({
        source: 'receipt',
        sourceOfTruth: 'parsed',
        userCorrectedAt: '2026-05-08T01:00:00.000Z',
      }),
    );

    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.value.source).toBe('receipt');
      expect(parsed.value.sourceOfTruth).toBe('parsed');
      expect(parsed.value.userCorrectedAt).toBe('2026-05-08T01:00:00.000Z');
    }
  });

  it('rejects unsupported provenance rows and impossible dates', () => {
    expect(parseMoneyRecordRow(createRow({ source: 'bank' }))).toMatchObject({ ok: false });
    expect(parseMoneyRecordRow(createRow({ sourceOfTruth: 'synced' }))).toMatchObject({ ok: false });
    expect(parseMoneyRecordRow(createRow({ localDate: '2026-02-30' }))).toMatchObject({ ok: false });
    expect(parseMoneyRecordRow(createRow({ amountMinor: 0 }))).toMatchObject({ ok: false });
  });

  it('calculates planning period summary from active expenses and manual savings progress', () => {
    const activeExpense = parseMoneyRecordRow(createRow({ amountMinor: 1200, id: 'money-expense' }));
    const deletedExpense = parseMoneyRecordRow(
      createRow({ amountMinor: 3000, deletedAt: '2026-05-08T02:00:00.000Z', id: 'money-deleted' }),
    );
    const income = parseMoneyRecordRow(createRow({ amountMinor: 5000, id: 'money-income', kind: 'income' }));

    if (!activeExpense.ok || !deletedExpense.ok || !income.ok) {
      throw new Error('money fixture failed');
    }

    const summary = calculateMoneyPlanningPeriodSummary({
      budgetRules: {
        createdAt: fixedNow,
        currencyCode: 'USD' as never,
        monthlyBudgetAmountMinor: 2000,
        overBudgetBehavior: 'allow_negative_warning',
        resetDaySource: 'preferences',
        rolloverPolicy: 'savings_fund',
        updatedAt: fixedNow,
        workspaceId: 'local' as never,
      },
      period: {
        endDateExclusive: '2026-06-01' as never,
        startDate: '2026-05-01' as never,
      },
      records: [activeExpense.value, deletedExpense.value, income.value],
      savingsGoals: [
        {
          archivedAt: null,
          createdAt: fixedNow,
          currencyCode: 'USD' as never,
          currentAmountMinor: 2500,
          id: 'goal-1' as never,
          name: 'Emergency fund' as never,
          targetAmountMinor: 10000,
          targetDate: null,
          updatedAt: fixedNow,
          workspaceId: 'local' as never,
        },
      ],
    });

    expect(summary.expenseAmountMinor).toBe(1200);
    expect(summary.incomeAmountMinor).toBe(5000);
    expect(summary.budgetStatus?.remainingMinor).toBe(800);
    expect(summary.savingsProgress[0]).toMatchObject({
      currentAmountMinor: 2500,
      progressBasisPoints: 2500,
      remainingMinor: 7500,
    });
  });

  it('groups active money history by day, week, and month', () => {
    const expense = parseMoneyRecordRow(createRow({ amountMinor: 1200, id: 'money-expense', localDate: '2026-05-08' }));
    const income = parseMoneyRecordRow(
      createRow({ amountMinor: 5000, id: 'money-income', kind: 'income', localDate: '2026-05-09' }),
    );
    const deleted = parseMoneyRecordRow(
      createRow({
        amountMinor: 9999,
        deletedAt: '2026-05-10T00:00:00.000Z',
        id: 'money-deleted',
        localDate: '2026-05-10',
      }),
    );

    if (!expense.ok || !income.ok || !deleted.ok) {
      throw new Error('money fixture failed');
    }

    const day = calculateMoneyHistorySummaries([expense.value, income.value, deleted.value], 'day');
    const week = calculateMoneyHistorySummaries([expense.value, income.value], 'week');
    const month = calculateMoneyHistorySummaries([expense.value, income.value], 'month');

    expect(day.map((summary) => summary.key)).toEqual(['2026-05-09', '2026-05-08']);
    expect(week[0]).toMatchObject({
      expenseAmountMinor: 1200,
      incomeAmountMinor: 5000,
      key: '2026-05-04',
      netAmountMinor: 3800,
      recordCount: 2,
    });
    expect(month[0]).toMatchObject({
      endDateExclusive: '2026-06-01',
      key: '2026-05',
      startDate: '2026-05-01',
    });
  });
});
