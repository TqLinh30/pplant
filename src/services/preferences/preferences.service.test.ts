import type { PreferencesRepository } from '@/data/repositories/preferences.repository';
import { createAppError } from '@/domain/common/app-error';
import { err, ok } from '@/domain/common/result';
import { parseUserPreferencesRow } from '@/domain/preferences/schemas';
import type { SaveUserPreferencesInput, UserPreferences } from '@/domain/preferences/types';
import { localWorkspaceId } from '@/domain/workspace/types';

import {
  loadUserPreferences,
  saveUserPreferences,
  type SaveUserPreferencesRequest,
} from './preferences.service';

const fixedNow = new Date('2026-05-08T00:00:00.000Z');
const migrationReport = {
  applied: 0,
  appliedMigrations: [],
};

function createPreferencesFixture(overrides: Partial<SaveUserPreferencesInput> = {}): UserPreferences {
  const result = parseUserPreferencesRow({
    createdAt: fixedNow.toISOString(),
    currencyCode: 'USD',
    defaultHourlyWageCurrencyCode: 'USD',
    defaultHourlyWageMinor: 1250,
    locale: 'en-US',
    monthlyBudgetResetDay: 1,
    updatedAt: fixedNow.toISOString(),
    workspaceId: localWorkspaceId,
    ...overrides,
  });

  if (!result.ok) {
    throw new Error('preferences fixture failed');
  }

  return result.value;
}

function createFakeRepository(initialPreferences: UserPreferences | null = null): PreferencesRepository & {
  lastSavedInput?: SaveUserPreferencesInput;
  saveCalls: number;
} {
  let preferences = initialPreferences;

  return {
    saveCalls: 0,
    async loadPreferences() {
      return ok(preferences);
    },
    async savePreferences(input, { now }) {
      this.saveCalls += 1;
      this.lastSavedInput = input;

      const row = parseUserPreferencesRow({
        ...input,
        createdAt: preferences?.createdAt ?? now.toISOString(),
        defaultHourlyWageCurrencyCode: input.defaultHourlyWageCurrencyCode ?? input.currencyCode,
        updatedAt: now.toISOString(),
      });

      if (!row.ok) {
        return row;
      }

      preferences = row.value;
      return ok(row.value);
    },
  };
}

const validRequest: SaveUserPreferencesRequest = {
  currencyCode: 'USD',
  defaultHourlyWageMinor: 1250,
  locale: 'en-US',
  monthlyBudgetResetDay: 15,
};

describe('preferences service', () => {
  it('loads saved local preferences', async () => {
    const preferences = createPreferencesFixture();
    const repository = createFakeRepository(preferences);

    const result = await loadUserPreferences({
      createPreferencesRepository: () => repository,
      migrateDatabase: async () => ok(migrationReport),
      now: () => fixedNow,
      openDatabase: () => ({}),
    });

    expect(result).toEqual({
      ok: true,
      value: preferences,
    });
  });

  it('returns a settings recovery path when preferences are missing', async () => {
    const repository = createFakeRepository();

    const result = await loadUserPreferences({
      createPreferencesRepository: () => repository,
      migrateDatabase: async () => ok(migrationReport),
      now: () => fixedNow,
      openDatabase: () => ({}),
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('not_found');
      expect(result.error.recovery).toBe('settings');
    }
  });

  it('saves preferences for the local workspace with wage currency matching selected currency', async () => {
    const repository = createFakeRepository();

    const result = await saveUserPreferences(validRequest, {
      createPreferencesRepository: () => repository,
      migrateDatabase: async () => ok(migrationReport),
      now: () => fixedNow,
      openDatabase: () => ({}),
    });

    expect(result.ok).toBe(true);
    expect(repository.saveCalls).toBe(1);
    expect(repository.lastSavedInput).toEqual({
      ...validRequest,
      defaultHourlyWageCurrencyCode: validRequest.currencyCode,
      workspaceId: localWorkspaceId,
    });
  });

  it('returns editable validation errors for invalid preference values', async () => {
    const repository = createFakeRepository();

    const result = await saveUserPreferences(
      {
        ...validRequest,
        defaultHourlyWageMinor: -1,
      },
      {
        createPreferencesRepository: () => repository,
        migrateDatabase: async () => ok(migrationReport),
        now: () => fixedNow,
        openDatabase: () => ({}),
      },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('validation_failed');
      expect(result.error.recovery).toBe('edit');
    }
  });

  it('returns retryable errors when local preferences storage cannot open', async () => {
    const result = await loadUserPreferences({
      createPreferencesRepository: () => createFakeRepository(),
      migrateDatabase: async () => ok(migrationReport),
      now: () => fixedNow,
      openDatabase: () => {
        throw new Error('sqlite open failed');
      },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('unavailable');
      expect(result.error.recovery).toBe('retry');
    }
  });

  it('stops before repository access when migration fails', async () => {
    const repository = createFakeRepository();

    const result = await saveUserPreferences(validRequest, {
      createPreferencesRepository: () => repository,
      migrateDatabase: async () =>
        err(createAppError('unavailable', 'Local data could not be prepared.', 'retry')),
      now: () => fixedNow,
      openDatabase: () => ({}),
    });

    expect(result.ok).toBe(false);
    expect(repository.saveCalls).toBe(0);
  });
});
