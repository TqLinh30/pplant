import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as SQLite from 'expo-sqlite';

import { databaseName, openPplantDatabase } from './client';

jest.mock('expo-sqlite', () => ({
  openDatabaseSync: jest.fn(),
}));

jest.mock('drizzle-orm/expo-sqlite', () => ({
  drizzle: jest.fn(),
}));

describe('local database client', () => {
  it('reuses one SQLite connection for the app runtime', () => {
    const sqliteClient = { execSync: jest.fn(), name: databaseName };
    const database = { $client: sqliteClient };
    const openDatabaseSync = SQLite.openDatabaseSync as jest.Mock;
    const drizzleMock = drizzle as unknown as jest.Mock;

    openDatabaseSync.mockReturnValue(sqliteClient);
    drizzleMock.mockReturnValue(database);

    const first = openPplantDatabase();
    const second = openPplantDatabase();

    expect(first).toBe(database);
    expect(second).toBe(database);
    expect(openDatabaseSync).toHaveBeenCalledTimes(1);
    expect(openDatabaseSync).toHaveBeenCalledWith(databaseName);
    expect(sqliteClient.execSync).toHaveBeenCalledTimes(1);
    expect(sqliteClient.execSync).toHaveBeenCalledWith('PRAGMA busy_timeout = 5000;');
    expect(drizzleMock).toHaveBeenCalledTimes(1);
  });
});
