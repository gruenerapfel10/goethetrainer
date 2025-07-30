import { config } from 'dotenv';
config();

import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import fs from 'node:fs';
import path from 'node:path';
import { genSaltSync, hashSync } from 'bcrypt-ts';
import { user, systemPrompts } from './schema';
import { DEFAULT_GENERAL_PROMPT } from '@/lib/ai/prompts';
import { csvAnalysisPrompt } from '@/lib/ai/prompts';

// Ensure the system_prompts table exists
async function ensureSystemPromptsTable(conn: postgres.Sql) {
  try {
    const [{ to_regclass }] = await conn`
      SELECT to_regclass('public.system_prompts') as to_regclass
    `;
    
    if (!to_regclass) {
      const file = path.join(__dirname, 'migrations', '20250424_create_system_prompts.sql');
      
      if (fs.existsSync(file)) {
        const sql = fs.readFileSync(file, 'utf8');
        await conn.unsafe(sql);
      } else {
        await conn.unsafe(`
          CREATE TABLE system_prompts (
            assistant_id VARCHAR(64) PRIMARY KEY,
            prompt_text TEXT NOT NULL,
            updated_at TIMESTAMP NOT NULL DEFAULT NOW()
          );
        `);
        console.log('✅ Created system_prompts table manually');
      }
    } else {
      console.log('✓ Table system_prompts already exists');
    }
  } catch (error) {
    console.error('❌ Error ensuring system_prompts table:', error);
    throw error;
  }
}

// Seed default prompt if missing
async function seedDefaultPrompt(conn: postgres.Sql, db: ReturnType<typeof drizzle>) {
  try {
    // Check and seed general assistant prompt
    const [{ exists: generalExists }] = await conn`
      SELECT EXISTS(
        SELECT 1 FROM system_prompts WHERE assistant_id = 'general-assistant'
      ) as exists
    `;
    
    if (!generalExists) {
      await db.insert(systemPrompts).values({
        assistantId: 'general-assistant',
        promptText: DEFAULT_GENERAL_PROMPT,
        updatedAt: new Date(),
      }).onConflictDoNothing();
      console.log('✅ Seeded default general-assistant prompt');
    } else {
      console.log('✓ General assistant prompt already exists');
    }

    // Check and seed CSV agent prompt
    const [{ exists: csvExists }] = await conn`
      SELECT EXISTS(
        SELECT 1 FROM system_prompts WHERE assistant_id = 'csv-agent'
      ) as exists
    `;
    
    if (!csvExists) {
      await db.insert(systemPrompts).values({
        assistantId: 'csv-agent',
        promptText: csvAnalysisPrompt,
        updatedAt: new Date(),
      }).onConflictDoNothing();
      console.log('✅ Seeded default csv-agent prompt');
    } else {
      console.log('✓ CSV agent prompt already exists');
    }
  } catch (error) {
    console.error('❌ Error seeding default prompts:', error);
    throw error;
  }
}

// Ensure an admin user exists
async function ensureAdminUser(conn: postgres.Sql, db: ReturnType<typeof drizzle>) {
  try {
    const [{ exists }] = await conn`
      SELECT EXISTS(
        SELECT 1 FROM "User" WHERE email = 'admin@demo.com'
      ) as exists
    `;
    
    if (!exists) {
      const hash = hashSync('password123!', genSaltSync(10));
      await db.insert(user).values({
        email: 'admin@demo.com',
        password: hash,
        isAdmin: true,
      });
      console.log('✅ Created admin user');
    } else {
      console.log('✓ Admin user already exists');
    }
  } catch (error) {
    console.error('❌ Error ensuring admin user:', error);
    throw error;
  }
}

async function runMigrate() {
  if (!process.env.POSTGRES_URL) {
    throw new Error('POSTGRES_URL must be defined');
  }
  
  const conn = postgres(process.env.POSTGRES_URL, { max: 1 });
  const db = drizzle(conn);

  try {
    await ensureSystemPromptsTable(conn);
    await seedDefaultPrompt(conn, db);
    await ensureAdminUser(conn, db);
    
    console.log('✅ All migrations and seeding completed successfully');
  } catch (e) {
    console.error('❌ Migration failed:', e);
    process.exit(1);
  } finally {
    await conn.end();
  }
}

runMigrate().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
