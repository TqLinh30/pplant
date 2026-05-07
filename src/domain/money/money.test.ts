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
    }
  });

  it('rejects unsupported rows and impossible dates', () => {
    expect(parseMoneyRecordRow(createRow({ source: 'receipt' }))).toMatchObject({ ok: false });
    expect(parseMoneyRecordRow(createRow({ sourceOfTruth: 'parsed' }))).toMatchObject({ ok: false });
    expect(parseMoneyRecordRow(createRow({ localDate: '2026-02-30' }))).toMatchObject({ ok: false });
    expect(parseMoneyRecordRow(createRow({ amountMinor: 0 }))).toMatchObject({ ok: false });
  });
});
