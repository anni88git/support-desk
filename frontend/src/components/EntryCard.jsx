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

export function EntryCard({ entry }) {
  const isReply = entry.type === 'reply';

  return (
    <div className={`entry-card ${isReply ? 'entry-card-reply' : 'entry-card-note'}`}>
      <div className="entry-header">
        {isReply ? (
          <span className="entry-tag entry-tag-reply">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            Public reply
          </span>
        ) : (
          <span className="entry-tag entry-tag-note">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            Internal note · not visible to customer
          </span>
        )}

        <div className="entry-meta">
          <span className="entry-author">{entry.author_name}</span>
          <span className="entry-dot-separator">•</span>
          <span className="entry-time" title={new Date(entry.created_at).toLocaleString()}>
            {formatRelativeTime(entry.created_at)}
          </span>
        </div>
      </div>

      <div className="entry-body">{entry.content}</div>
    </div>
  );
}
