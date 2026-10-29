import { getPool, closePool, checkDatabaseConfig } from '../src/db/db.js';

async function inspectDb() {
  try {
    checkDatabaseConfig();
    const pool = getPool();

    console.log('='.repeat(70));
    console.log('DATABASE INSPECTION: PostgreSQL');
    console.log('='.repeat(70));

    // 1. Row counts of each table
    const [agentCount, ticketCount, entryCount, eventCount] = await Promise.all([
      pool.query('SELECT COUNT(*) as c FROM agents'),
      pool.query('SELECT COUNT(*) as c FROM tickets'),
      pool.query('SELECT COUNT(*) as c FROM ticket_entries'),
      pool.query('SELECT COUNT(*) as c FROM ticket_events')
    ]);

    const counts = [
      { table: 'agents', count: parseInt(agentCount.rows[0].c, 10) },
      { table: 'tickets', count: parseInt(ticketCount.rows[0].c, 10) },
      { table: 'ticket_entries', count: parseInt(entryCount.rows[0].c, 10) },
      { table: 'ticket_events', count: parseInt(eventCount.rows[0].c, 10) }
    ];
    console.log('\n--- 1. TABLE ROW COUNTS ---');
    console.table(counts);

    // 2. All agents
    console.log('\n--- 2. ALL AGENTS ---');
    const agents = await pool.query('SELECT id, name, email FROM agents ORDER BY id ASC');
    console.table(agents.rows);

    // 3. All tickets
    console.log('\n--- 3. ALL TICKETS ---');
    const tickets = await pool.query(`
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
    `);
    console.table(tickets.rows);

    // 4. 15 most recent ticket_events
    console.log('\n--- 4. 15 MOST RECENT TICKET EVENTS ---');
    const events = await pool.query(`
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
    `);
    console.table(events.rows);

    // 5. 10 most recent ticket_entries
    console.log('\n--- 5. 10 MOST RECENT TICKET ENTRIES ---');
    const rawEntries = await pool.query(`
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
    `);

    const entries = rawEntries.rows.map((e) => ({
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
  } catch (err) {
    console.error('[Inspect DB Error]', err.message || err);
    process.exit(1);
  } finally {
    await closePool();
  }
}

inspectDb();
