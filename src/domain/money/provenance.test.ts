import { resolveReceiptReviewMoneyProvenance } from './provenance';

describe('money provenance', () => {
  it('keeps accepted parsed receipt values marked as parsed source of truth', () => {
    const provenance = resolveReceiptReviewMoneyProvenance({
      corrected: false,
      timestamp: '2026-05-09T02:30:00.000Z',
    });

    expect(provenance).toEqual({
      sourceOfTruth: 'parsed',
      userCorrectedAt: null,
    });
  });

  it('marks changed receipt review values as manual source of truth', () => {
    const provenance = resolveReceiptReviewMoneyProvenance({
      corrected: true,
      timestamp: '2026-05-09T02:30:00.000Z',
    });

    expect(provenance).toEqual({
      sourceOfTruth: 'manual',
      userCorrectedAt: '2026-05-09T02:30:00.000Z',
    });
  });
});
