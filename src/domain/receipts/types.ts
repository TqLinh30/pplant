export type ReceiptParsingState =
  | 'draft'
  | 'pending'
  | 'parsed'
  | 'low_confidence'
  | 'failed'
  | 'reviewed'
  | 'saved'
  | 'retry_exhausted'
  | 'discarded';

export type ParsedReceiptField<T> = {
  value?: T;
  confidence: 'high' | 'medium' | 'low' | 'unknown';
  source: 'parsed' | 'manual' | 'estimated' | 'user_corrected';
};

export type NormalizedReceiptParseResult = {
  merchant: ParsedReceiptField<string>;
  localDate: ParsedReceiptField<string>;
  totalMinor: ParsedReceiptField<number>;
  currency: string;
  lineItems: {
    label: ParsedReceiptField<string>;
    amountMinor: ParsedReceiptField<number>;
  }[];
  duplicateSuspected: boolean;
};
