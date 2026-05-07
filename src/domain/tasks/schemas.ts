import { z } from 'zod';

export const taskStateSchema = z.enum(['todo', 'doing', 'done']);
export const taskPrioritySchema = z.enum(['high', 'low']);
