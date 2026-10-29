import { getPool, withTransaction } from './db.js';

export async function seed(db = getPool()) {
  const existingTickets = await db.query('SELECT COUNT(*) as count FROM tickets');
  const count = parseInt(existingTickets.rows[0].count, 10);
  if (count > 0) {
    console.log('[Seed] Tickets table already populated. Skipping seed.');
    return;
  }

  console.log('[Seed] Seeding agents and tickets...');

  const agents = [
    [1, 'Alice Walker', 'alice@supportdesk.local'],
    [2, 'Bob Smith', 'bob@supportdesk.local'],
    [3, 'Charlie Kim', 'charlie@supportdesk.local'],
    [4, 'Diana Prince', 'diana@supportdesk.local']
  ];

  const now = Date.now();
  const hoursAgo = (h) => new Date(now - h * 60 * 60 * 1000).toISOString();

  const tickets = [
    {
      id: 1,
      subject: 'Critical billing failure on Stripe recurring payments',
      customer: 'Finance Director (stripe-billing@acme.corp)',
      description: 'Subscriptions are failing to renew since yesterday morning with webhook timeouts.',
      priority: 'Urgent',
      status: 'Open',
      assignee_id: 1,
      created_at: hoursAgo(30), // Overdue (>24h)
      updated_at: hoursAgo(30),
      resolved_at: null
    },
    {
      id: 2,
      subject: 'Mobile checkout crashing on iOS 18 devices',
      customer: 'Elena Rostova (elena@retailhub.io)',
      description: 'Customers on iOS 18 experience an unhandled JavaScript exception during Apple Pay tokenization.',
      priority: 'High',
      status: 'In Progress',
      assignee_id: 2,
      created_at: hoursAgo(48), // Overdue (>24h)
      updated_at: hoursAgo(10),
      resolved_at: null
    },
    {
      id: 3,
      subject: 'Single Sign-On SAML metadata certificate mismatch',
      customer: 'Security Admin (it-ops@globallogistics.com)',
      description: 'Identity Provider returns InvalidAssertionSignature after our annual Okta cert rotation.',
      priority: 'Medium',
      status: 'Waiting on Customer',
      assignee_id: 3,
      created_at: hoursAgo(36), // Overdue (>24h)
      updated_at: hoursAgo(6),
      resolved_at: null
    },
    {
      id: 4,
      subject: 'Custom domain SSL renewal failed for app.client.com',
      customer: 'DevOps Lead (devops@client.com)',
      description: "Let's Encrypt challenge failed due to CAA record blocking issuance.",
      priority: 'High',
      status: 'Resolved',
      assignee_id: 4,
      created_at: hoursAgo(72), // Created >24h ago but Resolved -> NOT overdue
      updated_at: hoursAgo(8),
      resolved_at: hoursAgo(8)
    },
    {
      id: 5,
      subject: 'Database connection pool exhausted during traffic spike',
      customer: 'Infrastructure Alert (pager@alerts.internal)',
      description: 'PgBouncer connection limits reached 98% utilization during marketing flash campaign.',
      priority: 'Urgent',
      status: 'In Progress',
      assignee_id: 1,
      created_at: hoursAgo(2), // <24h -> Not overdue
      updated_at: hoursAgo(1),
      resolved_at: null
    },
    {
      id: 6,
      subject: 'Typo in invoices PDF export header footer',
      customer: 'Accounts Manager (accounts@partner.de)',
      description: 'The VAT identification string is misspelled as "VTA ID" on page 2 footer.',
      priority: 'Low',
      status: 'Open',
      assignee_id: null,
      created_at: hoursAgo(5),
      updated_at: hoursAgo(5),
      resolved_at: null
    },
    {
      id: 7,
      subject: 'Webhook retries causing duplicate event payloads',
      customer: 'API Integrator (dev@ecommerce-plus.net)',
      description: 'Receiving idempotency-key collisions when our endpoint responds with HTTP 504 gateway timeout.',
      priority: 'Medium',
      status: 'Open',
      assignee_id: 3,
      created_at: hoursAgo(3),
      updated_at: hoursAgo(3),
      resolved_at: null
    },
    {
      id: 8,
      subject: 'Export to CSV truncating UTF-8 Japanese characters',
      customer: 'Tokyo Operations (ops-jp@tokyotrade.jp)',
      description: 'Customer names containing Kanji are replaced with question marks in generated CSV reports.',
      priority: 'High',
      status: 'In Progress',
      assignee_id: 2,
      created_at: hoursAgo(12),
      updated_at: hoursAgo(7),
      resolved_at: null
    },
    {
      id: 9,
      subject: 'Two-factor SMS verification codes delayed by carrier',
      customer: 'User Support (support@fintech-safe.com)',
      description: 'Users with UK (+44) numbers report OTP messages arriving 15 minutes after request.',
      priority: 'Medium',
      status: 'Waiting on Customer',
      assignee_id: null,
      created_at: hoursAgo(4),
      updated_at: hoursAgo(2),
      resolved_at: null
    },
    {
      id: 10,
      subject: 'Dark mode contrast issue on ticket activity timeline',
      customer: 'Marcus Vance (marcus.v@uxdesigners.org)',
      description: 'Timestamp text color has insufficient WCAG AA contrast ratio against dark backgrounds.',
      priority: 'Low',
      status: 'Resolved',
      assignee_id: 4,
      created_at: hoursAgo(50),
      updated_at: hoursAgo(20),
      resolved_at: hoursAgo(20)
    },
    {
      id: 11,
      subject: 'Rate limiter blocking legitimate automated web scraper',
      customer: 'Data Partner (integrations@marketpulse.ai)',
      description: 'API returns HTTP 429 even though request volume is within contracted tier quota.',
      priority: 'Urgent',
      status: 'Open',
      assignee_id: null, // Overdue (>24h)
      created_at: hoursAgo(40),
      updated_at: hoursAgo(40),
      resolved_at: null
    },
    {
      id: 12,
      subject: 'Add webhook signature header documentation',
      customer: 'Developer Relations (devrel@developerportal.io)',
      description: 'Developers need HMAC-SHA256 verification code snippets in Python and Node.js.',
      priority: 'Low',
      status: 'Open',
      assignee_id: 1,
      created_at: hoursAgo(18),
      updated_at: hoursAgo(18),
      resolved_at: null
    }
  ];

  await withTransaction(db, async (client) => {
    // 1. Insert agents
    for (const [id, name, email] of agents) {
      await client.query(
        `INSERT INTO agents (id, name, email) VALUES ($1, $2, $3)
         ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email`,
        [id, name, email]
      );
    }

    // 2. Insert tickets and initial created events
    for (const t of tickets) {
      await client.query(
        `INSERT INTO tickets (id, subject, customer, description, priority, status, assignee_id, created_at, updated_at, resolved_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (id) DO NOTHING`,
        [t.id, t.subject, t.customer, t.description, t.priority, t.status, t.assignee_id, t.created_at, t.updated_at, t.resolved_at]
      );

      await client.query(
        `INSERT INTO ticket_events (ticket_id, type, old_value, new_value, actor_id, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [t.id, 'created', null, `Created ticket #${t.id} with priority ${t.priority}`, t.assignee_id || 1, t.created_at]
      );
    }

    // 3. Ticket 2: entries and events
    await client.query(
      `INSERT INTO ticket_events (ticket_id, type, old_value, new_value, actor_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [2, 'status_changed', 'Open', 'In Progress', 2, hoursAgo(24)]
    );
    await client.query(
      `INSERT INTO ticket_entries (ticket_id, type, content, author_id, created_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [2, 'note', 'Customer is an Enterprise Tier client with 50k DAU. Escalated to mobile core team.', 1, hoursAgo(20)]
    );
    await client.query(
      `INSERT INTO ticket_events (ticket_id, type, old_value, new_value, actor_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [2, 'note_added', null, 'Internal note added by Alice Walker', 1, hoursAgo(20)]
    );
    await client.query(
      `INSERT INTO ticket_entries (ticket_id, type, content, author_id, created_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [2, 'reply', 'Hi Elena, we have reproduced the issue on iOS 18.0.1. A hotfix build is currently in review.', 2, hoursAgo(10)]
    );
    await client.query(
      `INSERT INTO ticket_events (ticket_id, type, old_value, new_value, actor_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [2, 'reply_added', null, 'Public reply sent to customer', 2, hoursAgo(10)]
    );

    // 4. Ticket 3: reply and event
    await client.query(
      `INSERT INTO ticket_entries (ticket_id, type, content, author_id, created_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [3, 'reply', 'Hello, could you please re-upload your updated IdP XML metadata via the Admin Portal > SSO settings?', 3, hoursAgo(6)]
    );
    await client.query(
      `INSERT INTO ticket_events (ticket_id, type, old_value, new_value, actor_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [3, 'reply_added', null, 'Public reply sent to customer', 3, hoursAgo(6)]
    );
    await client.query(
      `INSERT INTO ticket_events (ticket_id, type, old_value, new_value, actor_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [3, 'status_changed', 'Open', 'Waiting on Customer', 3, hoursAgo(6)]
    );

    // 5. Ticket 4: resolved flow
    await client.query(
      `INSERT INTO ticket_events (ticket_id, type, old_value, new_value, actor_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [4, 'assignee_changed', 'Unassigned', 'Diana Prince', 4, hoursAgo(40)]
    );
    await client.query(
      `INSERT INTO ticket_entries (ticket_id, type, content, author_id, created_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [4, 'reply', 'CAA records have been corrected and SSL certificate successfully provisioned and verified.', 4, hoursAgo(8)]
    );
    await client.query(
      `INSERT INTO ticket_events (ticket_id, type, old_value, new_value, actor_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [4, 'reply_added', null, 'Public reply sent to customer', 4, hoursAgo(8)]
    );
    await client.query(
      `INSERT INTO ticket_events (ticket_id, type, old_value, new_value, actor_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [4, 'status_changed', 'In Progress', 'Resolved', 4, hoursAgo(8)]
    );

    // 6. Reset Postgres sequences so subsequent auto-generated IDs do not collide
    try {
      await client.query("SELECT setval(pg_get_serial_sequence('agents', 'id'), coalesce(max(id), 1)) FROM agents");
      await client.query("SELECT setval(pg_get_serial_sequence('tickets', 'id'), coalesce(max(id), 1)) FROM tickets");
      await client.query("SELECT setval(pg_get_serial_sequence('ticket_entries', 'id'), coalesce(max(id), 1)) FROM ticket_entries");
      await client.query("SELECT setval(pg_get_serial_sequence('ticket_events', 'id'), coalesce(max(id), 1)) FROM ticket_events");
    } catch (seqErr) {
      // In case of mock / in-memory DB without serial sequences
    }
  });

  console.log(`[Seed] Seeded ${agents.length} agents and ${tickets.length} tickets successfully.`);
}

// Allow direct execution
if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  seed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[Seed Error]', err);
      process.exit(1);
    });
}
