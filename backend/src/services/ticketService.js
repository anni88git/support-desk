import { AppError } from '../middleware/errorHandler.js';
import { VALID_PRIORITIES, VALID_STATUSES, VALID_ENTRY_TYPES, parsePositiveInt } from '../middleware/validate.js';

// Helper to calculate overdue cutoff (24 hours ago)
function getOverdueCutoff() {
  return new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
}

// Helper to check if an agent exists
function findAgent(db, agentId) {
  if (agentId === null || agentId === undefined) return null;
  return db.prepare('SELECT id, name, email FROM agents WHERE id = ?').get(agentId) || null;
}

export const ticketService = {
  /**
   * List tickets with filtering, search, and sorting.
   */
  listTickets(db, query = {}) {
    const cutoff = getOverdueCutoff();
    const whereClauses = [];
    const params = [cutoff];

    // Search: case-insensitive over subject and customer
    if (query.search && query.search.trim()) {
      const term = `%${query.search.trim().toLowerCase()}%`;
      whereClauses.push('(LOWER(t.subject) LIKE ? OR LOWER(t.customer) LIKE ?)');
      params.push(term, term);
    }

    // Status filter
    if (query.status) {
      if (!VALID_STATUSES.includes(query.status)) {
        throw new AppError(`Invalid status: ${query.status}`, 400, {
          status: `Must be one of: ${VALID_STATUSES.join(', ')}`
        });
      }
      whereClauses.push('t.status = ?');
      params.push(query.status);
    }

    // Priority filter
    if (query.priority) {
      if (!VALID_PRIORITIES.includes(query.priority)) {
        throw new AppError(`Invalid priority: ${query.priority}`, 400, {
          priority: `Must be one of: ${VALID_PRIORITIES.join(', ')}`
        });
      }
      whereClauses.push('t.priority = ?');
      params.push(query.priority);
    }

    // Assignee filter: agent id or 'unassigned'
    if (query.assignee) {
      if (query.assignee.toLowerCase() === 'unassigned') {
        whereClauses.push('t.assignee_id IS NULL');
      } else {
        const agentId = parsePositiveInt(query.assignee, 'assignee');
        whereClauses.push('t.assignee_id = ?');
        params.push(agentId);
      }
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Sorting: default to updated DESC; optionally priority DESC tie-broken by updated_at DESC
    let orderSql = 'ORDER BY t.updated_at DESC, t.id DESC';
    if (query.sort === 'priority') {
      orderSql = `
        ORDER BY 
          CASE t.priority 
            WHEN 'Urgent' THEN 4 
            WHEN 'High' THEN 3 
            WHEN 'Medium' THEN 2 
            WHEN 'Low' THEN 1 
            ELSE 0 
          END DESC,
          t.updated_at DESC,
          t.id DESC
      `;
    }

    // Optional pagination
    let paginationSql = '';
    if (query.limit !== undefined) {
      const limit = Math.max(1, parseInt(query.limit, 10) || 50);
      const page = Math.max(1, parseInt(query.page, 10) || 1);
      const offset = (page - 1) * limit;
      paginationSql = `LIMIT ? OFFSET ?`;
      params.push(limit, offset);
    }

    const sql = `
      SELECT
        t.id,
        t.subject,
        t.customer,
        t.description,
        t.priority,
        t.status,
        t.assignee_id,
        a.name AS assignee_name,
        a.email AS assignee_email,
        t.created_at,
        t.updated_at,
        t.resolved_at,
        CASE
          WHEN t.status != 'Resolved' AND t.created_at < ? THEN 1
          ELSE 0
        END AS is_overdue
      FROM tickets t
      LEFT JOIN agents a ON t.assignee_id = a.id
      ${whereSql}
      ${orderSql}
      ${paginationSql}
    `;

    const rows = db.prepare(sql).all(...params);
    return rows.map(row => ({
      ...row,
      is_overdue: Boolean(row.is_overdue)
    }));
  },

  /**
   * Get ticket by ID with entries and events in chronological order.
   */
  getTicketById(db, id) {
    const ticketId = parsePositiveInt(id, 'ticket id');
    const cutoff = getOverdueCutoff();

    const ticketSql = `
      SELECT
        t.id,
        t.subject,
        t.customer,
        t.description,
        t.priority,
        t.status,
        t.assignee_id,
        a.name AS assignee_name,
        a.email AS assignee_email,
        t.created_at,
        t.updated_at,
        t.resolved_at,
        CASE
          WHEN t.status != 'Resolved' AND t.created_at < ? THEN 1
          ELSE 0
        END AS is_overdue
      FROM tickets t
      LEFT JOIN agents a ON t.assignee_id = a.id
      WHERE t.id = ?
    `;

    const ticket = db.prepare(ticketSql).get(cutoff, ticketId);
    if (!ticket) {
      throw new AppError(`Ticket #${ticketId} not found`, 404);
    }

    // Chronological entries (ASC)
    const entriesSql = `
      SELECT
        e.id,
        e.ticket_id,
        e.type,
        e.content,
        e.author_id,
        a.name AS author_name,
        a.email AS author_email,
        e.created_at
      FROM ticket_entries e
      JOIN agents a ON e.author_id = a.id
      WHERE e.ticket_id = ?
      ORDER BY e.created_at ASC, e.id ASC
    `;
    const entries = db.prepare(entriesSql).all(ticketId);

    // Chronological events (ASC)
    const eventsSql = `
      SELECT
        ev.id,
        ev.ticket_id,
        ev.type,
        ev.old_value,
        ev.new_value,
        ev.actor_id,
        a.name AS actor_name,
        ev.created_at
      FROM ticket_events ev
      LEFT JOIN agents a ON ev.actor_id = a.id
      WHERE ev.ticket_id = ?
      ORDER BY ev.created_at ASC, ev.id ASC
    `;
    const events = db.prepare(eventsSql).all(ticketId);

    return {
      ...ticket,
      is_overdue: Boolean(ticket.is_overdue),
      entries,
      events
    };
  },

  /**
   * Create a new ticket and log 'created' event inside a single transaction.
   */
  createTicket(db, body) {
    if (!body || typeof body !== 'object') {
      throw new AppError('Request body must be a JSON object', 400);
    }

    const details = {};
    const subject = typeof body.subject === 'string' ? body.subject.trim() : '';
    const customer = typeof body.customer === 'string' ? body.customer.trim() : '';
    const description = typeof body.description === 'string' ? body.description.trim() : '';
    const priority = body.priority || 'Medium';
    const status = body.status || 'Open';

    if (!subject) {
      details.subject = 'Subject is required and cannot be empty';
    } else if (subject.length > 200) {
      details.subject = 'Subject cannot exceed 200 characters';
    }

    if (!customer) {
      details.customer = 'Customer name/email is required and cannot be empty';
    } else if (customer.length > 200) {
      details.customer = 'Customer cannot exceed 200 characters';
    }

    if (!description) {
      details.description = 'Description is required and cannot be empty';
    } else if (description.length > 5000) {
      details.description = 'Description cannot exceed 5000 characters';
    }

    if (!VALID_PRIORITIES.includes(priority)) {
      details.priority = `Priority must be one of: ${VALID_PRIORITIES.join(', ')}`;
    }

    if (!VALID_STATUSES.includes(status)) {
      details.status = `Status must be one of: ${VALID_STATUSES.join(', ')}`;
    }

    let assigneeId = null;
    if (body.assignee_id !== undefined && body.assignee_id !== null && body.assignee_id !== '') {
      assigneeId = parsePositiveInt(body.assignee_id, 'assignee_id');
      const agent = findAgent(db, assigneeId);
      if (!agent) {
        throw new AppError('Assignee agent not found', 404, {
          assignee_id: `Agent with id ${assigneeId} does not exist`
        });
      }
    }

    if (Object.keys(details).length > 0) {
      throw new AppError('Validation failed', 400, details);
    }

    const now = new Date().toISOString();
    const resolvedAt = status === 'Resolved' ? now : null;

    const insertTicket = db.prepare(`
      INSERT INTO tickets (subject, customer, description, priority, status, assignee_id, created_at, updated_at, resolved_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertEvent = db.prepare(`
      INSERT INTO ticket_events (ticket_id, type, old_value, new_value, actor_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    let newTicketId;
    const createTx = db.transaction(() => {
      const res = insertTicket.run(
        subject,
        customer,
        description,
        priority,
        status,
        assigneeId,
        now,
        now,
        resolvedAt
      );
      newTicketId = Number(res.lastInsertRowid);

      insertEvent.run(
        newTicketId,
        'created',
        null,
        `Created ticket with priority ${priority}`,
        assigneeId,
        now
      );
    });

    createTx();
    return this.getTicketById(db, newTicketId);
  },

  /**
   * Partially update a ticket and record events for changed fields in a single transaction.
   */
  updateTicket(db, id, body) {
    const ticketId = parsePositiveInt(id, 'ticket id');

    if (!body || typeof body !== 'object') {
      throw new AppError('Request body must be a JSON object', 400);
    }

    const current = this.getTicketById(db, ticketId);
    const details = {};
    const allowedKeys = ['subject', 'customer', 'description', 'priority', 'status', 'assignee_id'];
    const providedKeys = Object.keys(body).filter(k => allowedKeys.includes(k));

    if (providedKeys.length === 0) {
      throw new AppError('At least one field must be provided for update', 400);
    }

    let newSubject = current.subject;
    if (body.subject !== undefined) {
      const s = typeof body.subject === 'string' ? body.subject.trim() : '';
      if (!s) {
        details.subject = 'Subject cannot be empty';
      } else if (s.length > 200) {
        details.subject = 'Subject cannot exceed 200 characters';
      } else {
        newSubject = s;
      }
    }

    let newCustomer = current.customer;
    if (body.customer !== undefined) {
      const c = typeof body.customer === 'string' ? body.customer.trim() : '';
      if (!c) {
        details.customer = 'Customer cannot be empty';
      } else if (c.length > 200) {
        details.customer = 'Customer cannot exceed 200 characters';
      } else {
        newCustomer = c;
      }
    }

    let newDescription = current.description;
    if (body.description !== undefined) {
      const d = typeof body.description === 'string' ? body.description.trim() : '';
      if (!d) {
        details.description = 'Description cannot be empty';
      } else if (d.length > 5000) {
        details.description = 'Description cannot exceed 5000 characters';
      } else {
        newDescription = d;
      }
    }

    let newPriority = current.priority;
    if (body.priority !== undefined) {
      if (!VALID_PRIORITIES.includes(body.priority)) {
        details.priority = `Priority must be one of: ${VALID_PRIORITIES.join(', ')}`;
      } else {
        newPriority = body.priority;
      }
    }

    let newStatus = current.status;
    if (body.status !== undefined) {
      if (!VALID_STATUSES.includes(body.status)) {
        details.status = `Status must be one of: ${VALID_STATUSES.join(', ')}`;
      } else {
        newStatus = body.status;
      }
    }

    let newAssigneeId = current.assignee_id;
    let newAssigneeName = current.assignee_name || 'Unassigned';
    if (body.assignee_id !== undefined) {
      if (body.assignee_id === null || body.assignee_id === '' || body.assignee_id === 'unassigned') {
        newAssigneeId = null;
        newAssigneeName = 'Unassigned';
      } else {
        const parsed = parsePositiveInt(body.assignee_id, 'assignee_id');
        const agent = findAgent(db, parsed);
        if (!agent) {
          throw new AppError('Assignee agent not found', 404, {
            assignee_id: `Agent with id ${parsed} does not exist`
          });
        }
        newAssigneeId = agent.id;
        newAssigneeName = agent.name;
      }
    }

    if (Object.keys(details).length > 0) {
      throw new AppError('Validation failed', 400, details);
    }

    // Compare with current values to determine actual changes
    const eventsToCreate = [];
    const now = new Date().toISOString();

    if (newStatus !== current.status) {
      eventsToCreate.push({
        type: 'status_changed',
        old_value: current.status,
        new_value: newStatus
      });
    }

    if (newPriority !== current.priority) {
      eventsToCreate.push({
        type: 'priority_changed',
        old_value: current.priority,
        new_value: newPriority
      });
    }

    if (newAssigneeId !== current.assignee_id) {
      eventsToCreate.push({
        type: 'assignee_changed',
        old_value: current.assignee_name || 'Unassigned',
        new_value: newAssigneeName
      });
    }

    const contentChanged = (
      newSubject !== current.subject ||
      newCustomer !== current.customer ||
      newDescription !== current.description
    );

    // If nothing changed at all, return existing ticket without updating updated_at or creating events
    if (eventsToCreate.length === 0 && !contentChanged) {
      return current;
    }

    // Resolve resolved_at logic:
    // If status changed to Resolved, set resolved_at = now
    // If status changed FROM Resolved, clear resolved_at = null
    // Otherwise preserve current resolved_at
    let resolvedAt = current.resolved_at;
    if (newStatus !== current.status) {
      if (newStatus === 'Resolved') {
        resolvedAt = now;
      } else if (current.status === 'Resolved') {
        resolvedAt = null;
      }
    }

    const updateTicketSql = db.prepare(`
      UPDATE tickets
      SET subject = ?, customer = ?, description = ?, priority = ?, status = ?, assignee_id = ?, updated_at = ?, resolved_at = ?
      WHERE id = ?
    `);

    const insertEventSql = db.prepare(`
      INSERT INTO ticket_events (ticket_id, type, old_value, new_value, actor_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const patchTx = db.transaction(() => {
      updateTicketSql.run(
        newSubject,
        newCustomer,
        newDescription,
        newPriority,
        newStatus,
        newAssigneeId,
        now,
        resolvedAt,
        ticketId
      );

      for (const ev of eventsToCreate) {
        insertEventSql.run(
          ticketId,
          ev.type,
          ev.old_value,
          ev.new_value,
          newAssigneeId || current.assignee_id || null,
          now
        );
      }
    });

    patchTx();
    return this.getTicketById(db, ticketId);
  },

  /**
   * Add a reply or note entry to a ticket inside a single transaction.
   */
  createTicketEntry(db, id, body) {
    const ticketId = parsePositiveInt(id, 'ticket id');

    // Verify ticket exists
    this.getTicketById(db, ticketId);

    if (!body || typeof body !== 'object') {
      throw new AppError('Request body must be a JSON object', 400);
    }

    const details = {};
    const type = body.type;
    const content = typeof body.content === 'string' ? body.content.trim() : '';

    if (!type || !VALID_ENTRY_TYPES.includes(type)) {
      details.type = `Type must be one of: ${VALID_ENTRY_TYPES.join(', ')}`;
    }

    if (!content) {
      details.content = 'Content is required and cannot be empty';
    } else if (content.length > 5000) {
      details.content = 'Content cannot exceed 5000 characters';
    }

    if (body.author_id === undefined || body.author_id === null || body.author_id === '') {
      details.author_id = 'Author ID is required';
    }

    if (Object.keys(details).length > 0) {
      throw new AppError('Validation failed', 400, details);
    }

    const authorId = parsePositiveInt(body.author_id, 'author_id');
    const author = findAgent(db, authorId);
    if (!author) {
      throw new AppError('Author agent not found', 404, {
        author_id: `Agent with id ${authorId} does not exist`
      });
    }

    const now = new Date().toISOString();
    const eventType = type === 'reply' ? 'reply_added' : 'note_added';
    const eventSummary = type === 'reply' ? 'Public reply added' : 'Internal note added';

    const insertEntry = db.prepare(`
      INSERT INTO ticket_entries (ticket_id, type, content, author_id, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    const bumpTicket = db.prepare(`
      UPDATE tickets
      SET updated_at = ?
      WHERE id = ?
    `);

    const insertEvent = db.prepare(`
      INSERT INTO ticket_events (ticket_id, type, old_value, new_value, actor_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    let newEntryId;
    const entryTx = db.transaction(() => {
      const res = insertEntry.run(ticketId, type, content, authorId, now);
      newEntryId = Number(res.lastInsertRowid);
      bumpTicket.run(now, ticketId);
      insertEvent.run(ticketId, eventType, null, eventSummary, authorId, now);
    });

    entryTx();

    const createdEntry = db.prepare(`
      SELECT
        e.id,
        e.ticket_id,
        e.type,
        e.content,
        e.author_id,
        a.name AS author_name,
        a.email AS author_email,
        e.created_at
      FROM ticket_entries e
      JOIN agents a ON e.author_id = a.id
      WHERE e.id = ?
    `).get(newEntryId);

    return createdEntry;
  },

  /**
   * Delete a ticket, its entries, and events in one transaction.
   * Throws 404 if ticket doesn't exist, 400 if id is invalid.
   */
  deleteTicket(db, id) {
    const ticketId = parsePositiveInt(id, 'ticket id');

    // Throws 404 if not found
    this.getTicketById(db, ticketId);

    const deleteEntries = db.prepare('DELETE FROM ticket_entries WHERE ticket_id = ?');
    const deleteEvents = db.prepare('DELETE FROM ticket_events WHERE ticket_id = ?');
    const deleteTicket = db.prepare('DELETE FROM tickets WHERE id = ?');

    const deleteTx = db.transaction(() => {
      deleteEntries.run(ticketId);
      deleteEvents.run(ticketId);
      deleteTicket.run(ticketId);
    });

    deleteTx();
  }
};

