import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'sqlite',
  out: './src/data/db/migrations',
  schema: './src/data/db/schema.ts',
});
