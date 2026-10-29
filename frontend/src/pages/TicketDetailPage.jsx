import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { Badge } from '../components/Badge.jsx';
import { Spinner } from '../components/Spinner.jsx';
import { ErrorBanner } from '../components/ErrorBanner.jsx';
import { TicketDetailsForm } from '../components/TicketDetailsForm.jsx';
import { EntryList } from '../components/EntryList.jsx';
import { Composer } from '../components/Composer.jsx';
import { EventTimeline } from '../components/EventTimeline.jsx';

export function TicketDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [ticket, setTicket] = useState(null);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [is404, setIs404] = useState(false);

  // Form saving states
  const [savingDetails, setSavingDetails] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [saveErrors, setSaveErrors] = useState(null);

  // Delete state
  const [deleting, setDeleting] = useState(false);

  // Composer submitting state
  const [submittingEntry, setSubmittingEntry] = useState(false);

  const fetchTicketAndAgents = useCallback(async () => {
    setLoading(true);
    setError(null);
    setIs404(false);

    try {
      const [ticketData, agentsData] = await Promise.all([
        api.getTicketById(id),
        api.getAgents()
      ]);
      setTicket(ticketData);
      setAgents(agentsData);
    } catch (err) {
      if (err.status === 404) {
        setIs404(true);
      } else {
        setError(err.message || 'Failed to load ticket details.');
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTicketAndAgents();
  }, [fetchTicketAndAgents]);

  // Handle saving details (PATCH)
  const handleSaveDetails = async (changedFields) => {
    setSavingDetails(true);
    setSaveSuccessMsg('');
    setSaveErrors(null);

    try {
      const updated = await api.updateTicket(id, changedFields);
      setTicket(updated);
      setSaveSuccessMsg('Ticket updated successfully.');
      setTimeout(() => setSaveSuccessMsg(''), 4000);
    } catch (err) {
      if (err.details) {
        setSaveErrors(err.details);
      } else {
        setError(err.message || 'Failed to update ticket.');
      }
    } finally {
      setSavingDetails(false);
    }
  };

  // Handle adding an entry (POST entries)
  const handleAddEntry = async (entryPayload) => {
    setSubmittingEntry(true);
    setError(null);

    try {
      await api.createTicketEntry(id, entryPayload);
      // Refetch ticket so entries, events, and updated_at are completely refreshed
      const freshTicket = await api.getTicketById(id);
      setTicket(freshTicket);
      return true;
    } catch (err) {
      setError(err.message || 'Failed to post entry.');
      return false;
    } finally {
      setSubmittingEntry(false);
    }
  };

  // Handle deleting ticket (DELETE)
  const handleDelete = async () => {
    const confirmed = window.confirm(
      'This permanently deletes the ticket, its replies, notes and history.'
    );
    if (!confirmed) return;

    setDeleting(true);
    setError(null);

    try {
      await api.deleteTicket(id);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Failed to delete ticket.');
      setDeleting(false);
    }
  };

  if (loading) {
    return <Spinner label="Loading ticket details..." />;
  }

  if (is404) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
          Ticket #{id} not found
        </h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
          The ticket you are looking for does not exist or may have been removed.
        </p>
        <Link to="/" className="btn btn-secondary">
          ← Back to tickets
        </Link>
      </div>
    );
  }

  if (error && !ticket) {
    return (
      <div>
        <ErrorBanner message={error} onRetry={fetchTicketAndAgents} />
        <Link to="/" className="btn btn-secondary" style={{ marginTop: '12px' }}>
          ← Back to tickets
        </Link>
      </div>
    );
  }

  if (!ticket) return null;

  return (
    <div className="ticket-detail-page">
      {/* Top Header & Back Link & Delete Button */}
      <div className="detail-page-header">
        <div className="detail-header-top">
          <Link to="/" className="detail-back-link">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Back to tickets
          </Link>

          <button
            type="button"
            className="btn btn-danger-outline btn-sm"
            onClick={handleDelete}
            disabled={deleting}
            id="btn-delete-ticket-header"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '5px' }}>
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
            {deleting ? 'Deleting...' : 'Delete ticket'}
          </button>
        </div>

        <div className="detail-header-main">
          <div className="detail-title-row">
            <span className="detail-ticket-id">#{ticket.id}</span>
            <h1 className="detail-ticket-title">{ticket.subject}</h1>
          </div>

          <div className="detail-badges-row">
            <Badge type="status" value={ticket.status} />
            <Badge type="priority" value={ticket.priority} />
            {ticket.is_overdue && <Badge type="overdue" />}
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)', marginLeft: '4px' }}>
              Customer: <strong style={{ color: 'var(--text-primary)' }}>{ticket.customer}</strong>
            </span>
          </div>
        </div>
      </div>

      {error && <ErrorBanner message={error} onRetry={fetchTicketAndAgents} />}
      {saveSuccessMsg && (
        <div className="save-success-banner">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          {saveSuccessMsg}
        </div>
      )}

      {/* Two Column Grid */}
      <div className="detail-grid">
        {/* Left Column: Editable Details + Conversation + Composer */}
        <div className="detail-col-main">
          {/* Editable Ticket Details Form */}
          <TicketDetailsForm
            ticket={ticket}
            agents={agents}
            onSave={handleSaveDetails}
            saving={savingDetails}
            serverErrors={saveErrors}
            onDelete={handleDelete}
            deleting={deleting}
          />

          {/* Conversation Section */}
          <div className="conversation-section">
            <h2 className="conversation-heading">Conversation</h2>
            <EntryList entries={ticket.entries} />
            <Composer
              agents={agents}
              onSubmit={handleAddEntry}
              submitting={submittingEntry}
            />
          </div>
        </div>

        {/* Right Column: Activity Event Timeline */}
        <div className="detail-col-sidebar">
          <EventTimeline events={ticket.events} />
        </div>
      </div>
    </div>
  );
}
