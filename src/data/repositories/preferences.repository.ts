import { eq } from 'drizzle-orm';

import type { PplantDatabase } from '@/data/db/client';
import { userPreferences } from '@/data/db/schema';
import type { RepositoryWriteOptions } from '@/data/repositories';
import { createAppError } from '@/domain/common/app-error';
import { err, ok, type AppResult } from '@/domain/common/result';
import { parseUserPreferencesRow } from '@/domain/preferences/schemas';
import type { SaveUserPreferencesInput, UserPreferences } from '@/domain/preferences/types';
import type { WorkspaceId } from '@/domain/workspace/types';

export type PreferencesRepository = {
  loadPreferences(workspaceId: WorkspaceId): Promise<AppResult<UserPreferences | null>>;
  savePreferences(
    input: SaveUserPreferencesInput,
    options: RepositoryWriteOptions,
  ): Promise<AppResult<UserPreferences>>;
};

function toPersistenceRow(preferences: UserPreferences) {
  return {
    createdAt: preferences.createdAt,
    currencyCode: preferences.currencyCode,
    defaultHourlyWageCurrencyCode: preferences.defaultHourlyWage.currency,
    defaultHourlyWageMinor: preferences.defaultHourlyWage.amountMinor,
    locale: preferences.locale,
    monthlyBudgetResetDay: preferences.monthlyBudgetResetDay,
    updatedAt: preferences.updatedAt,
    workspaceId: preferences.workspaceId,
  };
}

export function createPreferencesRepository(database: PplantDatabase): PreferencesRepository {
  return {
    async loadPreferences(workspaceId) {
      try {
        const row = database
          .select()
          .from(userPreferences)
          .where(eq(userPreferences.workspaceId, workspaceId))
          .get();

        if (!row) {
          return ok(null);
        }

        return parseUserPreferencesRow(row);
      } catch (cause) {
        return err(createAppError('unavailable', 'Local preferences could not be loaded.', 'retry', cause));
      }
    },

    async savePreferences(input, { now }) {
      try {
        const existing = database
          .select()
          .from(userPreferences)
          .where(eq(userPreferences.workspaceId, input.workspaceId))
          .get();
        const timestamp = now.toISOString();
        const preferences = parseUserPreferencesRow({
          ...input,
          createdAt: existing?.createdAt ?? timestamp,
          defaultHourlyWageCurrencyCode:
            input.defaultHourlyWageCurrencyCode ?? input.currencyCode,
          updatedAt: timestamp,
        });

        if (!preferences.ok) {
          return preferences;
        }

        const row = toPersistenceRow(preferences.value);

        if (existing) {
          database
            .update(userPreferences)
            .set({
              currencyCode: row.currencyCode,
              defaultHourlyWageCurrencyCode: row.defaultHourlyWageCurrencyCode,
              defaultHourlyWageMinor: row.defaultHourlyWageMinor,
              locale: row.locale,
              monthlyBudgetResetDay: row.monthlyBudgetResetDay,
              updatedAt: row.updatedAt,
            })
            .where(eq(userPreferences.workspaceId, row.workspaceId))
            .run();
        } else {
          database.insert(userPreferences).values(row).run();
        }

        const persisted = database
          .select()
          .from(userPreferences)
          .where(eq(userPreferences.workspaceId, row.workspaceId))
          .get();

        if (!persisted) {
          return err(createAppError('unavailable', 'Local preferences could not be confirmed.', 'retry'));
        }

        return parseUserPreferencesRow(persisted);
      } catch (cause) {
        return err(createAppError('unavailable', 'Local preferences could not be saved.', 'retry', cause));
      }
    },
  };
}
