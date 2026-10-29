import { Router } from 'express';
import { getDb } from '../db/db.js';
import { ticketService } from '../services/ticketService.js';

const router = Router();

function getDatabase(req) {
  return req.app.locals.db || getDb();
}

// GET /api/tickets - List tickets with filtering, search, and sorting
router.get('/', (req, res, next) => {
  try {
    const db = getDatabase(req);
    const tickets = ticketService.listTickets(db, req.query);
    res.json(tickets);
  } catch (err) {
    next(err);
  }
});

// POST /api/tickets - Create a new ticket (201)
router.post('/', (req, res, next) => {
  try {
    const db = getDatabase(req);
    const ticket = ticketService.createTicket(db, req.body);
    res.status(201).json(ticket);
  } catch (err) {
    next(err);
  }
});

// GET /api/tickets/:id - Get ticket details with entries and events (404 if not found)
router.get('/:id', (req, res, next) => {
  try {
    const db = getDatabase(req);
    const ticket = ticketService.getTicketById(db, req.params.id);
    res.json(ticket);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/tickets/:id - Update ticket fields and log events for changed fields
router.patch('/:id', (req, res, next) => {
  try {
    const db = getDatabase(req);
    const updated = ticketService.updateTicket(db, req.params.id, req.body);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// POST /api/tickets/:id/entries - Add reply or note to ticket (201)
router.post('/:id/entries', (req, res, next) => {
  try {
    const db = getDatabase(req);
    const entry = ticketService.createTicketEntry(db, req.params.id, req.body);
    res.status(201).json(entry);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/tickets/:id - Delete ticket, entries, and events (204)
router.delete('/:id', (req, res, next) => {
  try {
    const db = getDatabase(req);
    ticketService.deleteTicket(db, req.params.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
