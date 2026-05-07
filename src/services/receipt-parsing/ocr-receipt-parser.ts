import type { ReceiptParsingPort } from './receipt-parsing.port';
import { noopReceiptParser } from './noop-receipt-parser';

export const ocrReceiptParser: ReceiptParsingPort = noopReceiptParser;
