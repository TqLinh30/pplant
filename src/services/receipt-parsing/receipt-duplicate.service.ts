import { openPplantDatabase, type PplantDatabase } from '@/data/db/client';
import {
  migrateDatabase,
  type MigrationDatabase,
  type MigrationReport,
} from '@/data/db/migrations/migrate';
import {
  createMoneyRecordRepository,
  type MoneyRecordRepository,
} from '@/data/repositories/money-records.repository';
import type { EntityId } from '@/domain/common/ids';
import { isErr, ok, type AppResult } from '@/domain/common/result';
import {
  buildReceiptDuplicateWarning,
  type ReceiptDuplicateWarning,
} from '@/domain/receipts/duplicates';
import type { NormalizedReceiptParseResult } from '@/domain/receipts/types';
import { localWorkspaceId } from '@/domain/workspace/types';

export type LoadReceiptDuplicateWarningInput = {
  currentSavedRecordId?: EntityId | null;
  result: NormalizedReceiptParseResult;
};

export type ReceiptDuplicateServiceDependencies = {
  createMoneyRecordRepository?: (database: unknown) => Pick<MoneyRecordRepository, 'listHistoryRecords'>;
  migrateDatabase?: (database: unknown, now: Date) => Promise<AppResult<MigrationReport>>;
  moneyRecordRepository?: Pick<MoneyRecordRepository, 'listHistoryRecords'>;
  now?: () => Date;
  openDatabase?: () => unknown;
};

async function prepareMoneyRepository({
  createMoneyRecordRepository: createRepositoryDependency = (database) =>
    createMoneyRecordRepository(database as PplantDatabase),
  migrateDatabase: migrateDatabaseDependency = (database, now) =>
    migrateDatabase(database as MigrationDatabase, now),
  moneyRecordRepository,
  now: nowDependency = () => new Date(),
  openDatabase: openDatabaseDependency = openPplantDatabase,
}: ReceiptDuplicateServiceDependencies = {}): Promise<AppResult<Pick<MoneyRecordRepository, 'listHistoryRecords'>>> {
  if (moneyRecordRepository) {
    return ok(moneyRecordRepository);
  }

  let database: unknown;

  try {
    database = openDatabaseDependency();
  } catch {
    return ok({
      async listHistoryRecords() {
        return ok({
          hasMore: false,
          limit: 0,
          offset: 0,
          records: [],
          totalCount: 0,
        });
      },
    });
  }

  const migrationResult = await migrateDatabaseDependency(database, nowDependency());

  if (isErr(migrationResult)) {
    return migrationResult;
  }

  return ok(createRepositoryDependency(database));
}

export async function loadReceiptDuplicateWarning(
  input: LoadReceiptDuplicateWarningInput,
  dependencies: ReceiptDuplicateServiceDependencies = {},
): Promise<AppResult<ReceiptDuplicateWarning | null>> {
  const repository = await prepareMoneyRepository(dependencies);

  if (isErr(repository)) {
    return repository;
  }

  const totalMinor = input.result.totalMinor.value;
  const localDate = input.result.localDate.value;

  if (totalMinor === undefined || localDate === undefined) {
    return ok(buildReceiptDuplicateWarning({ candidates: [], currentSavedRecordId: input.currentSavedRecordId, result: input.result }));
  }

  const page = await repository.value.listHistoryRecords(localWorkspaceId, {
    amountMinorMax: totalMinor,
    amountMinorMin: totalMinor,
    dateFrom: localDate,
    dateTo: localDate,
    kind: 'expense',
    limit: 20,
    offset: 0,
    sort: 'date_desc',
  });

  if (isErr(page)) {
    return page;
  }

  return ok(
    buildReceiptDuplicateWarning({
      candidates: page.value.records,
      currentSavedRecordId: input.currentSavedRecordId,
      result: input.result,
    }),
  );
}
