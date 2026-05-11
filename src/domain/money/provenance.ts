import type { MoneyRecordSourceOfTruth } from './types';

export type ReceiptReviewMoneyProvenance = {
  sourceOfTruth: MoneyRecordSourceOfTruth;
  userCorrectedAt: string | null;
};

export function resolveReceiptReviewMoneyProvenance({
  corrected,
  timestamp,
}: {
  corrected: boolean;
  timestamp: string;
}): ReceiptReviewMoneyProvenance {
  if (corrected) {
    return {
      sourceOfTruth: 'manual',
      userCorrectedAt: timestamp,
    };
  }

  return {
    sourceOfTruth: 'parsed',
    userCorrectedAt: null,
  };
}
