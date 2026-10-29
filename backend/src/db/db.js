import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure .env from backend root is loaded
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const { Pool, types } = pg;

// Parse TIMESTAMPTZ (1184) and TIMESTAMP (1114) as ISO 8601 strings for consistent JSON serialization
types.setTypeParser(1184, (val) => (val ? new Date(val).toISOString() : null));
types.setTypeParser(1114, (val) => (val ? new Date(val + 'Z').toISOString() : null));
// Parse int8 / BIGINT / COUNT results (20) as integers
types.setTypeParser(20, (val) => (val === null ? null : parseInt(val, 10)));

let defaultPool = null;

export function checkDatabaseConfig() {
  if (!process.env.DATABASE_URL) {
    console.error('\n============================================================');
    console.error('❌ ERROR: DATABASE_URL environment variable is not set!');
    console.error('Please provide a valid PostgreSQL connection string in backend/.env');
    console.error('Example: DATABASE_URL=postgresql://user:password@ep-xyz.neon.tech/neondb?sslmode=require');
    console.error('============================================================\n');
    throw new Error('DATABASE_URL environment variable is required');
  }
}

export function getPoolConfig(connectionString = process.env.DATABASE_URL) {
  if (!connectionString) {
    checkDatabaseConfig();
  }

  const isLocalhost =
    connectionString.includes('localhost') ||
    connectionString.includes('127.0.0.1');

  const config = {
    connectionString,
    connectionTimeoutMillis: 10000
  };

  // Enable SSL for cloud PostgreSQL (e.g. Neon, Render, Supabase)
  if (!isLocalhost) {
    config.ssl = { rejectUnauthorized: false };
  }

  return config;
}

export function getPool(connectionString = process.env.DATABASE_URL) {
  if (defaultPool) {
    return defaultPool;
  }

  const config = getPoolConfig(connectionString);
  defaultPool = new Pool(config);

  defaultPool.on('error', (err) => {
    console.error('[Postgres Pool Error]', err);
  });

  return defaultPool;
}

export function setPool(pool) {
  defaultPool = pool;
}

export async function closePool() {
  if (defaultPool) {
    await defaultPool.end();
    defaultPool = null;
  }
}

export async function query(text, params) {
  const pool = getPool();
  return pool.query(text, params);
}

export async function withTransaction(dbOrFn, maybeFn) {
  const fn = typeof dbOrFn === 'function' ? dbOrFn : maybeFn;
  const db = typeof dbOrFn === 'function' ? getPool() : dbOrFn;

    // If db is already a dedicated client, execute directly
    if (typeof db.connect !== 'function') {
      return fn(db);
    }

    const client = await db.connect();
    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  export const transaction = withTransaction;

  export async function initDb(pool = getPool()) {
    const schemaPath = path.resolve(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    await pool.query(schema);
  }

  export default {
    getPool,
    setPool,
    closePool,
    query,
    transaction,
    withTransaction,
    initDb,
    checkDatabaseConfig
  };
