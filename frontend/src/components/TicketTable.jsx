import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from './Badge.jsx';

function formatRelativeTime(isoString) {
  if (!isoString) return '—';
  const date = new Date(isoString);
  const now = new Date();
  const diffSec = Math.floor((now - date) / 1000);

  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric'
  });
}

export function TicketTable({ tickets = [] }) {
  const navigate = useNavigate();

  return (
    <div className="table-card">
      <table className="ticket-table">
        <thead>
          <tr>
            <th style={{ width: '38%' }}>Subject</th>
            <th style={{ width: '20%' }}>Customer</th>
            <th style={{ width: '13%' }}>Status</th>
            <th style={{ width: '11%' }}>Priority</th>
            <th style={{ width: '10%' }}>Assignee</th>
            <th style={{ width: '8%', textAlign: 'right' }}>Updated</th>
          </tr>
        </thead>
        <tbody>
          {tickets.map((ticket) => (
            <tr
              key={ticket.id}
              className="ticket-row"
              onClick={() => navigate(`/tickets/${ticket.id}`)}
            >
              <td className="ticket-subject-cell">
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span className="ticket-subject-text">{ticket.subject}</span>
                  {ticket.is_overdue && <Badge type="overdue" />}
                </div>
              </td>
              <td className="ticket-customer-cell" title={ticket.customer}>
                {ticket.customer}
              </td>
              <td>
                <Badge type="status" value={ticket.status} />
              </td>
              <td>
                <Badge type="priority" value={ticket.priority} />
              </td>
              <td className="ticket-assignee-cell">
                {ticket.assignee_name || <span style={{ color: 'var(--text-tertiary)' }}>Unassigned</span>}
              </td>
              <td
                className="ticket-date-cell"
                style={{ textAlign: 'right' }}
                title={new Date(ticket.updated_at).toLocaleString()}
              >
                {formatRelativeTime(ticket.updated_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
