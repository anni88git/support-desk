import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import { newDb } from 'pg-mem';
import { createApp } from '../src/app.js';
import { seed } from '../src/db/seed.js';

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const schemaSql = fs.readFileSync(path.resolve(__dirname, '../src/db/schema.sql'), 'utf8');

  const TEST_DB_URL = process.env.TEST_DATABASE_URL;

  async function createTestDb() {
    if (TEST_DB_URL) {
      const isLocalhost = TEST_DB_URL.includes('localhost') || TEST_DB_URL.includes('127.0.0.1');
      const pool = new pg.Pool({
        connectionString: TEST_DB_URL,
        ssl: isLocalhost ? false : { rejectUnauthorized: false }
      });
      await pool.query('DROP TABLE IF EXISTS ticket_events, ticket_entries, tickets, agents CASCADE;');
      await pool.query(schemaSql);
      return pool;
    }

    // Pure in-memory Postgres fallback via pg-mem
    const mem = newDb();
    mem.public.registerFunction({
      name: 'pg_get_serial_sequence',
      args: ['text', 'text'],
      returns: 'text',
      implementation: (tbl, col) => `${tbl}_${col}_seq`
    });
    mem.public.none(schemaSql);
    const pool = new (mem.adapters.createPg().Pool)();
    return pool;
  }

  describe('Support Desk Backend API Tests (PostgreSQL)', () => {
    let db;
    let app;

      beforeEach(async () => {
        db = await createTestDb();
        await seed(db);
        app = createApp(db);
      });

          afterEach(async () => {
            if (db && typeof db.end === 'function') {
              await db.end();
            }
          });

          // 1. Create ticket success (201) and missing-field 400
          it('creates ticket successfully (201) and logs created event', async () => {
            const res = await request(app)
              .post('/api/tickets')
              .send({
                subject: 'Database latency spike',
                customer: 'ops@acme.com',
                description: 'Read replica replication lag exceeded 15 seconds.',
                priority: 'High',
                assignee_id: 1
              });

            assert.equal(res.status, 201);
            assert.ok(res.body.id);
            assert.equal(res.body.subject, 'Database latency spike');
            assert.equal(res.body.status, 'Open');
            assert.equal(res.body.priority, 'High');
            assert.equal(res.body.assignee_name, 'Alice Walker');
            assert.equal(res.body.is_overdue, false);
            assert.equal(res.body.events.length, 1);
            assert.equal(res.body.events[0].type, 'created');
          });

          it('rejects create ticket with 400 when required fields are missing', async () => {
            const res = await request(app)
              .post('/api/tickets')
              .send({
                subject: '   ',
                customer: '',
                description: ''
              });

            assert.equal(res.status, 400);
            assert.equal(res.body.error, 'Validation failed');
            assert.ok(res.body.details);
            assert.ok(res.body.details.subject);
            assert.ok(res.body.details.customer);
            assert.ok(res.body.details.description);
          });

          // 2. Invalid status/priority rejected (400)
          it('rejects invalid priority and status with 400', async () => {
            const invalidPriority = await request(app)
              .post('/api/tickets')
              .send({
                subject: 'Valid subject',
                customer: 'customer@example.com',
                description: 'Valid description',
                priority: 'ExtremeUrgent'
              });
            assert.equal(invalidPriority.status, 400);
            assert.ok(invalidPriority.body.details.priority);

            const invalidStatus = await request(app)
              .patch('/api/tickets/1')
              .send({ status: 'Archived' });
            assert.equal(invalidStatus.status, 400);
            assert.ok(invalidStatus.body.details.status);
          });

          // 3. PATCH status/priority/assignee creates correct events; no event when unchanged
          it('PATCH creates events ONLY for changed fields', async () => {
            const res = await request(app)
              .patch('/api/tickets/1')
              .send({
                status: 'In Progress',
                priority: 'High',
                assignee_id: 2
              });

            assert.equal(res.status, 200);
            assert.equal(res.body.status, 'In Progress');
            assert.equal(res.body.priority, 'High');
            assert.equal(res.body.assignee_name, 'Bob Smith');

            const statusEv = res.body.events.find((e) => e.type === 'status_changed');
            assert.ok(statusEv);
            assert.equal(statusEv.old_value, 'Open');
            assert.equal(statusEv.new_value, 'In Progress');

            const priorityEv = res.body.events.find((e) => e.type === 'priority_changed');
            assert.ok(priorityEv);
            assert.equal(priorityEv.old_value, 'Urgent');
            assert.equal(priorityEv.new_value, 'High');

            const assigneeEv = res.body.events.find((e) => e.type === 'assignee_changed');
            assert.ok(assigneeEv);
            assert.equal(assigneeEv.old_value, 'Alice Walker');
            assert.equal(assigneeEv.new_value, 'Bob Smith');
          });

          it('PATCH does not create events when values are unchanged', async () => {
            const initial = await request(app).get('/api/tickets/1');
            const initialEventCount = initial.body.events.length;

            const res = await request(app)
              .patch('/api/tickets/1')
              .send({
                status: 'Open',
                priority: 'Urgent',
                assignee_id: 1
              });

            assert.equal(res.status, 200);
            assert.equal(res.body.events.length, initialEventCount);
          });

          // 4. Overdue: ticket older than 24h is overdue; Resolved ticket is not
          it('computes is_overdue true for non-resolved tickets older than 24 hours', async () => {
            // Ticket 1 is seeded with created_at 30h ago and status Open
            const res = await request(app).get('/api/tickets/1');
            assert.equal(res.status, 200);
            assert.equal(res.body.status, 'Open');
            assert.equal(res.body.is_overdue, true);
          });

          it('computes is_overdue false for Resolved tickets even if older than 24 hours', async () => {
            // Ticket 4 is seeded with created_at 72h ago but status Resolved
            const res = await request(app).get('/api/tickets/4');
            assert.equal(res.status, 200);
            assert.equal(res.body.status, 'Resolved');
            assert.equal(res.body.is_overdue, false);
          });

          // 5. Resolving a ticket drops it from dashboard open/in-progress/overdue counts
          it('resolving a ticket drops it from dashboard open/in-progress/overdue counts', async () => {
            const before = await request(app).get('/api/dashboard');
            assert.equal(before.body.open, 5);
            assert.equal(before.body.overdue, 4);
            assert.equal(before.body.resolved, 2);

            // Resolve Ticket 1 (which was Open and Overdue)
            const patchRes = await request(app)
              .patch('/api/tickets/1')
              .send({ status: 'Resolved' });

            assert.equal(patchRes.status, 200);
            assert.notEqual(patchRes.body.resolved_at, null);
            assert.equal(patchRes.body.is_overdue, false);

            const after = await request(app).get('/api/dashboard');
            assert.equal(after.body.open, before.body.open - 1);
            assert.equal(after.body.overdue, before.body.overdue - 1);
            assert.equal(after.body.resolved, before.body.resolved + 1);
          });

          // 6. Reply vs note stored with correct type; entry bumps updated_at
          it('stores reply vs note with correct type and logs entry events', async () => {
            const replyRes = await request(app)
              .post('/api/tickets/1/entries')
              .send({
                type: 'reply',
                content: 'Customer visible reply message',
                author_id: 2
              });
            assert.equal(replyRes.status, 201);
            assert.equal(replyRes.body.type, 'reply');
            assert.equal(replyRes.body.author_name, 'Bob Smith');

            const noteRes = await request(app)
              .post('/api/tickets/1/entries')
              .send({
                type: 'note',
                content: 'Internal team note only',
                author_id: 1
              });
            assert.equal(noteRes.status, 201);
            assert.equal(noteRes.body.type, 'note');
            assert.equal(noteRes.body.author_name, 'Alice Walker');

            const ticketRes = await request(app).get('/api/tickets/1');
            const eventTypes = ticketRes.body.events.map((e) => e.type);
            assert.ok(eventTypes.includes('reply_added'));
            assert.ok(eventTypes.includes('note_added'));
          });

          it('bumps ticket updated_at when a new entry is added', async () => {
            const before = await request(app).get('/api/tickets/1');
            const oldUpdatedAt = before.body.updated_at;

            await new Promise((resolve) => setTimeout(resolve, 50));

            await request(app)
              .post('/api/tickets/1/entries')
              .send({
                type: 'reply',
                content: 'Bumping ticket updated timestamp',
                author_id: 1
              });

            const after = await request(app).get('/api/tickets/1');
            assert.ok(
              new Date(after.body.updated_at).getTime() > new Date(oldUpdatedAt).getTime()
            );
          });

          // 7. Filters combine (status + priority + search)
          it('combines filters (status + priority + search) with AND logic', async () => {
            const res = await request(app).get(
              '/api/tickets?status=Open&priority=Urgent&search=Stripe'
            );
            assert.equal(res.status, 200);
            assert.equal(res.body.length, 1);
            assert.equal(res.body[0].id, 1);

            const emptyRes = await request(app).get(
              '/api/tickets?status=Resolved&priority=Urgent&search=Stripe'
            );
            assert.equal(emptyRes.status, 200);
            assert.equal(emptyRes.body.length, 0);
          });

          // 8. Priority sort order
          it('sorts tickets by priority (Urgent > High > Medium > Low)', async () => {
            const res = await request(app).get('/api/tickets?sort=priority');
            assert.equal(res.status, 200);

            const weights = { Urgent: 4, High: 3, Medium: 2, Low: 1 };
            const priorities = res.body.map((t) => t.priority);

            for (let i = 0; i < priorities.length - 1; i++) {
              assert.ok(weights[priorities[i]] >= weights[priorities[i + 1]]);
            }
          });

          // 9. Assignee filter (including unassigned)
          it('filters tickets by assignee and supports unassigned filter', async () => {
            const unassignedRes = await request(app).get('/api/tickets?assignee=unassigned');
            assert.equal(unassignedRes.status, 200);
            assert.ok(unassignedRes.body.length > 0);
            assert.ok(unassignedRes.body.every((t) => t.assignee_id === null));

            const agent1Res = await request(app).get('/api/tickets?assignee=1');
            assert.equal(agent1Res.status, 200);
            assert.ok(agent1Res.body.length > 0);
            assert.ok(agent1Res.body.every((t) => t.assignee_id === 1));
          });

          // 10. 404 for a missing ticket
          it('returns 404 for missing ticket on GET, PATCH, and POST entries', async () => {
            const getRes = await request(app).get('/api/tickets/99999');
            assert.equal(getRes.status, 404);
            assert.ok(getRes.body.error.includes('99999'));

            const patchRes = await request(app)
              .patch('/api/tickets/99999')
              .send({ status: 'Resolved' });
            assert.equal(patchRes.status, 404);

            const entryRes = await request(app)
              .post('/api/tickets/99999/entries')
              .send({ type: 'reply', content: 'hello', author_id: 1 });
            assert.equal(entryRes.status, 404);
          });

          // 11. Dashboard counts match actual data
          it('computes accurate dashboard counts matching database reality', async () => {
            const res = await request(app).get('/api/dashboard');
            assert.equal(res.status, 200);
            assert.deepEqual(res.body, {
              total: 12,
              open: 5,
              in_progress: 3,
              resolved: 2,
              urgent: 3,
              overdue: 4
            });
          });

          // 12. Delete ticket: success (204), entries and events removed, 404 on subsequent GET, dashboard total drops
          it('deletes ticket successfully (204) and removes related entries and events', async () => {
            // Ticket 2 has entries (id 1, 2) and events in seed data
            const entriesBeforeRes = await db.query('SELECT COUNT(*) as c FROM ticket_entries WHERE ticket_id = 2');
            const eventsBeforeRes = await db.query('SELECT COUNT(*) as c FROM ticket_events WHERE ticket_id = 2');
            const entriesBefore = parseInt(entriesBeforeRes.rows[0].c, 10);
            const eventsBefore = parseInt(eventsBeforeRes.rows[0].c, 10);
            assert.ok(entriesBefore > 0);
            assert.ok(eventsBefore > 0);

            const deleteRes = await request(app).delete('/api/tickets/2');
            assert.equal(deleteRes.status, 204);

            // Subsequent GET returns 404
            const getRes = await request(app).get('/api/tickets/2');
            assert.equal(getRes.status, 404);

            // Related entries and events are completely gone
            const entriesAfterRes = await db.query('SELECT COUNT(*) as c FROM ticket_entries WHERE ticket_id = 2');
            const eventsAfterRes = await db.query('SELECT COUNT(*) as c FROM ticket_events WHERE ticket_id = 2');
            const entriesAfter = parseInt(entriesAfterRes.rows[0].c, 10);
            const eventsAfter = parseInt(eventsAfterRes.rows[0].c, 10);
            assert.equal(entriesAfter, 0);
            assert.equal(eventsAfter, 0);
          });

          it('returns 404 when attempting to delete a missing ticket', async () => {
            const res = await request(app).delete('/api/tickets/99999');
            assert.equal(res.status, 404);
          });

          it('returns 400 when attempting to delete with an invalid ticket id', async () => {
            const res = await request(app).delete('/api/tickets/invalid-id');
            assert.equal(res.status, 400);
          });

          it('deleting a ticket drops dashboard total count by 1', async () => {
            const before = await request(app).get('/api/dashboard');
            assert.equal(before.body.total, 12);

            const deleteRes = await request(app).delete('/api/tickets/1');
            assert.equal(deleteRes.status, 204);

            const after = await request(app).get('/api/dashboard');
            assert.equal(after.body.total, 11);
          });
        });
