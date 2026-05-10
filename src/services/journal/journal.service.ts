import { openPplantDatabase, type PplantDatabase } from '@/data/db/client';
import {
  migrateDatabase,
  type MigrationDatabase,
  type MigrationReport,
} from '@/data/db/migrations/migrate';
import {
  createJournalEntryRepository,
  type JournalEntryRepository,
  type JournalMonthRange,
} from '@/data/repositories/journal-entries.repository';
import { createAppError } from '@/domain/common/app-error';
import { asLocalDate, formatDateAsLocalDate, type LocalDate } from '@/domain/common/date-rules';
import { asEntityId } from '@/domain/common/ids';
import { err, isErr, ok, type AppResult } from '@/domain/common/result';
import { asJournalMoodId } from '@/domain/journal/schemas';
import { calculateJournalMonthSummary, type JournalMonthSummary } from '@/domain/journal/summary';
import type { JournalEntry, JournalMoodId } from '@/domain/journal/types';
import { localWorkspaceId } from '@/domain/workspace/types';
import type { PersistedJournalImageReference } from '@/services/files/journal-file-store';

export type SaveJournalEntryRequest = {
  moodId: JournalMoodId | string;
  note?: string;
  photo: PersistedJournalImageReference;
};

export type JournalOverviewData = {
  entries: JournalEntry[];
  generatedAt: string;
  localDate: LocalDate;
  monthRange: JournalMonthRange;
  monthSummary: JournalMonthSummary;
};

export type JournalServiceDependencies = {
  createEntryId?: () => string;
  createRepository?: (database: unknown) => JournalEntryRepository;
  migrateDatabase?: (database: unknown, now: Date) => Promise<AppResult<MigrationReport>>;
  now?: () => Date;
  openDatabase?: () => unknown;
};

type PreparedJournalAccess = {
  now: Date;
  repository: JournalEntryRepository;
};

function defaultCreateEntryId(): string {
  return `journal-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatLocalTime(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function monthRangeFor(date: Date): AppResult<JournalMonthRange> {
  const start = asLocalDate(
    `${String(date.getFullYear()).padStart(4, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-01`,
  );
  const nextMonth = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  const end = asLocalDate(
    `${String(nextMonth.getFullYear()).padStart(4, '0')}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-01`,
  );

  if (!start.ok) {
    return start;
  }

  if (!end.ok) {
    return end;
  }

  return ok({
    endDateExclusive: end.value,
    startDate: start.value,
  });
}

async function prepareJournalAccess({
  createRepository: createRepositoryDependency = (database) =>
    createJournalEntryRepository(database as PplantDatabase),
  migrateDatabase: migrateDatabaseDependency = (database, now) =>
    migrateDatabase(database as MigrationDatabase, now),
  now: nowDependency = () => new Date(),
  openDatabase: openDatabaseDependency = openPplantDatabase,
}: JournalServiceDependencies = {}): Promise<AppResult<PreparedJournalAccess>> {
  const now = nowDependency();
  let database: unknown;

  try {
    database = openDatabaseDependency();
  } catch (cause) {
    return err(createAppError('unavailable', 'Journal could not open local data.', 'retry', cause));
  }

  const migrationResult = await migrateDatabaseDependency(database, now);

  if (isErr(migrationResult)) {
    return migrationResult;
  }

  return ok({
    now,
    repository: createRepositoryDependency(database),
  });
}

export async function saveJournalEntry(
  input: SaveJournalEntryRequest,
  dependencies: JournalServiceDependencies = {},
): Promise<AppResult<JournalEntry>> {
  const access = await prepareJournalAccess(dependencies);

  if (isErr(access)) {
    return access;
  }

  const id = asEntityId((dependencies.createEntryId ?? defaultCreateEntryId)());
  const mood = asJournalMoodId(input.moodId);
  const capturedAtDate = new Date(input.photo.capturedAt);

  if (!id.ok) {
    return id;
  }

  if (!mood.ok) {
    return mood;
  }

  if (Number.isNaN(capturedAtDate.getTime())) {
    return err(createAppError('validation_failed', 'Journal photo capture time is invalid.', 'retry'));
  }

  if (input.photo.photoUri.trim().length === 0) {
    return err(createAppError('validation_failed', 'Capture a journal photo before saving.', 'edit'));
  }

  const timestamp = access.value.now.toISOString();

  return access.value.repository.createEntry({
    capturedAt: input.photo.capturedAt,
    contentType: input.photo.contentType,
    createdAt: timestamp,
    id: id.value,
    localDate: formatDateAsLocalDate(capturedAtDate),
    localTime: formatLocalTime(capturedAtDate),
    moodId: mood.value,
    note: input.note?.trim() ? input.note.trim() : null,
    originalFileName: input.photo.originalFileName,
    photoUri: input.photo.photoUri,
    sizeBytes: input.photo.sizeBytes,
    storageScope: input.photo.storageScope,
    updatedAt: timestamp,
    workspaceId: localWorkspaceId,
  });
}

export async function deleteJournalEntry(
  input: { entryId: string },
  dependencies: JournalServiceDependencies = {},
): Promise<AppResult<JournalEntry>> {
  const access = await prepareJournalAccess(dependencies);

  if (isErr(access)) {
    return access;
  }

  const entryId = asEntityId(input.entryId);

  if (!entryId.ok) {
    return entryId;
  }

  return access.value.repository.deleteEntry(localWorkspaceId, entryId.value, { now: access.value.now });
}

export async function loadJournalOverview(
  input: { localDate?: string; monthDate?: Date } = {},
  dependencies: JournalServiceDependencies = {},
): Promise<AppResult<JournalOverviewData>> {
  const access = await prepareJournalAccess(dependencies);

  if (isErr(access)) {
    return access;
  }

  const selectedLocalDate = input.localDate
    ? asLocalDate(input.localDate)
    : ok(formatDateAsLocalDate(access.value.now));

  if (!selectedLocalDate.ok) {
    return selectedLocalDate;
  }

  const monthDate = input.monthDate ?? new Date(`${selectedLocalDate.value}T00:00:00`);
  const monthRange = monthRangeFor(monthDate);

  if (!monthRange.ok) {
    return monthRange;
  }

  const entries = await access.value.repository.listEntriesForDate(localWorkspaceId, selectedLocalDate.value);

  if (isErr(entries)) {
    return entries;
  }

  const monthEntries = await access.value.repository.listEntriesForMonth(localWorkspaceId, monthRange.value);

  if (isErr(monthEntries)) {
    return monthEntries;
  }

  return ok({
    entries: entries.value,
    generatedAt: access.value.now.toISOString(),
    localDate: selectedLocalDate.value,
    monthRange: monthRange.value,
    monthSummary: calculateJournalMonthSummary(monthEntries.value),
  });
}
