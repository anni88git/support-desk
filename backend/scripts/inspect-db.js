import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = process.env.DB_PATH || path.resolve(__dirname, '../support_desk.db');

if (!fs.existsSync(dbPath)) {
  console.error(`Database file not found at: ${dbPath}`);
  process.exit(1);
}

// Open database in read-only mode
const db = new DatabaseSync(dbPath, { readOnly: true });

console.log('='.repeat(70));
console.log(`DATABASE INSPECTION: ${dbPath}`);
console.log('='.repeat(70));

// 1. Row counts of each table
const counts = [
  { table: 'agents', count: db.prepare('SELECT COUNT(*) as c FROM agents').get().c },
  { table: 'tickets', count: db.prepare('SELECT COUNT(*) as c FROM tickets').get().c },
  { table: 'ticket_entries', count: db.prepare('SELECT COUNT(*) as c FROM ticket_entries').get().c },
  { table: 'ticket_events', count: db.prepare('SELECT COUNT(*) as c FROM ticket_events').get().c }
];
console.log('\n--- 1. TABLE ROW COUNTS ---');
console.table(counts);

// 2. All agents
console.log('\n--- 2. ALL AGENTS ---');
const agents = db.prepare('SELECT id, name, email FROM agents ORDER BY id ASC').all();
console.table(agents);

// 3. All tickets
console.log('\n--- 3. ALL TICKETS ---');
const tickets = db.prepare(`
  SELECT
    id,
    subject,
    customer,
    status,
    priority,
    assignee_id,
    created_at,
    updated_at,
    resolved_at
  FROM tickets
  ORDER BY id ASC
`).all();
console.table(tickets);

// 4. 15 most recent ticket_events
console.log('\n--- 4. 15 MOST RECENT TICKET EVENTS ---');
const events = db.prepare(`
  SELECT
    id,
    ticket_id,
    type,
    old_value,
    new_value,
    actor_id,
    created_at
  FROM ticket_events
  ORDER BY id DESC
  LIMIT 15
`).all();
console.table(events);

// 5. 10 most recent ticket_entries
console.log('\n--- 5. 10 MOST RECENT TICKET ENTRIES ---');
const rawEntries = db.prepare(`
  SELECT
    id,
    ticket_id,
    type,
    author_id,
    created_at,
    content
  FROM ticket_entries
  ORDER BY id DESC
  LIMIT 10
`).all();

const entries = rawEntries.map(e => ({
  id: e.id,
  ticket_id: e.ticket_id,
  type: e.type,
  author_id: e.author_id,
  created_at: e.created_at,
  content_preview: e.content.length > 40 ? e.content.slice(0, 40) + '...' : e.content
}));
console.table(entries);

console.log('\n' + '='.repeat(70));
console.log('Inspection complete.');
console.log('='.repeat(70));

db.close();
