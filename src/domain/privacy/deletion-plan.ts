export type DataDeletionTarget =
  | 'records'
  | 'receipt_images'
  | 'drafts'
  | 'diagnostics'
  | 'all_personal_data';

export type DataDeletionPlan = {
  target: DataDeletionTarget;
  requiresConfirmation: boolean;
};
