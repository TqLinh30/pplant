import { createAppError } from '@/domain/common/app-error';
import { err, ok, type AppResult } from '@/domain/common/result';
import type { CaptureDraftKind } from '@/domain/capture-drafts/types';

export type DataDeletionRecordKind =
  | 'all_records'
  | 'expense'
  | 'income'
  | 'money'
  | 'reflection'
  | 'reminder'
  | 'task'
  | 'task_recurrence'
  | 'work';

export type DataDeletionTarget =
  | {
      kind: 'record';
      recordId: string;
      recordKind: Exclude<DataDeletionRecordKind, 'all_records'>;
    }
  | {
      kind: 'records_by_date_range';
      endDate: string;
      recordKind: DataDeletionRecordKind;
      startDate: string;
    }
  | {
      kind: 'records_by_type';
      recordKind: Exclude<DataDeletionRecordKind, 'all_records'>;
    }
  | {
      draftId: string;
      kind: 'draft';
    }
  | {
      draftKind?: CaptureDraftKind | 'all';
      kind: 'drafts';
    }
  | {
      draftId: string;
      kind: 'receipt_image';
    }
  | {
      kind: 'receipt_images';
    }
  | {
      kind: 'diagnostics';
    }
  | {
      kind: 'all_personal_data';
    };

export type DataDeletionPlan = {
  confirmed?: boolean;
  target: DataDeletionTarget;
};

export type DataDeletionImpact = {
  affectedDataCategories: string[];
  confirmationLabel: string;
  destructive: boolean;
  description: string;
  plan: DataDeletionPlan;
  requiresConfirmation: boolean;
  title: string;
};

const localDatePattern = /^\d{4}-\d{2}-\d{2}$/;

function hasText(value: string): boolean {
  return value.trim().length > 0;
}

function isValidLocalDate(value: string): boolean {
  if (!localDatePattern.test(value)) {
    return false;
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);

  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function recordKindLabel(kind: DataDeletionRecordKind): string {
  switch (kind) {
    case 'all_records':
      return 'all records';
    case 'expense':
      return 'expense records';
    case 'income':
      return 'income records';
    case 'money':
      return 'money records';
    case 'reflection':
      return 'reflections';
    case 'reminder':
      return 'reminders';
    case 'task':
      return 'tasks';
    case 'task_recurrence':
      return 'recurring tasks and habits';
    case 'work':
      return 'work entries';
    default:
      return 'records';
  }
}

function validateId(value: string, message: string): AppResult<void> {
  if (!hasText(value)) {
    return err(createAppError('validation_failed', message, 'edit'));
  }

  return ok(undefined);
}

function validateDateRange(startDate: string, endDate: string): AppResult<void> {
  if (!isValidLocalDate(startDate) || !isValidLocalDate(endDate)) {
    return err(createAppError('validation_failed', 'Use local dates in YYYY-MM-DD format.', 'edit'));
  }

  if (startDate > endDate) {
    return err(createAppError('validation_failed', 'Start date must be on or before end date.', 'edit'));
  }

  return ok(undefined);
}

export function validateDataDeletionPlan(plan: DataDeletionPlan): AppResult<DataDeletionPlan> {
  switch (plan.target.kind) {
    case 'record': {
      const id = validateId(plan.target.recordId, 'Choose a record to delete.');

      if (!id.ok) {
        return id;
      }

      return ok(plan);
    }
    case 'records_by_date_range': {
      const range = validateDateRange(plan.target.startDate, plan.target.endDate);

      if (!range.ok) {
        return range;
      }

      return ok(plan);
    }
    case 'records_by_type':
      return ok(plan);
    case 'draft': {
      const id = validateId(plan.target.draftId, 'Choose a draft to discard.');

      if (!id.ok) {
        return id;
      }

      return ok(plan);
    }
    case 'drafts':
      return ok(plan);
    case 'receipt_image': {
      const id = validateId(plan.target.draftId, 'Choose a receipt image to delete.');

      if (!id.ok) {
        return id;
      }

      return ok(plan);
    }
    case 'receipt_images':
    case 'diagnostics':
    case 'all_personal_data':
      return ok(plan);
    default:
      return err(createAppError('validation_failed', 'Choose data to delete.', 'edit'));
  }
}

export function buildDataDeletionImpact(plan: DataDeletionPlan): AppResult<DataDeletionImpact> {
  const validated = validateDataDeletionPlan(plan);

  if (!validated.ok) {
    return validated;
  }

  const confirmedPlan = validated.value;
  const { target } = confirmedPlan;

  switch (target.kind) {
    case 'record':
      return ok({
        affectedDataCategories: [recordKindLabel(target.recordKind), 'linked drafts', 'derived summaries'],
        confirmationLabel: 'Delete record',
        description: `This hides one ${recordKindLabel(target.recordKind)} item from history, Today, Review, and future summaries. Linked drafts or pending local references are cleaned up where they exist.`,
        destructive: true,
        plan: confirmedPlan,
        requiresConfirmation: true,
        title: 'Delete one record',
      });
    case 'records_by_date_range':
      return ok({
        affectedDataCategories: [
          recordKindLabel(target.recordKind),
          'linked drafts',
          'reminder schedules',
          'derived summaries',
        ],
        confirmationLabel: 'Delete range',
        description: `This hides ${recordKindLabel(target.recordKind)} dated ${target.startDate} through ${target.endDate} from normal views and summary calculations.`,
        destructive: true,
        plan: confirmedPlan,
        requiresConfirmation: true,
        title: 'Delete records by date range',
      });
    case 'records_by_type':
      return ok({
        affectedDataCategories: [
          recordKindLabel(target.recordKind),
          'linked drafts',
          'reminder schedules',
          'derived summaries',
        ],
        confirmationLabel: 'Delete type',
        description: `This hides all local ${recordKindLabel(target.recordKind)} from normal views and summary calculations.`,
        destructive: true,
        plan: confirmedPlan,
        requiresConfirmation: true,
        title: `Delete ${recordKindLabel(target.recordKind)}`,
      });
    case 'draft':
      return ok({
        affectedDataCategories: ['one capture draft', 'receipt image reference if present', 'pending parse job if present'],
        confirmationLabel: 'Discard draft',
        description: 'This discards one local capture draft and removes its pending receipt parse data if it exists.',
        destructive: true,
        plan: confirmedPlan,
        requiresConfirmation: true,
        title: 'Discard one draft',
      });
    case 'drafts':
      return ok({
        affectedDataCategories: ['active capture drafts', 'receipt image references', 'pending parse jobs'],
        confirmationLabel: 'Discard drafts',
        description: 'This discards local active drafts and removes pending draft recovery cards from Today and Capture.',
        destructive: true,
        plan: confirmedPlan,
        requiresConfirmation: true,
        title: 'Discard active drafts',
      });
    case 'receipt_image':
      return ok({
        affectedDataCategories: ['one stored receipt image', 'receipt image reference', 'receipt parse output'],
        confirmationLabel: 'Delete image',
        description: 'This deletes one app-managed receipt image when present while keeping the saved expense record.',
        destructive: true,
        plan: confirmedPlan,
        requiresConfirmation: true,
        title: 'Delete one receipt image',
      });
    case 'receipt_images':
      return ok({
        affectedDataCategories: ['stored receipt images', 'receipt image references', 'receipt parse output'],
        confirmationLabel: 'Delete images',
        description: 'This deletes app-managed receipt images and clears receipt image references while keeping saved expense records.',
        destructive: true,
        plan: confirmedPlan,
        requiresConfirmation: true,
        title: 'Delete retained receipt images',
      });
    case 'diagnostics':
      return ok({
        affectedDataCategories: ['local diagnostic events', 'non-sensitive failure metadata'],
        confirmationLabel: 'Clear diagnostics',
        description: 'This clears local diagnostic events. Your saved records, drafts, and settings stay unchanged.',
        destructive: true,
        plan: confirmedPlan,
        requiresConfirmation: true,
        title: 'Clear diagnostics',
      });
    case 'all_personal_data':
      return ok({
        affectedDataCategories: [
          'money records',
          'work entries',
          'tasks',
          'reminders',
          'drafts',
          'receipt images',
          'reflections',
          'settings',
          'diagnostics',
        ],
        confirmationLabel: 'Delete all personal data',
        description: 'This resets local personal data for the current workspace. The app can still open afterward, but local records, drafts, receipt images, reminders, reflections, settings, diagnostics, and planning data are removed or hidden.',
        destructive: true,
        plan: confirmedPlan,
        requiresConfirmation: true,
        title: 'Delete all personal data',
      });
    default:
      return err(createAppError('validation_failed', 'Choose data to delete.', 'edit'));
  }
}

export const dataDeletionRecordKindOptions: { label: string; value: DataDeletionRecordKind }[] = [
  { label: 'All', value: 'all_records' },
  { label: 'Money', value: 'money' },
  { label: 'Expenses', value: 'expense' },
  { label: 'Income', value: 'income' },
  { label: 'Work', value: 'work' },
  { label: 'Tasks', value: 'task' },
  { label: 'Recurring tasks', value: 'task_recurrence' },
  { label: 'Reminders', value: 'reminder' },
  { label: 'Reflections', value: 'reflection' },
];
