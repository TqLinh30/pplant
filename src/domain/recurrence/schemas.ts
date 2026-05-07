import { z } from 'zod';

export const recurrenceRuleDraftSchema = z.object({
  endsOnLocalDate: z.string().optional(),
  frequency: z.enum(['daily', 'weekly', 'monthly']),
  startsOnLocalDate: z.string(),
});
