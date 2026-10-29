import { newDb } from 'pg-mem';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { seed } from './src/db/seed.js';
import { ticketService } from './src/services/ticketService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testFull() {
  const mem = newDb();
  
  mem.public.registerFunction({
    name: 'pg_get_serial_sequence',
    args: ['text', 'text'],
    returns: 'text',
    implementation: (tbl, col) => `${tbl}_${col}_seq`
  });

  const schema = fs.readFileSync(path.resolve(__dirname, 'src/db/schema.sql'), 'utf8');
  mem.public.none(schema);

  const pool = new (mem.adapters.createPg().Pool)();
  await seed(pool);

  console.log('Seed executed!');
  const tickets = await ticketService.listTickets(pool);
  console.log('Tickets count:', tickets.length);
  console.log('Ticket 1:', tickets[0].id, tickets[0].subject, 'overdue:', tickets[0].is_overdue);

  const t1 = await ticketService.getTicketById(pool, 1);
  console.log('Ticket 1 entries:', t1.entries.length, 'events:', t1.events.length);
}

testFull().catch(console.error);
