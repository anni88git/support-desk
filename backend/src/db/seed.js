import { getPool, withTransaction } from './db.js';

export async function seed(db = getPool()) {
  const existingTickets = await db.query('SELECT COUNT(*) as count FROM tickets');
  const count = parseInt(existingTickets.rows[0].count, 10);
  if (count > 0) {
    console.log('[Seed] Tickets table already populated. Skipping seed.');
    return;
  }

  console.log('[Seed] Seeding agents and tickets...');

  const agentDefs = [
    { name: 'Alice Walker', email: 'alice@supportdesk.local' },
    { name: 'Bob Smith', email: 'bob@supportdesk.local' },
    { name: 'Charlie Kim', email: 'charlie@supportdesk.local' },
    { name: 'Diana Prince', email: 'diana@supportdesk.local' }
  ];

  const now = Date.now();
  const hoursAgo = (h) => new Date(now - h * 60 * 60 * 1000).toISOString();

  await withTransaction(db, async (client) => {
    // 1. Insert agents letting DB assign ids (or retrieve existing)
    const agentMap = {};
      for (const a of agentDefs) {
        const res = await client.query(
          `INSERT INTO agents (name, email) VALUES ($1, $2)
         ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
         RETURNING id, name`,
          [a.name, a.email]
        );
        agentMap[a.name] = res.rows[0].id;
      }

    const aliceId = agentMap['Alice Walker'];
        const bobId = agentMap['Bob Smith'];
        const charlieId = agentMap['Charlie Kim'];
        const dianaId = agentMap['Diana Prince'];

        // 2. Define 12 tickets
        const ticketDefs = [
          {
            ref: 't1',
            subject: 'Critical billing failure on Stripe recurring payments',
            customer: 'Finance Director (stripe-billing@acme.corp)',
            description: 'Subscriptions are failing to renew since yesterday morning with webhook timeouts.',
            priority: 'Urgent',
            status: 'Open',
            assignee_id: aliceId,
            created_at: hoursAgo(30), // Overdue (>24h)
            updated_at: hoursAgo(30),
            resolved_at: null
          },
          {
            ref: 't2',
            subject: 'Mobile checkout crashing on iOS 18 devices',
            customer: 'Elena Rostova (elena@retailhub.io)',
            description: 'Customers on iOS 18 experience an unhandled JavaScript exception during Apple Pay tokenization.',
            priority: 'High',
            status: 'In Progress',
            assignee_id: bobId,
            created_at: hoursAgo(48), // Overdue (>24h)
            updated_at: hoursAgo(10),
            resolved_at: null
          },
          {
            ref: 't3',
            subject: 'Single Sign-On SAML metadata certificate mismatch',
            customer: 'Security Admin (it-ops@globallogistics.com)',
            description: 'Identity Provider returns InvalidAssertionSignature after our annual Okta cert rotation.',
            priority: 'Medium',
            status: 'Waiting on Customer',
            assignee_id: charlieId,
            created_at: hoursAgo(36), // Overdue (>24h)
            updated_at: hoursAgo(6),
            resolved_at: null
          },
          {
            ref: 't4',
            subject: 'Custom domain SSL renewal failed for app.client.com',
            customer: 'DevOps Lead (devops@client.com)',
            description: "Let's Encrypt challenge failed due to CAA record blocking issuance.",
            priority: 'High',
            status: 'Resolved',
            assignee_id: dianaId,
            created_at: hoursAgo(72), // Created >24h ago but Resolved -> NOT overdue
            updated_at: hoursAgo(8),
            resolved_at: hoursAgo(8)
          },
          {
            ref: 't5',
            subject: 'Database connection pool exhausted during traffic spike',
            customer: 'Infrastructure Alert (pager@alerts.internal)',
            description: 'PgBouncer connection limits reached 98% utilization during marketing flash campaign.',
            priority: 'Urgent',
            status: 'In Progress',
            assignee_id: aliceId,
            created_at: hoursAgo(2), // <24h -> Not overdue
            updated_at: hoursAgo(1),
            resolved_at: null
          },
          {
            ref: 't6',
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
            ref: 't7',
            subject: 'Webhook retries causing duplicate event payloads',
            customer: 'API Integrator (dev@ecommerce-plus.net)',
            description: 'Receiving idempotency-key collisions when our endpoint responds with HTTP 504 gateway timeout.',
            priority: 'Medium',
            status: 'Open',
            assignee_id: charlieId,
            created_at: hoursAgo(3),
            updated_at: hoursAgo(3),
            resolved_at: null
          },
          {
            ref: 't8',
            subject: 'Export to CSV truncating UTF-8 Japanese characters',
            customer: 'Tokyo Operations (ops-jp@tokyotrade.jp)',
            description: 'Customer names containing Kanji are replaced with question marks in generated CSV reports.',
            priority: 'High',
            status: 'In Progress',
            assignee_id: bobId,
            created_at: hoursAgo(12),
            updated_at: hoursAgo(7),
            resolved_at: null
          },
          {
            ref: 't9',
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
            ref: 't10',
            subject: 'Dark mode contrast issue on ticket activity timeline',
            customer: 'Marcus Vance (marcus.v@uxdesigners.org)',
            description: 'Timestamp text color has insufficient WCAG AA contrast ratio against dark backgrounds.',
            priority: 'Low',
            status: 'Resolved',
            assignee_id: dianaId,
            created_at: hoursAgo(50),
            updated_at: hoursAgo(20),
            resolved_at: hoursAgo(20)
          },
          {
            ref: 't11',
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
            ref: 't12',
            subject: 'Add webhook signature header documentation',
            customer: 'Developer Relations (devrel@developerportal.io)',
            description: 'Developers need HMAC-SHA256 verification code snippets in Python and Node.js.',
            priority: 'Low',
            status: 'Open',
            assignee_id: aliceId,
            created_at: hoursAgo(18),
            updated_at: hoursAgo(18),
            resolved_at: null
          }
        ];

        const ticketMap = {};
        for (const t of ticketDefs) {
          const res = await client.query(
            `INSERT INTO tickets (subject, customer, description, priority, status, assignee_id, created_at, updated_at, resolved_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id`,
            [t.subject, t.customer, t.description, t.priority, t.status, t.assignee_id, t.created_at, t.updated_at, t.resolved_at]
          );
          const newId = res.rows[0].id;
          ticketMap[t.ref] = newId;

          await client.query(
            `INSERT INTO ticket_events (ticket_id, type, old_value, new_value, actor_id, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
            [newId, 'created', null, `Created ticket #${newId} with priority ${t.priority}`, t.assignee_id || aliceId, t.created_at]
          );
        }

        // 3. Ticket 2: entries and events
        const t2Id = ticketMap['t2'];
        await client.query(
          `INSERT INTO ticket_events (ticket_id, type, old_value, new_value, actor_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
          [t2Id, 'status_changed', 'Open', 'In Progress', bobId, hoursAgo(24)]
        );
        await client.query(
          `INSERT INTO ticket_entries (ticket_id, type, content, author_id, created_at)
       VALUES ($1, $2, $3, $4, $5)`,
          [t2Id, 'note', 'Customer is an Enterprise Tier client with 50k DAU. Escalated to mobile core team.', aliceId, hoursAgo(20)]
        );
        await client.query(
          `INSERT INTO ticket_events (ticket_id, type, old_value, new_value, actor_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
          [t2Id, 'note_added', null, 'Internal note added by Alice Walker', aliceId, hoursAgo(20)]
        );
        await client.query(
          `INSERT INTO ticket_entries (ticket_id, type, content, author_id, created_at)
       VALUES ($1, $2, $3, $4, $5)`,
          [t2Id, 'reply', 'Hi Elena, we have reproduced the issue on iOS 18.0.1. A hotfix build is currently in review.', bobId, hoursAgo(10)]
        );
        await client.query(
          `INSERT INTO ticket_events (ticket_id, type, old_value, new_value, actor_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
          [t2Id, 'reply_added', null, 'Public reply sent to customer', bobId, hoursAgo(10)]
        );

        // 4. Ticket 3: reply and event
        const t3Id = ticketMap['t3'];
        await client.query(
          `INSERT INTO ticket_entries (ticket_id, type, content, author_id, created_at)
       VALUES ($1, $2, $3, $4, $5)`,
          [t3Id, 'reply', 'Hello, could you please re-upload your updated IdP XML metadata via the Admin Portal > SSO settings?', charlieId, hoursAgo(6)]
        );
        await client.query(
          `INSERT INTO ticket_events (ticket_id, type, old_value, new_value, actor_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
          [t3Id, 'reply_added', null, 'Public reply sent to customer', charlieId, hoursAgo(6)]
        );
        await client.query(
          `INSERT INTO ticket_events (ticket_id, type, old_value, new_value, actor_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
          [t3Id, 'status_changed', 'Open', 'Waiting on Customer', charlieId, hoursAgo(6)]
        );

        // 5. Ticket 4: resolved flow
        const t4Id = ticketMap['t4'];
        await client.query(
          `INSERT INTO ticket_events (ticket_id, type, old_value, new_value, actor_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
          [t4Id, 'assignee_changed', 'Unassigned', 'Diana Prince', dianaId, hoursAgo(40)]
        );
        await client.query(
          `INSERT INTO ticket_entries (ticket_id, type, content, author_id, created_at)
       VALUES ($1, $2, $3, $4, $5)`,
          [t4Id, 'reply', 'CAA records have been corrected and SSL certificate successfully provisioned and verified.', dianaId, hoursAgo(8)]
        );
        await client.query(
          `INSERT INTO ticket_events (ticket_id, type, old_value, new_value, actor_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
          [t4Id, 'reply_added', null, 'Public reply sent to customer', dianaId, hoursAgo(8)]
        );
        await client.query(
          `INSERT INTO ticket_events (ticket_id, type, old_value, new_value, actor_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
          [t4Id, 'status_changed', 'In Progress', 'Resolved', dianaId, hoursAgo(8)]
        );
      });

  console.log(`[Seed] Seeded agents and 12 tickets successfully.`);
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
