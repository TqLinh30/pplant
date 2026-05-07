import { openPplantDatabase, type PplantDatabase } from '@/data/db/client';
import {
  migrateDatabase,
  type MigrationDatabase,
  type MigrationReport,
} from '@/data/db/migrations/migrate';
import {
  createBudgetPlanningRepository,
  type BudgetPlanningRepository,
} from '@/data/repositories/budget-planning.repository';
import {
  createPreferencesRepository,
  type PreferencesRepository,
} from '@/data/repositories/preferences.repository';
import { createAppError } from '@/domain/common/app-error';
import { asEntityId } from '@/domain/common/ids';
import { err, isErr, ok, type AppResult } from '@/domain/common/result';
import {
  budgetResetDaySource,
  budgetRolloverPolicy,
  overBudgetBehavior,
  parseSavingsGoalRow,
  validateBudgetPlanningAmountMinor,
  validateSavingsGoalName,
} from '@/domain/budgets/schemas';
import type {
  BudgetRules,
  SavingsGoal,
} from '@/domain/budgets/types';
import type { UserPreferences } from '@/domain/preferences/types';
import { localWorkspaceId } from '@/domain/workspace/types';

export type BudgetPlanningSettingsData = {
  budgetRules: BudgetRules | null;
  preferences: UserPreferences;
  savingsGoals: SavingsGoal[];
};

export type SaveBudgetRulesRequest = {
  monthlyBudgetAmountMinor: number;
};

export type SaveSavingsGoalRequest = {
  currentAmountMinor: number;
  name: string;
  targetAmountMinor: number;
  targetDate?: string | null;
};

export type UpdateSavingsGoalRequest = SaveSavingsGoalRequest & {
  id: string;
};

export type BudgetPlanningServiceDependencies = {
  createBudgetPlanningRepository?: (database: unknown) => BudgetPlanningRepository;
  createId?: () => string;
  createPreferencesRepository?: (database: unknown) => PreferencesRepository;
  migrateDatabase?: (database: unknown, now: Date) => Promise<AppResult<MigrationReport>>;
  now?: () => Date;
  openDatabase?: () => unknown;
};

type PreparedBudgetPlanningAccess = {
  now: Date;
  preferences: UserPreferences;
  repository: BudgetPlanningRepository;
};

function defaultCreateSavingsGoalId(): string {
  return `goal-${Date.now().toString(36)}`;
}

async function prepareBudgetPlanningAccess({
  createBudgetPlanningRepository: createBudgetPlanningRepositoryDependency = (database) =>
    createBudgetPlanningRepository(database as PplantDatabase),
  createPreferencesRepository: createPreferencesRepositoryDependency = (database) =>
    createPreferencesRepository(database as PplantDatabase),
  migrateDatabase: migrateDatabaseDependency = (database, now) =>
    migrateDatabase(database as MigrationDatabase, now),
  now: nowDependency = () => new Date(),
  openDatabase: openDatabaseDependency = openPplantDatabase,
}: BudgetPlanningServiceDependencies = {}): Promise<AppResult<PreparedBudgetPlanningAccess>> {
  const now = nowDependency();
  let database: unknown;

  try {
    database = openDatabaseDependency();
  } catch (cause) {
    return err(
      createAppError(
        'unavailable',
        'Local budget planning data could not be opened. Please try again.',
        'retry',
        cause,
      ),
    );
  }

  const migrationResult = await migrateDatabaseDependency(database, now);

  if (isErr(migrationResult)) {
    return migrationResult;
  }

  const preferencesRepository = createPreferencesRepositoryDependency(database);
  const preferences = await preferencesRepository.loadPreferences(localWorkspaceId);

  if (isErr(preferences)) {
    return preferences;
  }

  if (!preferences.value) {
    return err(createAppError('not_found', 'Save preferences before setting budgets.', 'settings'));
  }

  return ok({
    now,
    preferences: preferences.value,
    repository: createBudgetPlanningRepositoryDependency(database),
  });
}

function validateSavingsGoalInput(input: SaveSavingsGoalRequest, currencyCode: string, id = 'validation-goal') {
  return parseSavingsGoalRow({
    archivedAt: null,
    createdAt: new Date(0).toISOString(),
    currencyCode,
    currentAmountMinor: input.currentAmountMinor,
    id,
    name: input.name,
    targetAmountMinor: input.targetAmountMinor,
    targetDate: input.targetDate ?? null,
    updatedAt: new Date(0).toISOString(),
    workspaceId: localWorkspaceId,
  });
}

export async function loadBudgetPlanningSettings(
  dependencies: BudgetPlanningServiceDependencies = {},
): Promise<AppResult<BudgetPlanningSettingsData>> {
  const access = await prepareBudgetPlanningAccess(dependencies);

  if (isErr(access)) {
    return access;
  }

  const budgetRules = await access.value.repository.loadBudgetRules(localWorkspaceId);

  if (isErr(budgetRules)) {
    return budgetRules;
  }

  const savingsGoals = await access.value.repository.listSavingsGoals(localWorkspaceId);

  if (isErr(savingsGoals)) {
    return savingsGoals;
  }

  return ok({
    budgetRules: budgetRules.value,
    preferences: access.value.preferences,
    savingsGoals: savingsGoals.value,
  });
}

export async function saveBudgetRules(
  input: SaveBudgetRulesRequest,
  dependencies: BudgetPlanningServiceDependencies = {},
): Promise<AppResult<BudgetRules>> {
  const access = await prepareBudgetPlanningAccess(dependencies);

  if (isErr(access)) {
    return access;
  }

  const amount = validateBudgetPlanningAmountMinor(input.monthlyBudgetAmountMinor, {
    allowZero: false,
  });

  if (!amount.ok) {
    return amount;
  }

  return access.value.repository.saveBudgetRules(
    {
      currencyCode: access.value.preferences.currencyCode,
      monthlyBudgetAmountMinor: amount.value,
      overBudgetBehavior,
      resetDaySource: budgetResetDaySource,
      rolloverPolicy: budgetRolloverPolicy,
      workspaceId: localWorkspaceId,
    },
    { now: access.value.now },
  );
}

export async function createSavingsGoal(
  input: SaveSavingsGoalRequest,
  dependencies: BudgetPlanningServiceDependencies = {},
): Promise<AppResult<SavingsGoal>> {
  const access = await prepareBudgetPlanningAccess(dependencies);

  if (isErr(access)) {
    return access;
  }

  const id = (dependencies.createId ?? defaultCreateSavingsGoalId)();
  const validation = validateSavingsGoalInput(input, access.value.preferences.currencyCode, id);

  if (!validation.ok) {
    return validation;
  }

  return access.value.repository.createSavingsGoal(
    {
      archivedAt: null,
      currencyCode: access.value.preferences.currencyCode,
      currentAmountMinor: validation.value.currentAmountMinor,
      id,
      name: validation.value.name,
      targetAmountMinor: validation.value.targetAmountMinor,
      targetDate: validation.value.targetDate,
      workspaceId: localWorkspaceId,
    },
    { now: access.value.now },
  );
}

export async function updateSavingsGoal(
  input: UpdateSavingsGoalRequest,
  dependencies: BudgetPlanningServiceDependencies = {},
): Promise<AppResult<SavingsGoal>> {
  const access = await prepareBudgetPlanningAccess(dependencies);

  if (isErr(access)) {
    return access;
  }

  const id = asEntityId(input.id);

  if (!id.ok) {
    return err(createAppError('validation_failed', 'Choose a valid savings goal.', 'edit', id.error));
  }

  const name = validateSavingsGoalName(input.name);

  if (!name.ok) {
    return name;
  }

  const validation = validateSavingsGoalInput(input, access.value.preferences.currencyCode, id.value);

  if (!validation.ok) {
    return validation;
  }

  return access.value.repository.updateSavingsGoal(
    {
      archivedAt: null,
      currencyCode: access.value.preferences.currencyCode,
      currentAmountMinor: validation.value.currentAmountMinor,
      id: id.value,
      name: validation.value.name,
      targetAmountMinor: validation.value.targetAmountMinor,
      targetDate: validation.value.targetDate,
      workspaceId: localWorkspaceId,
    },
    { now: access.value.now },
  );
}
