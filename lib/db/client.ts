import { config } from 'dotenv';
config();

import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';

if (!process.env.POSTGRES_URL) {
  throw new Error('POSTGRES_URL must be defined');
}

if (!process.env.CSV_POSTGRES_URL) {
  throw new Error('CSV_POSTGRES_URL must be defined');
}

// Connection for the public database
const publicSql = postgres(process.env.POSTGRES_URL, { max: 1 });
export const publicDb = drizzle(publicSql);

// Connection for the CSV database
const csvSql = postgres(process.env.CSV_POSTGRES_URL, { max: 1 });
export const csvDb = drizzle(csvSql);

export const db = publicDb;
