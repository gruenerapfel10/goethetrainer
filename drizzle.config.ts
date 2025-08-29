import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

config({ path: '.env' });

export default defineConfig({
  schema: './lib/db/schema.ts',
  out:    './lib/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
        // biome-ignore lint: Forbidden non-null assertion.
    url: process.env.POSTGRES_URL!,
    ssl: { rejectUnauthorized: false },
  },
  // Add this section to ignore specific tables/views:
  tablesFilter: [
    // Exclude drizzle migration table (if using migrations)
    '!drizzle.*',
    // Exclude pg_stat_statements objects
    '!pg_catalog.*', // Good practice to ignore system catalogs
    '!information_schema.*', // Good practice to ignore info schema
    '!pg_stat_statements',
    '!pg_stat_statements_info',
    // Add any other tables/views managed outside Drizzle
    // For example, if your Lambda created the bedrock_integration schema/tables
    // and you *don't* want Drizzle to manage them, exclude them too:
    // '!bedrock_integration.*'
    // However, if you want Drizzle to manage Chat, Document, Message etc.
    // ensure they are NOT excluded and ARE defined in your schema file.
  ],
  verbose: true,
  strict: true,
});
