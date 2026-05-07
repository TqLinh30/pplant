import { z } from 'zod';

export const reminderDeliveryStateSchema = z.enum([
  'scheduled',
  'sent',
  'missed',
  'snoozed',
  'paused',
  'disabled',
  'dismissed',
  'complete',
]);
