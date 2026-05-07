export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly';

export type RecurrenceRuleDraft = {
  frequency: RecurrenceFrequency;
  startsOnLocalDate: string;
  endsOnLocalDate?: string;
};
