import { z } from 'zod';

export const parsedReceiptFieldSchema = z.object({
  confidence: z.enum(['high', 'medium', 'low', 'unknown']),
  source: z.enum(['parsed', 'manual', 'estimated', 'user_corrected']),
  value: z.unknown().optional(),
});
