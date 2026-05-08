import type { ReceiptParseJob } from '@/domain/receipts/types';

export type ReceiptRecoveryActionId =
  | 'start_parsing'
  | 'retry_parsing'
  | 'edit_review'
  | 'edit_draft'
  | 'manual_expense'
  | 'keep_draft'
  | 'discard_draft';

export type ReceiptRecoveryAction = {
  description: string;
  disabled?: boolean;
  id: ReceiptRecoveryActionId;
  label: string;
  variant: 'danger' | 'primary' | 'secondary';
};

export type ReceiptRecoveryState = {
  actions: ReceiptRecoveryAction[];
  description: string;
  recommendedActionId: ReceiptRecoveryActionId | null;
  statusLabel: string;
  title: string;
};

type ReceiptRecoveryInput = {
  parseActionRunning?: boolean;
  parseJob: ReceiptParseJob | null;
  reviewAvailable: boolean;
  saved?: boolean;
};

function editAction(reviewAvailable: boolean): ReceiptRecoveryAction {
  if (reviewAvailable) {
    return {
      description: 'Correct parsed fields in the Receipt Review Desk.',
      id: 'edit_review',
      label: 'Edit review fields',
      variant: 'primary',
    };
  }

  return {
    description: 'Open the active expense draft with receipt context.',
    id: 'edit_draft',
    label: 'Edit draft fields',
    variant: 'secondary',
  };
}

function manualAction(variant: ReceiptRecoveryAction['variant'] = 'secondary'): ReceiptRecoveryAction {
  return {
    description: 'Manual entry works offline and keeps this receipt draft available for linking.',
    id: 'manual_expense',
    label: 'Manual expense',
    variant,
  };
}

function keepAction(): ReceiptRecoveryAction {
  return {
    description: 'Keep the receipt draft active for later.',
    id: 'keep_draft',
    label: 'Keep draft',
    variant: 'secondary',
  };
}

function discardAction(): ReceiptRecoveryAction {
  return {
    description: 'Discard the receipt draft without creating an expense.',
    id: 'discard_draft',
    label: 'Discard draft',
    variant: 'danger',
  };
}

function recoveryActions(
  primaryActions: ReceiptRecoveryAction[],
  reviewAvailable: boolean,
): ReceiptRecoveryAction[] {
  return [
    ...primaryActions,
    editAction(reviewAvailable),
    manualAction(primaryActions.length === 0 ? 'primary' : 'secondary'),
    keepAction(),
    discardAction(),
  ];
}

export function receiptRecoveryStateFor({
  parseActionRunning = false,
  parseJob,
  reviewAvailable,
  saved = false,
}: ReceiptRecoveryInput): ReceiptRecoveryState {
  if (saved || parseJob?.status === 'saved') {
    return {
      actions: [],
      description: 'The reviewed receipt has already been saved as an expense.',
      recommendedActionId: null,
      statusLabel: 'Saved - recovery complete',
      title: 'Receipt expense saved',
    };
  }

  if (!parseJob) {
    return {
      actions: recoveryActions(
        [
          {
            description: 'Try local receipt parsing. Manual entry remains available.',
            disabled: parseActionRunning,
            id: 'start_parsing',
            label: 'Start parsing',
            variant: 'primary',
          },
        ],
        reviewAvailable,
      ),
      description: 'No receipt parsing has started. Choose parsing, edit the draft, or enter manually.',
      recommendedActionId: 'start_parsing',
      statusLabel: 'Draft - manual fallback available',
      title: 'Choose how to continue',
    };
  }

  switch (parseJob.status) {
    case 'pending':
      return {
        actions: recoveryActions(
          [
            {
              description: 'Resume the queued parse attempt.',
              disabled: parseActionRunning,
              id: 'retry_parsing',
              label: 'Resume parsing',
              variant: 'primary',
            },
          ],
          reviewAvailable,
        ),
        description: 'The receipt is queued. You can resume parsing, edit the draft, or enter manually.',
        recommendedActionId: 'retry_parsing',
        statusLabel: 'Pending - manual fallback available',
        title: 'Receipt parsing queued',
      };
    case 'running':
      return {
        actions: recoveryActions([], reviewAvailable),
        description: 'Parsing is in progress. Manual entry and draft controls remain available.',
        recommendedActionId: 'manual_expense',
        statusLabel: 'Running - manual fallback available',
        title: 'You can keep going manually',
      };
    case 'parsed':
      return {
        actions: recoveryActions([], reviewAvailable),
        description: 'Parsed fields are available. Review them, edit the draft, or enter manually.',
        recommendedActionId: reviewAvailable ? 'edit_review' : 'manual_expense',
        statusLabel: 'Parsed - review or manual fallback available',
        title: 'Review or recover',
      };
    case 'low_confidence':
    case 'reviewed':
      return {
        actions: recoveryActions([], reviewAvailable),
        description: 'Some receipt fields may be wrong or incomplete. Edit them directly or use manual entry.',
        recommendedActionId: reviewAvailable ? 'edit_review' : 'manual_expense',
        statusLabel: `${parseJob.status === 'low_confidence' ? 'Low confidence' : 'Reviewed'} - editable recovery available`,
        title: 'Fix or save manually',
      };
    case 'failed':
      return {
        actions: recoveryActions(
          [
            {
              description: 'Try parsing again.',
              disabled: parseActionRunning,
              id: 'retry_parsing',
              label: 'Retry parsing',
              variant: 'secondary',
            },
          ],
          reviewAvailable,
        ),
        description: 'Parsing did not finish. Manual expense entry still works offline.',
        recommendedActionId: 'manual_expense',
        statusLabel: 'Failed - retry and manual fallback available',
        title: 'Parsing did not finish',
      };
    case 'retry_exhausted':
      return {
        actions: recoveryActions(
          [
            {
              description: 'Run another parse only because you chose to retry.',
              disabled: parseActionRunning,
              id: 'retry_parsing',
              label: 'Retry manually',
              variant: 'secondary',
            },
          ],
          reviewAvailable,
        ),
        description: 'Automatic tries are paused after three attempts. Retry manually or enter the expense.',
        recommendedActionId: 'manual_expense',
        statusLabel: 'Retry exhausted - manual fallback available',
        title: 'Automatic parsing paused',
      };
    default:
      parseJob.status satisfies never;
      return {
        actions: recoveryActions([], reviewAvailable),
        description: 'Receipt recovery is available. Edit the draft, enter manually, keep it, or discard it.',
        recommendedActionId: 'manual_expense',
        statusLabel: 'Recovery available',
        title: 'Choose a recovery action',
      };
  }
}
