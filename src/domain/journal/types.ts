import type { EntityId } from '@/domain/common/ids';
import type { LocalDate } from '@/domain/common/date-rules';
import type { WorkspaceId } from '@/domain/workspace/types';

export const journalMoodIds = [
  'love',
  'excited',
  'calm',
  'tired',
  'sleepy',
  'sad',
  'stressed',
  'neutral',
] as const;

export type JournalMoodId = (typeof journalMoodIds)[number];

export type JournalEntry = {
  capturedAt: string;
  contentType: string | null;
  createdAt: string;
  deletedAt: string | null;
  id: EntityId;
  localDate: LocalDate;
  localTime: string;
  moodId: JournalMoodId;
  note: string | null;
  originalFileName: string | null;
  photoUri: string;
  sizeBytes: number | null;
  storageScope: 'app_private_documents';
  updatedAt: string;
  workspaceId: WorkspaceId;
};

export type JournalEntryRow = {
  capturedAt: string;
  contentType: string | null;
  createdAt: string;
  deletedAt: string | null;
  id: string;
  localDate: string;
  localTime: string;
  moodId: string;
  note: string | null;
  originalFileName: string | null;
  photoUri: string;
  sizeBytes: number | null;
  storageScope: string;
  updatedAt: string;
  workspaceId: string;
};

export type SaveJournalEntryInput = {
  capturedAt: string;
  contentType?: string | null;
  createdAt: string;
  id: EntityId;
  localDate: LocalDate;
  localTime: string;
  moodId: JournalMoodId;
  note?: string | null;
  originalFileName?: string | null;
  photoUri: string;
  sizeBytes?: number | null;
  storageScope: 'app_private_documents';
  updatedAt: string;
  workspaceId: WorkspaceId;
};
