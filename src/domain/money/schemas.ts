import { z } from 'zod';

export const moneyRecordDraftSchema = z.object({
  amountMinor: z.number().int(),
  categoryId: z.string().optional(),
  currency: z.string().regex(/^[A-Z]{3}$/),
  kind: z.enum(['expense', 'income']),
  localDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  merchantOrSource: z.string().optional(),
  note: z.string().optional(),
  topicIds: z.array(z.string()).default([]),
});
