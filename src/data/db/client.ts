import { drizzle, type ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';
import * as SQLite from 'expo-sqlite';

import { schema, type DatabaseSchema } from './schema';

export const databaseName = 'pplant.db';

export type PplantDatabase = ExpoSQLiteDatabase<DatabaseSchema> & {
  $client: SQLite.SQLiteDatabase;
};

let pplantDatabase: PplantDatabase | null = null;

export function openPplantDatabase(): PplantDatabase {
  if (pplantDatabase) {
    return pplantDatabase;
  }

  const sqlite = SQLite.openDatabaseSync(databaseName);
  sqlite.execSync('PRAGMA busy_timeout = 5000;');
  pplantDatabase = drizzle(sqlite, { schema });
  return pplantDatabase;
}
