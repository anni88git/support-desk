# Support Desk System

A lightweight, robust customer-support ticketing application built with Node.js, Express, SQLite, React, and Vite. Designed with an intentional focus on reliability, clear business domain separation, transactional data integrity, and a clean, minimal user experience.

---

## Features

- Full Ticket Lifecycle (CRUD): Create tickets, read detailed threads with full history, partially update ticket attributes, and permanently delete tickets with cascaded cleanup.
- Real-Time Dashboard: Top metrics cards reporting `Total`, `Open`, `In Progress`, `Resolved`, `Urgent`, and `Overdue` tickets, updating instantly on status transitions and deletions.
- Search & Multi-Dimensional Filtering: Search subject and customer fields (debounced 300ms) combined with multi-select dropdown filters for status, priority, and assignee (including "Unassigned").
- Customizable Sorting: Sort tickets by recently updated or by priority hierarchy (`Urgent` > `High` > `Medium` > `Low`).
- Conversational Threads: Distinct public customer `reply` entries (with a crisp light-blue border) and private internal agent `note` entries (with a warm dashed border).
- Audit Activity Timeline: Immutable event stream tracking status updates, priority escalations, assignee changes, and communications with before-and-after values.
- Dynamic Overdue Tracking: Real-time computed overdue tag (tickets older than 24 hours that are not yet Resolved).

---

## Prerequisites

- Node.js: Version >=22.5 (tested on Node v24.13.0).
- npm: Version >=10.x.

### Why `node:sqlite`?
On modern Node versions (especially Node 24 on Windows), native C++ bindings such as `better-sqlite3` frequently encounter missing precompiled ABI binaries (e.g. Node ABI 137) unless full Visual Studio C++ build tools are installed. To guarantee zero-friction setup on any developer machine and cloud provider, the backend features a resilient SQLite adapter that automatically leverages Node's built-in `node:sqlite` module (`DatabaseSync`) when native compiled addons are unavailable.

---

## Install & Run Instructions (Local)

### 1. Install Dependencies
From the project root directory, install dependencies for both applications:

```bash
npm run install:all
```
(Or manually run `npm install` inside both `backend/` and `frontend/` directories).

---

### 2. Start the Development Servers

Open two terminal windows:

#### Step 1: Start Backend (Port 4000)
```bash
# From project root
npm run dev:backend

# Or directly in the backend directory
cd backend
npm run dev
```
The backend server starts on: `http://localhost:4000`  
Opening `http://localhost:4000/` returns a friendly JSON directory of all available API endpoints.

#### Step 2: Start Frontend (Port 3000)
```bash
# From project root
npm run dev:frontend

# Or directly in the frontend directory
cd frontend
npm run dev
```
The Vite development server starts on: `http://localhost:3000` (with an automatic proxy redirecting `/api` requests to `http://localhost:4000`).

Open your browser and navigate to:
`http://localhost:3000`

---

## Environment Variables

### Backend (`backend/.env`)
Configured in `backend/.env.example`:

| Variable | Default | Description |
| :--- | :--- | :--- |
| `PORT` | `4000` | Port for the Express backend server (provided automatically by Render). |
| `CLIENT_ORIGIN` | `http://localhost:3000` | Allowed origin(s) for CORS. Supports multiple comma-separated URLs without trailing slashes. |
| `DB_PATH` | `./support_desk.db` | Absolute or relative file path to the SQLite database file. |

### Frontend (`frontend/.env`)
Configured in `frontend/.env.example`:

| Variable | Default | Description |
| :--- | :--- | :--- |
| `VITE_API_URL` | Unset (uses `/api`) | Base backend API URL. Leave unset in local dev to use Vite proxy; set to `https://your-api.onrender.com/api` on Vercel. |

---

## Deployment Guide

The project is structured for independent split deployment:

### Frontend on Vercel
1. Import your GitHub repository into Vercel.
2. Select `frontend` as the Root Directory.
3. Framework Preset: Vite.
4. Build Command: `npm run build`.
5. Output Directory: `dist`.
6. Environment Variables:
   - `VITE_API_URL`: `https://your-backend.onrender.com/api`
7. SPA Client-Side Routing: Configured automatically via `frontend/vercel.json` (`rewrites` to `/` so direct URLs like `/tickets/1` do not 404).

### Backend on Render
1. Create a new Web Service on Render connected to your GitHub repository.
2. Select `backend` as the Root Directory.
3. Environment: Node.
4. Build Command: `npm install`.
5. Start Command: `npm start` (or `node src/index.js`).
6. Environment Variables:
   - `CLIENT_ORIGIN`: `https://your-frontend.vercel.app` (your Vercel app domain, no trailing slash).
   - `NODE_VERSION`: `22.5.0` (or `24`).
   - `PORT`: (Provided automatically by Render).

---

## Database Architecture & Management

- File Location: The SQLite database file is stored at `backend/support_desk.db`.
- Automatic Initialization: On boot, `backend/src/db/db.js` automatically creates and applies `backend/src/db/schema.sql` if tables do not exist.
- Enforced Foreign Keys: All connections enforce foreign key integrity via `PRAGMA foreign_keys = ON;`.
- Idempotent Seeding: `backend/src/db/seed.js` runs automatically on startup. If the `tickets` table is empty, it populates 4 agents and 12 sample tickets covering all statuses, priorities, overdue tickets, conversation entries, and audit events. If tickets already exist, seeding is safely skipped.
- Resetting the Database:
  ```bash
  # 1. Stop the backend server
  # 2. Delete the database file:
  # Windows (PowerShell):
  Remove-Item backend/support_desk.db
  # macOS / Linux:
  rm backend/support_desk.db
  # 3. Restart the backend:
  npm run dev:backend
  ```
- Inspect Database (Read-Only Script):
  Run from root or inside `backend/`:
  ```bash
  npm run db:inspect
  ```
  Opens `backend/support_desk.db` in read-only mode and prints formatted tables of:
  - Table row counts (`agents`, `tickets`, `ticket_entries`, `ticket_events`)
  - All agents
  - All tickets with timestamps and status
  - 15 most recent activity events
  - 10 most recent conversation entries

---

## API Summary Table

All responses are formatted as JSON. Errors return `{ "error": "Message", "details": { ... } }`.

| Method | Path | Description | Status Codes |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | Friendly API index and endpoint catalog | `200` |
| `GET` | `/api/health` | Health check endpoint | `200` |
| `GET` | `/api/agents` | List all available support agents | `200` |
| `GET` | `/api/dashboard` | Aggregated ticket metric counts | `200` |
| `GET` | `/api/tickets` | List tickets with filters (`search`, `status`, `priority`, `assignee`, `sort`) | `200`, `400` |
| `POST` | `/api/tickets` | Create a new ticket (logs `'created'` event) | `201`, `400`, `404` |
| `GET` | `/api/tickets/:id` | Get ticket with chronological entries & events | `200`, `400`, `404` |
| `PATCH`| `/api/tickets/:id` | Partial update (logs events ONLY for modified fields) | `200`, `400`, `404` |
| `DELETE`| `/api/tickets/:id`| Hard delete ticket and related entries/events | `204`, `400`, `404` |
| `POST` | `/api/tickets/:id/entries` | Add reply or internal note (bumps `updated_at`) | `201`, `400`, `404` |

---

## Business Rules

1. Computed Overdue:
   - A ticket is considered `is_overdue = true` if and only if `status != 'Resolved'` AND `created_at < 24 hours ago`.
   - Once a ticket is marked `Resolved`, `is_overdue` immediately evaluates to `false`.
   - Computed dynamically at query time using SQL `CASE` statements to avoid database sync drift.
2. Dashboard Metric Counts:
   - `total`: Total count of tickets in the database.
   - `open`: Count of tickets with `status = 'Open'`.
   - `in_progress`: Count of tickets with `status = 'In Progress'`.
   - `resolved`: Count of tickets with `status = 'Resolved'`.
   - `urgent`: Count of tickets with `priority = 'Urgent'`.
   - `overdue`: Count of unresolved tickets created more than 24 hours ago.
3. Audit Event Logging:
   - Events are recorded only when values actually change on PATCH operations.
   - Modifying a field to its identical existing value does not record duplicate noise in the timeline.
   - Transitions to `Resolved` stamp `resolved_at = ISO timestamp`; reopening a resolved ticket clears `resolved_at = null`.
4. Deletion Policy:
   - Deleting a ticket (`DELETE /api/tickets/:id`) performs a hard delete within a single database transaction.
   - Associated `ticket_entries` and `ticket_events` are explicitly deleted inside the transaction, backed by schema-level `ON DELETE CASCADE` foreign key guarantees.
   - Returns `204 No Content` on success, `404 Not Found` if missing, and `400 Bad Request` if given an invalid ID.

---

## Running Automated Tests

Backend tests run against an isolated in-memory SQLite database using Node's built-in test runner (`node:test` + `node:assert/strict`) and `supertest`:

```bash
# From project root:
npm test

# Or inside the backend folder:
cd backend
npm test
```

Test coverage includes:
- Ticket creation (201) and field validation errors (400)
- Status & priority enum constraints
- PATCH delta detection (events emitted only on actual changes)
- Overdue threshold calculation (> 24h unresolved)
- Dashboard metric accuracy
- Reply vs internal note entry typing and `updated_at` bump
- Combined multi-filter searching & priority hierarchy sorting
- Ticket deletion (204, cascaded entries/events removal, 404 verification, dashboard count drop)

---

## Project Structure

```text
support-desk/
├── package.json                 # Root scripts (install:all, dev:backend, dev:frontend, test)
├── .gitignore                   # Ignores node_modules, dist, .db files, .env, logs
├── README.md                    # Project documentation and deployment guide
├── NOTES.md                     # Assessment notes, decisions, architecture & self-reflection
├── backend/
│   ├── .env.example             # Example environment file (PORT, CLIENT_ORIGIN, DB_PATH)
│   ├── package.json             # Backend dependencies & test script ("node --test")
│   ├── scripts/
│   │   └── inspect-db.js        # Read-only console.table SQLite database inspection script
│   ├── src/
│   │   ├── app.js               # Express application setup, CORS, routes & middleware
│   │   ├── index.js             # Backend entry point (starts listener on PORT)
│   │   ├── db/
│   │   │   ├── schema.sql       # DDL definitions (agents, tickets, entries, events)
│   │   │   ├── db.js            # SQLite connection wrapper & in-memory test factory
│   │   │   └── seed.js          # Idempotent seed data generator
│   │   ├── routes/
│   │   │   ├── agents.js        # GET /api/agents
│   │   │   ├── dashboard.js     # GET /api/dashboard
│   │   │   └── tickets.js       # CRUD /api/tickets routes
│   │   ├── services/
│   │   │   └── ticketService.js # Core business logic & database transactions
│   │   └── middleware/
│   │       ├── validate.js      # Input validators & domain enums
│   │       └── errorHandler.js  # Centralized error handler ({ error, details })
│   └── tests/
│       └── tickets.test.js      # 19 automated tests using node:test & supertest
└── frontend/
    ├── package.json             # Frontend dependencies (React 18, Vite, react-router-dom)
    ├── vite.config.js           # Vite config with /api proxy to http://localhost:4000
    ├── vercel.json              # Vercel SPA rewrites configuration
    ├── .env.example             # Example frontend environment file (VITE_API_URL)
    ├── index.html               # Single-page application entry point
    └── src/
        ├── main.jsx             # React DOM root render
        ├── App.jsx              # App layout shell, navbar, and route declarations
        ├── styles.css           # Vanilla CSS design system & responsive media queries
        ├── api/
        │   └── client.js        # Centralized HTTP client (builds base URL dynamically)
        ├── components/
        │   ├── Navbar.jsx       # Global header navigation
        │   ├── StatCard.jsx     # Dashboard metric card
        │   ├── FilterBar.jsx    # Search, filter selects & sort toolbar
        │   ├── TicketTable.jsx  # Responsive ticket data table
        │   ├── Badge.jsx        # Status, priority & overdue pill badges
        │   ├── TicketDetailsForm.jsx # Editable ticket metadata card with Delete button
        │   ├── EntryCard.jsx    # Formatted reply / internal note bubble
        │   ├── EntryList.jsx    # Conversation message container
        │   ├── Composer.jsx     # Reply / Note tabbed submission box
        │   ├── EventTimeline.jsx# Audit trail activity feed
        │   ├── Spinner.jsx      # Loading state indicator
        │   ├── EmptyState.jsx   # Zero-data display with clear action
        │   └── ErrorBanner.jsx  # Dismissible / retryable error callout
        └── pages/
            ├── TicketListPage.jsx   # /: Dashboard stats, filter toolbar & ticket table
            ├── NewTicketPage.jsx    # /tickets/new: Ticket creation form
            └── TicketDetailPage.jsx # /tickets/:id: Editable details, thread & delete action
```
