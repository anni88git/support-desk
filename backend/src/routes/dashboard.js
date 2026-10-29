import { Router } from 'express';
import { getDb } from '../db/db.js';

const router = Router();

router.get('/', (req, res, next) => {
  try {
    const db = req.app.locals.db || getDb();
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const row = db.prepare(`
      SELECT
        COUNT(*) AS total,
        COALESCE(SUM(CASE WHEN status = 'Open' THEN 1 ELSE 0 END), 0) AS open,
        COALESCE(SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END), 0) AS in_progress,
        COALESCE(SUM(CASE WHEN status = 'Resolved' THEN 1 ELSE 0 END), 0) AS resolved,
        COALESCE(SUM(CASE WHEN priority = 'Urgent' AND status != 'Resolved' THEN 1 ELSE 0 END), 0) AS urgent,
        COALESCE(SUM(CASE WHEN status != 'Resolved' AND created_at < ? THEN 1 ELSE 0 END), 0) AS overdue
      FROM tickets
    `).get(cutoff);

    res.json({
      total: Number(row.total || 0),
      open: Number(row.open || 0),
      in_progress: Number(row.in_progress || 0),
      resolved: Number(row.resolved || 0),
      urgent: Number(row.urgent || 0),
      overdue: Number(row.overdue || 0)
    });
  } catch (err) {
    next(err);
  }
});

export default router;
