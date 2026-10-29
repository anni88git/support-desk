import React from 'react';

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

function getEventSentence(event) {
  switch (event.type) {
    case 'created':
      return event.new_value || 'Ticket created';
    case 'status_changed':
      return `Status changed from ${event.old_value} to ${event.new_value}`;
    case 'priority_changed':
      return `Priority changed from ${event.old_value} to ${event.new_value}`;
    case 'assignee_changed':
      if (event.new_value === 'Unassigned') {
        return `Ticket unassigned (was ${event.old_value})`;
      }
      return `Assigned to ${event.new_value}`;
    case 'reply_added':
      return 'Public reply added';
    case 'note_added':
      return 'Internal note added';
    default:
      return event.new_value || event.type;
  }
}

function getDotClass(type) {
  if (type === 'status_changed') return 'dot-status';
  if (type === 'priority_changed') return 'dot-priority';
  if (type === 'assignee_changed') return 'dot-assignee';
  if (type === 'reply_added' || type === 'note_added') return 'dot-entry';
  if (type === 'created') return 'dot-created';
  return '';
}

export function EventTimeline({ events = [] }) {
  if (!events || events.length === 0) {
    return (
      <div className="timeline-card">
        <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '12px' }}>Activity Timeline</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>No events recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="timeline-card">
      <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '18px' }}>Activity Timeline</h3>
      <div className="timeline-list">
        {events.map((event) => (
          <div key={event.id} className="timeline-item">
            <span className={`timeline-dot ${getDotClass(event.type)}`} />
            <div className="timeline-content">
              <div className="timeline-sentence">{getEventSentence(event)}</div>
              <div className="timeline-meta">
                <span>{event.actor_name || 'System'}</span>
                <span>•</span>
                <span title={new Date(event.created_at).toLocaleString()}>
                  {formatRelativeTime(event.created_at)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
