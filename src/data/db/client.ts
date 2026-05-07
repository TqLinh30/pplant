import { drizzle, type ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';
import * as SQLite from 'expo-sqlite';

import { schema, type DatabaseSchema } from './schema';

export const databaseName = 'pplant.db';

export type PplantDatabase = ExpoSQLiteDatabase<DatabaseSchema> & {
  $client: SQLite.SQLiteDatabase;
};

export function openPplantDatabase(): PplantDatabase {
  const sqlite = SQLite.openDatabaseSync(databaseName);
  return drizzle(sqlite, { schema });
}
