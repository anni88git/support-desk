# Project Assessment Notes & Engineering Reflection

---

## 1. What Works (Functional Requirements A to E)

### Requirement A: Data Persistence & Schema Integrity
- [x] PostgreSQL database (Neon Serverless Postgres) with foreign keys enforcing relational integrity.
- [x] Four structured tables: `agents`, `tickets`, `ticket_entries`, `ticket_events` with CHECK constraints on statuses, priorities, and entry types.
- [x] Indexed lookup paths: `idx_tickets_status`, `idx_tickets_priority`, `idx_tickets_assignee_id`, `idx_tickets_created_at`, `idx_ticket_entries_ticket_id`, and `idx_ticket_events_ticket_id`.
- [x] Idempotent database seeding on startup populates 4 support agents and 12 realistic sample tickets if the database is unseeded.

### Requirement B: Complete Ticket CRUD & Lifecycle
- [x] **Create (POST /api/tickets)**: Validates required inputs, generates ISO timestamps, assigns optional agents, and writes both ticket and `'created'` audit events within a transaction.
- [x] **Read List (GET /api/tickets)**: Supports keyword search across subject and customer using ILIKE, combinable filtering by status, priority, and assignee (including `"unassigned"`), and sorting by updated timestamp or priority level (with `id` as tiebreaker).
- [x] **Read Detail (GET /api/tickets/:id)**: Returns ticket metadata along with chronological conversation entries (`ticket_entries`) and chronological audit timeline events (`ticket_events`).
- [x] **Update (PATCH /api/tickets/:id)**: Computes change deltas and emits timeline events **only** for attributes that actually changed. Automatically manages `resolved_at` timestamps on resolution transitions.
- [x] **Delete (DELETE /api/tickets/:id)**: Atomic deletion of the ticket and all related entries and events inside a single transaction, returning `204 No Content`.

### Requirement C: Communication & Entries (Replies vs. Notes)
- [x] Public customer replies (`reply`) and internal staff notes (`note`) stored with type safety.
- [x] Adding any entry updates the parent ticket's `updated_at` timestamp.
- [x] Visual separation: Public replies feature a crisp white background with a light blue left border; internal notes feature a warm, muted background with a dashed golden-amber border.

### Requirement D: Real-Time Computed Overdue & Metrics Dashboard
- [x] Dynamic query-time overdue computation: non-resolved tickets older than 24 hours are flagged as `is_overdue = true` in both list and detail views via `created_at < now() - interval '24 hours'`.
- [x] Resolving a ticket clears the overdue status immediately.
- [x] `GET /api/dashboard` delivers real-time aggregated metrics (`total`, `open`, `in_progress`, `resolved`, `urgent`, `overdue`), automatically updated on ticket mutations and deletions.

### Requirement E: Responsive, Polished User Interface
- [x] Minimal, calm AI-product aesthetic inspired by modern clean design language.
- [x] Built using standard React 18, Vite, `react-router-dom`, and Vanilla CSS (no bulky UI frameworks or Tailwind).
- [x] Responsive layout tested across desktop (~1280px), tablet (960px/768px), and mobile widths (<480px) with horizontal table scrolling and stacked form cards.
- [x] Clear loading spinners, empty states with actionable reset triggers, and non-blocking error alerts with retry callbacks.

---

## 2. What's Incomplete or Intentionally Skipped (Deliberate Trade-offs)

1. **No Authentication or Role-Based Access Control**:
   - *Decision*: To preserve focus on core data modeling and domain workflow within an assessment window, authentication was omitted. Support agents are selected directly from dropdown menus during ticket creation and comment authoring.
2. **No Pagination UI**:
   - *Decision*: The backend SQL query supports `limit` and `page` parameters, but frontend pagination controls were intentionally omitted to maintain UI simplicity and quick scannability for realistic support queues under 100 tickets.
3. **No SLA Warning Timer / Escalation Rule Engine**:
   - *Decision*: Kept as an optional stretch feature. Overdue detection is strictly threshold-based (>24 hours non-resolved).
4. **No Client-Side Unit Tests**:
   - *Decision*: Engineering time was prioritized toward comprehensive backend integration testing and strict API contract adherence.

---

## 3. Known Issues and Limitations

1. **Unauthenticated Agent Attribution**:
   - Any user can select any support agent as the author of an internal note or reply. In a production system, this would be derived from JWT or session context.
2. **Render Free Tier Hosting (Cold Starts)**:
   - Render free instances spin down after 15 minutes of inactivity; the initial request after idle may take 30-60 seconds to wake up (cold start).
   - Because persistence is backed by Neon PostgreSQL, all data remains intact across spin-downs and redeployments.

---

## 4. Key Assumptions Made

- **Overdue Definition**: Tickets are evaluated against a fixed 24-hour cutoff from `created_at` (`created_at < now() - interval '24 hours'`). Once a ticket is marked `Resolved`, it is never overdue, regardless of how long ago it was opened.
- **Permanent Deletion**: Hard deletion is irreversible. A confirmation modal alerts the user before issuing the `DELETE` request.
- **Port Allocation**: Server runs on port 4000; Vite dev server runs on port 3000 with a `/api` proxy.

---

## 5. Architectural Overview

```text
HTTP Request
     │
     ▼
[Express Routes]        Thin controllers (routes/tickets.js, dashboard.js, agents.js)
     │                 - Parameter extraction and HTTP status codes
     ▼
[Ticket Service]        Domain logic (services/ticketService.js)
     │                 - Business validation (lengths, enums, presence)
     │                 - Atomic database transactions ($1, $2 parameterized)
     │                 - Diffing old vs. new values for audit trail
     ▼
[Database Layer]        PostgreSQL via pg Pool (db/db.js) connected to Neon Postgres
                       - Schema enforcement (schema.sql)
                       - Foreign key cascades & indexing
```

- **Clean Layered Separation**: Routes never execute SQL directly; all database calls and business rules reside in `services/ticketService.js`.
- **Query-Time Overdue Computation**: Rather than running recurring background cron jobs to flip database flags, `is_overdue` is computed at query time via `CASE WHEN t.status != 'Resolved' AND t.created_at < (NOW() - INTERVAL '24 hours') THEN true ELSE false END`.
- **Atomic Multi-Write Transactions**: Every operation that alters more than one table (e.g. creating a ticket + logging event, adding reply + bumping updated timestamp, deleting ticket + removing entries/events) runs inside `withTransaction(client => ...)`.

---

## 6. Key Decisions & Technical Trade-offs

| Decision | Alternative Considered | Rationale |
| :--- | :--- | :--- |
| **Neon PostgreSQL** | SQLite / Local file | Full data persistence on cloud hosts like Render without needing expensive persistent disks; standard SQL with native SSL. |
| **Plain SQL with `pg`** | Prisma / Drizzle / TypeORM | Maximum transparency, predictable query performance, direct use of PostgreSQL indexes, and zero ORM overhead. |
| **`node:test` Built-in Runner** | Vitest / Jest | Fast, built-in, zero dependencies, and runs reliably with `--test-concurrency=1`. |
| **Hard Delete in Transaction** | Soft Delete (`deleted_at`) | Followed explicit spec requirements; ensures orphaned records never remain. |
| **Vanilla CSS Design System** | Tailwind / MUI / Bootstrap | Complete control over CSS variables, zero bundle bloat, and consistent custom aesthetic. |

---

## 7. How AI Tools Were Used

An AI pair-programming coding agent was used in structured phases to accelerate development:
1. **Scaffolding & Architecture**: Generating schema DDL, database connection wrappers, and Express routes.
2. **Business Rules & Test Writing**: Implementing transactional diffing in `ticketService.js` and creating integration tests with `node:test` and `supertest`.
3. **Frontend Implementation**: Building reusable React UI components and an aesthetic CSS design system.
4. **PostgreSQL Migration**: Converting SQLite data layer to PostgreSQL connection pooling, SSL handling, parameterized queries, and safe test execution guards.
5. **Human Review & Verification**: Every phase was reviewed, tested, and verified by running the test suite (`npm test`), inspecting the database (`npm run db:inspect`), and manually executing user journeys in the browser.
