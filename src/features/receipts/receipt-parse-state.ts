import type {
  NormalizedReceiptParseResult,
  ParsedReceiptField,
  ReceiptParseJob,
  ReceiptParseJobStatus,
} from '@/domain/receipts/types';

export type ReceiptParseNotice = {
  actionLabel: string | null;
  description: string;
  manualActionLabel: 'Manual expense';
  status: ReceiptParseJobStatus | 'draft';
  title: string;
  tone: 'neutral' | 'warning';
};

export type ReceiptProposalRow = {
  confidenceLabel: string;
  label: string;
  value: string;
};

function describeConfidence(confidence: ParsedReceiptField<unknown>['confidence']): string {
  switch (confidence) {
    case 'high':
      return 'Confidence: high';
    case 'medium':
      return 'Confidence: medium';
    case 'low':
      return 'Confidence: low - review needed';
    case 'unknown':
      return 'Confidence: unknown - review needed';
    default:
      confidence satisfies never;
      return 'Confidence: unknown - review needed';
  }
}

function fieldValue<T>(field: ParsedReceiptField<T>, format: (value: T) => string): string {
  return field.value === undefined ? 'Unknown' : format(field.value);
}

function formatText(value: string | null): string {
  if (value === null || value.trim().length === 0) {
    return 'Not proposed';
  }

  return value;
}

function formatMinorAmount(value: number, currency: string): string {
  return `${(value / 100).toFixed(2)} ${currency}`;
}

export function receiptParseNoticeFor(job: ReceiptParseJob | null): ReceiptParseNotice {
  if (!job) {
    return {
      actionLabel: 'Start parsing',
      description: 'No receipt parsing has started. Manual expense entry remains available.',
      manualActionLabel: 'Manual expense',
      status: 'draft',
      title: 'Receipt parsing not started',
      tone: 'neutral',
    };
  }

  switch (job.status) {
    case 'pending':
      return {
        actionLabel: 'Resume parsing',
        description: 'The receipt is queued for local parsing. You can leave this screen or enter manually.',
        manualActionLabel: 'Manual expense',
        status: job.status,
        title: 'Receipt parsing queued',
        tone: 'neutral',
      };
    case 'running':
      return {
        actionLabel: null,
        description: 'Pplant is preparing proposed fields. Nothing will be saved as an expense automatically.',
        manualActionLabel: 'Manual expense',
        status: job.status,
        title: 'Receipt parsing in progress',
        tone: 'neutral',
      };
    case 'parsed':
      return {
        actionLabel: null,
        description: 'Review the proposed fields before any future save step. No expense was created.',
        manualActionLabel: 'Manual expense',
        status: job.status,
        title: 'Receipt fields proposed',
        tone: 'neutral',
      };
    case 'low_confidence':
      return {
        actionLabel: null,
        description: 'Some proposed fields are low confidence or unknown and need review.',
        manualActionLabel: 'Manual expense',
        status: job.status,
        title: 'Receipt fields need review',
        tone: 'warning',
      };
    case 'failed':
      return {
        actionLabel: 'Retry parsing',
        description: 'Parsing did not finish. Manual expense entry remains available.',
        manualActionLabel: 'Manual expense',
        status: job.status,
        title: 'Receipt parsing failed',
        tone: 'warning',
      };
    case 'retry_exhausted':
      return {
        actionLabel: 'Retry manually',
        description: 'Automatic tries are paused after three attempts within 24 hours. Choose retry manually or enter the expense.',
        manualActionLabel: 'Manual expense',
        status: job.status,
        title: 'Automatic parsing paused',
        tone: 'warning',
      };
    default:
      job.status satisfies never;
      return {
        actionLabel: 'Start parsing',
        description: 'Receipt parsing needs attention. Manual expense entry remains available.',
        manualActionLabel: 'Manual expense',
        status: 'draft',
        title: 'Receipt parsing unavailable',
        tone: 'warning',
      };
  }
}

export function receiptProposalRows(result: NormalizedReceiptParseResult): ReceiptProposalRow[] {
  return [
    {
      confidenceLabel: describeConfidence(result.merchant.confidence),
      label: 'Merchant',
      value: fieldValue(result.merchant, formatText),
    },
    {
      confidenceLabel: describeConfidence(result.localDate.confidence),
      label: 'Date',
      value: fieldValue(result.localDate, formatText),
    },
    {
      confidenceLabel: describeConfidence(result.totalMinor.confidence),
      label: 'Total',
      value: fieldValue(result.totalMinor, (value) => formatMinorAmount(value, result.currency)),
    },
    {
      confidenceLabel: describeConfidence(result.categoryId.confidence),
      label: 'Category',
      value: fieldValue(result.categoryId, formatText),
    },
    {
      confidenceLabel: describeConfidence(result.topicIds.confidence),
      label: 'Topics',
      value: fieldValue(result.topicIds, (value) => (value.length > 0 ? `${value.length} proposed` : 'Not proposed')),
    },
    {
      confidenceLabel: 'Text label: duplicate indicator',
      label: 'Possible duplicate',
      value: result.duplicateSuspected ? 'Yes - review before saving' : 'No duplicate signal',
    },
    {
      confidenceLabel: 'Text label: unknown fields',
      label: 'Unknown fields',
      value: result.unknownFields.length > 0 ? result.unknownFields.join(', ') : 'None',
    },
    {
      confidenceLabel: 'Text label: parsed line items',
      label: 'Line items',
      value: `${result.lineItems.length} proposed`,
    },
  ];
}
