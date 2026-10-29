import { getDb } from './db.js';

export function seed(db) {
  const existingTickets = db.prepare('SELECT COUNT(*) as count FROM tickets').get();
  if (existingTickets.count > 0) {
    console.log('[Seed] Tickets table already populated. Skipping seed.');
    return;
  }

  console.log('[Seed] Seeding agents and tickets...');

  const insertAgent = db.prepare('INSERT OR IGNORE INTO agents (id, name, email) VALUES (?, ?, ?)');
  const agents = [
    [1, 'Alice Walker', 'alice@supportdesk.local'],
    [2, 'Bob Smith', 'bob@supportdesk.local'],
    [3, 'Charlie Kim', 'charlie@supportdesk.local'],
    [4, 'Diana Prince', 'diana@supportdesk.local']
  ];

  const insertAgentsTx = db.transaction(() => {
    for (const [id, name, email] of agents) {
      insertAgent.run(id, name, email);
    }
  });
  insertAgentsTx();

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
      assignee_id: 1, // Alice Walker
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
      assignee_id: 2, // Bob Smith
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
      assignee_id: 3, // Charlie Kim
      created_at: hoursAgo(36), // Overdue (>24h)
      updated_at: hoursAgo(6),
      resolved_at: null
    },
    {
      id: 4,
      subject: 'Custom domain SSL renewal failed for app.client.com',
      customer: 'DevOps Lead (devops@client.com)',
      description: 'Let\'s Encrypt challenge failed due to CAA record blocking issuance.',
      priority: 'High',
      status: 'Resolved',
      assignee_id: 4, // Diana Prince
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
      assignee_id: 1, // Alice Walker
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
      assignee_id: null, // Unassigned
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
      assignee_id: 3, // Charlie Kim
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
      assignee_id: 2, // Bob Smith
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
      assignee_id: null, // Unassigned
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
      assignee_id: 4, // Diana Prince
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
      assignee_id: null, // Unassigned & Overdue!
      created_at: hoursAgo(40), // Overdue (>24h)
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
      assignee_id: 1, // Alice Walker
      created_at: hoursAgo(18),
      updated_at: hoursAgo(18),
      resolved_at: null
    }
  ];

  const insertTicket = db.prepare(`
    INSERT INTO tickets (id, subject, customer, description, priority, status, assignee_id, created_at, updated_at, resolved_at)
    VALUES (@id, @subject, @customer, @description, @priority, @status, @assignee_id, @created_at, @updated_at, @resolved_at)
  `);

  const insertEntry = db.prepare(`
    INSERT INTO ticket_entries (ticket_id, type, content, author_id, created_at)
    VALUES (@ticket_id, @type, @content, @author_id, @created_at)
  `);

  const insertEvent = db.prepare(`
    INSERT INTO ticket_events (ticket_id, type, old_value, new_value, actor_id, created_at)
    VALUES (@ticket_id, @type, @old_value, @new_value, @actor_id, @created_at)
  `);

  const seedAllTx = db.transaction(() => {
    for (const t of tickets) {
      insertTicket.run(t);

      // Initial created event for every ticket
      insertEvent.run({
        ticket_id: t.id,
        type: 'created',
        old_value: null,
        new_value: `Created ticket #${t.id} with priority ${t.priority}`,
        actor_id: t.assignee_id || 1,
        created_at: t.created_at
      });
    }

    // Ticket 2: entries and events
    insertEvent.run({
      ticket_id: 2,
      type: 'status_changed',
      old_value: 'Open',
      new_value: 'In Progress',
      actor_id: 2,
      created_at: hoursAgo(24)
    });
    insertEntry.run({
      ticket_id: 2,
      type: 'note',
      content: 'Customer is an Enterprise Tier client with 50k DAU. Escalated to mobile core team.',
      author_id: 1, // Alice
      created_at: hoursAgo(20)
    });
    insertEvent.run({
      ticket_id: 2,
      type: 'note_added',
      old_value: null,
      new_value: 'Internal note added by Alice Walker',
      actor_id: 1,
      created_at: hoursAgo(20)
    });
    insertEntry.run({
      ticket_id: 2,
      type: 'reply',
      content: 'Hi Elena, we have reproduced the issue on iOS 18.0.1. A hotfix build is currently in review.',
      author_id: 2, // Bob
      created_at: hoursAgo(10)
    });
    insertEvent.run({
      ticket_id: 2,
      type: 'reply_added',
      old_value: null,
      new_value: 'Public reply sent to customer',
      actor_id: 2,
      created_at: hoursAgo(10)
    });

    // Ticket 3: reply and event
    insertEntry.run({
      ticket_id: 3,
      type: 'reply',
      content: 'Hello, could you please re-upload your updated IdP XML metadata via the Admin Portal > SSO settings?',
      author_id: 3, // Charlie
      created_at: hoursAgo(6)
    });
    insertEvent.run({
      ticket_id: 3,
      type: 'reply_added',
      old_value: null,
      new_value: 'Public reply sent to customer',
      actor_id: 3,
      created_at: hoursAgo(6)
    });
    insertEvent.run({
      ticket_id: 3,
      type: 'status_changed',
      old_value: 'Open',
      new_value: 'Waiting on Customer',
      actor_id: 3,
      created_at: hoursAgo(6)
    });

    // Ticket 4: resolved flow
    insertEvent.run({
      ticket_id: 4,
      type: 'assignee_changed',
      old_value: 'Unassigned',
      new_value: 'Diana Prince',
      actor_id: 4,
      created_at: hoursAgo(40)
    });
    insertEntry.run({
      ticket_id: 4,
      type: 'reply',
      content: 'CAA records have been corrected and SSL certificate successfully provisioned and verified.',
      author_id: 4, // Diana
      created_at: hoursAgo(8)
    });
    insertEvent.run({
      ticket_id: 4,
      type: 'reply_added',
      old_value: null,
      new_value: 'Public reply sent to customer',
      actor_id: 4,
      created_at: hoursAgo(8)
    });
    insertEvent.run({
      ticket_id: 4,
      type: 'status_changed',
      old_value: 'In Progress',
      new_value: 'Resolved',
      actor_id: 4,
      created_at: hoursAgo(8)
    });
  });

  seedAllTx();
  console.log(`[Seed] Seeded ${agents.length} agents and ${tickets.length} tickets successfully.`);
}

// Allow direct execution
if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  const db = getDb();
  seed(db);
}
