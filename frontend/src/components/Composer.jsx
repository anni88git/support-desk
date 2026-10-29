import React, { useState, useEffect } from 'react';
import { Spinner } from './Spinner.jsx';

export function Composer({ agents = [], onSubmit, submitting = false }) {
  const [type, setType] = useState('reply'); // 'reply' | 'note'
  const [content, setContent] = useState('');
  const [authorId, setAuthorId] = useState('');
  const [errors, setErrors] = useState({});

  // Auto-select first agent if available
  useEffect(() => {
    if (!authorId && agents.length > 0) {
      setAuthorId(String(agents[0].id));
    }
  }, [agents, authorId]);

  const validate = () => {
    const errs = {};
    if (!content.trim()) {
      errs.content = 'Content cannot be empty';
    } else if (content.trim().length > 5000) {
      errs.content = 'Content cannot exceed 5000 characters';
    }

    if (!authorId) {
      errs.author_id = 'Please select an author agent';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting || !validate()) return;

    const success = await onSubmit({
      type,
      content: content.trim(),
      author_id: parseInt(authorId, 10)
    });

    if (success !== false) {
      setContent('');
      setErrors({});
    }
  };

  const isReply = type === 'reply';

  return (
    <div className={`composer-card ${isReply ? 'composer-reply-mode' : 'composer-note-mode'}`}>
      <div className="composer-toggle-bar">
        {/* Toggle between Reply and Note */}
        <div className="composer-tabs">
          <button
            type="button"
            className={`composer-tab ${isReply ? 'active-reply' : ''}`}
            onClick={() => setType('reply')}
            disabled={submitting}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            Public reply
          </button>
          <button
            type="button"
            className={`composer-tab ${!isReply ? 'active-note' : ''}`}
            onClick={() => setType('note')}
            disabled={submitting}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            Internal note
          </button>
        </div>

        {!isReply && (
          <span className="composer-note-indicator">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            Only visible to support agents
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <textarea
          className={`composer-textarea ${errors.content ? 'has-error' : ''}`}
          placeholder={
            isReply
              ? 'Write a public reply to the customer...'
              : 'Add an internal note visible only to your support team...'
          }
          value={content}
          maxLength={5000}
          onChange={(e) => {
            setContent(e.target.value);
            if (errors.content) setErrors((prev) => ({ ...prev, content: null }));
          }}
          disabled={submitting}
        />
        {errors.content && <span className="form-error">{errors.content}</span>}

        <div className="composer-footer">
          <div className="composer-author-wrap">
            <label className="composer-author-label" htmlFor="composer-author">
              Author:
            </label>
            <select
              id="composer-author"
              className="composer-author-select"
              value={authorId}
              onChange={(e) => {
                setAuthorId(e.target.value);
                if (errors.author_id) setErrors((prev) => ({ ...prev, author_id: null }));
              }}
              disabled={submitting || agents.length === 0}
            >
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </select>
            {errors.author_id && <span className="form-error">{errors.author_id}</span>}
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting || !content.trim()}
          >
            {submitting ? (
              <>
                <Spinner size="sm" />
                Posting...
              </>
            ) : isReply ? (
              'Send public reply'
            ) : (
              'Add internal note'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
