import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Check if better-sqlite3 native binary actually exists
const possibleBindingPaths = [
  path.resolve(__dirname, '../../node_modules/better-sqlite3/build/Release/better_sqlite3.node'),
  path.resolve(__dirname, '../../node_modules/better-sqlite3/Release/better_sqlite3.node')
];
const bindingExists = possibleBindingPaths.some(p => fs.existsSync(p));

let DriverClass;
let isNodeSqlite = false;

if (bindingExists) {
  try {
    DriverClass = require('better-sqlite3');
  } catch (e) {
    const { DatabaseSync } = require('node:sqlite');
    DriverClass = DatabaseSync;
    isNodeSqlite = true;
  }
} else {
  // Built-in SQLite (Node 22+ / 24+), zero-dependency, ultra-fast & native
  const { DatabaseSync } = require('node:sqlite');
  DriverClass = DatabaseSync;
  isNodeSqlite = true;
}

function adaptDatabase(rawDb) {
  if (!isNodeSqlite) {
    rawDb.pragma('foreign_keys = ON');
    return rawDb;
  }

  // Adapter for node:sqlite DatabaseSync to match better-sqlite3 API
  rawDb.exec('PRAGMA foreign_keys = ON;');

  const originalPrepare = rawDb.prepare.bind(rawDb);
  const originalExec = rawDb.exec.bind(rawDb);

  const wrapper = {
    prepare(sql) {
      const stmt = originalPrepare(sql);
      return {
        run(...args) {
          if (args.length === 1 && typeof args[0] === 'object' && args[0] !== null && !Array.isArray(args[0])) {
            const obj = {};
            for (const [k, v] of Object.entries(args[0])) {
              obj[k] = v === undefined ? null : v;
            }
            return stmt.run(obj);
          }
          const cleanArgs = args.map(a => (a === undefined ? null : a));
          return stmt.run(...cleanArgs);
        },
        get(...args) {
          if (args.length === 1 && typeof args[0] === 'object' && args[0] !== null && !Array.isArray(args[0])) {
            const obj = {};
            for (const [k, v] of Object.entries(args[0])) {
              obj[k] = v === undefined ? null : v;
            }
            return stmt.get(obj);
          }
          const cleanArgs = args.map(a => (a === undefined ? null : a));
          return stmt.get(...cleanArgs);
        },
        all(...args) {
          if (args.length === 1 && typeof args[0] === 'object' && args[0] !== null && !Array.isArray(args[0])) {
            const obj = {};
            for (const [k, v] of Object.entries(args[0])) {
              obj[k] = v === undefined ? null : v;
            }
            return stmt.all(obj);
          }
          const cleanArgs = args.map(a => (a === undefined ? null : a));
          return stmt.all(...cleanArgs);
        }
      };
    },
    exec(sql) {
      return originalExec(sql);
    },
    pragma(pragmaStr) {
      return originalExec(`PRAGMA ${pragmaStr};`);
    },
    transaction(fn) {
      return function (...args) {
        originalExec('BEGIN');
        try {
          const result = fn(...args);
          originalExec('COMMIT');
          return result;
        } catch (err) {
          originalExec('ROLLBACK');
          throw err;
        }
      };
    },
    close() {
      return rawDb.close();
    }
  };

  return wrapper;
}

let defaultDb = null;

export function getDb(dbPath = process.env.DB_PATH) {
  if (defaultDb && !dbPath) {
    return defaultDb;
  }

  const targetPath = dbPath || path.resolve(__dirname, '../../support_desk.db');
  const raw = new DriverClass(targetPath);
  const db = adaptDatabase(raw);

  const schemaPath = path.resolve(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  db.exec(schema);

  if (!dbPath) {
    defaultDb = db;
  }
  return db;
}

export function createInMemoryDb() {
  const raw = new DriverClass(':memory:');
  const db = adaptDatabase(raw);

  const schemaPath = path.resolve(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  db.exec(schema);
  return db;
}

export function closeDb() {
  if (defaultDb) {
    defaultDb.close();
    defaultDb = null;
  }
}
