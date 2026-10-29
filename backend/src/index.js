import app from './app.js';
import { getDb } from './db/db.js';
import { seed } from './db/seed.js';

const PORT = process.env.PORT || 4000;

try {
  const db = getDb();
  seed(db);

  app.listen(PORT, () => {
    console.log(`Support Desk Backend is running on http://localhost:${PORT}`);
    console.log(`- Agents: http://localhost:${PORT}/api/agents`);
    console.log(`- Dashboard: http://localhost:${PORT}/api/dashboard`);
  });
} catch (err) {
  console.error('Failed to start server:', err);
  process.exit(1);
}
