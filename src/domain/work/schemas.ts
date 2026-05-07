import { z } from 'zod';

export const workEntryDraftSchema = z.object({
  breakMinutes: z.number().int().nonnegative().optional(),
  endedAtLocal: z.string().optional(),
  paid: z.boolean(),
  startedAtLocal: z.string(),
  wageMinorPerHour: z.number().int().nonnegative().optional(),
});
