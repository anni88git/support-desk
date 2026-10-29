import { Router } from 'express';
import { getDb } from '../db/db.js';

const router = Router();

router.get('/', (req, res, next) => {
  try {
    const db = req.app.locals.db || getDb();
    const agents = db.prepare('SELECT id, name, email FROM agents ORDER BY name ASC').all();
    res.json(agents);
  } catch (err) {
    next(err);
  }
});

export default router;
