import { Router } from 'express';
import { getPool } from '../db/db.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const db = req.app.locals.db || getPool();
    const result = await db.query('SELECT id, name, email FROM agents ORDER BY name ASC');
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

export default router;
