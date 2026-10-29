import app from './app.js';
import { getPool, initDb, checkDatabaseConfig } from './db/db.js';
import { seed } from './db/seed.js';

const PORT = process.env.PORT || 4000;

async function startServer() {
  try {
    checkDatabaseConfig();
    const pool = getPool();

    console.log('[Database] Applying PostgreSQL schema...');
    await initDb(pool);

    console.log('[Database] Running seed check...');
    await seed(pool);

    app.listen(PORT, () => {
      console.log(`Support Desk Backend is running on http://localhost:${PORT}`);
      console.log(`- Agents: http://localhost:${PORT}/api/agents`);
      console.log(`- Dashboard: http://localhost:${PORT}/api/dashboard`);
    });
  } catch (err) {
    console.error('Failed to start server:', err.message || err);
    process.exit(1);
  }
}

startServer();
