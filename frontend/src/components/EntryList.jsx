import React from 'react';
import { EntryCard } from './EntryCard.jsx';

export function EntryList({ entries = [] }) {
  if (!entries || entries.length === 0) {
    return (
      <div
        style={{
          padding: '24px',
          textAlign: 'center',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--text-secondary)',
          fontSize: '13px'
        }}
      >
        No replies or notes yet. Use the composer below to start the conversation.
      </div>
    );
  }

  return (
    <div className="entry-list">
      {entries.map((entry) => (
        <EntryCard key={entry.id} entry={entry} />
      ))}
    </div>
  );
}
