import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { ErrorBanner } from '../components/ErrorBanner.jsx';
import { Spinner } from '../components/Spinner.jsx';

export function NewTicketPage() {
  const navigate = useNavigate();

  const [agents, setAgents] = useState([]);
  const [loadingAgents, setLoadingAgents] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState(null);

  // Form Fields
  const [formData, setFormData] = useState({
    subject: '',
    customer: '',
    description: '',
    priority: 'Medium',
    status: 'Open',
    assignee_id: ''
  });

  // Validation Errors
  const [errors, setErrors] = useState({});

  useEffect(() => {
    async function loadAgents() {
      try {
        const data = await api.getAgents();
        setAgents(data);
      } catch (err) {
        console.error('Failed to load agents:', err);
      } finally {
        setLoadingAgents(false);
      }
    }
    loadAgents();
  }, []);

  const validate = () => {
    const errs = {};
    const trimmedSubject = formData.subject.trim();
    const trimmedCustomer = formData.customer.trim();
    const trimmedDescription = formData.description.trim();

    if (!trimmedSubject) {
      errs.subject = 'Subject is required';
    } else if (trimmedSubject.length > 200) {
      errs.subject = 'Subject cannot exceed 200 characters';
    }

    if (!trimmedCustomer) {
      errs.customer = 'Customer name or email is required';
    } else if (trimmedCustomer.length > 200) {
      errs.customer = 'Customer cannot exceed 200 characters';
    }

    if (!trimmedDescription) {
      errs.description = 'Description is required';
    } else if (trimmedDescription.length > 5000) {
      errs.description = 'Description cannot exceed 5000 characters';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear field-level error on change
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate() || submitting) return;

    setSubmitting(true);
    setApiError(null);

    const payload = {
      subject: formData.subject.trim(),
      customer: formData.customer.trim(),
      description: formData.description.trim(),
      priority: formData.priority,
      status: formData.status,
      assignee_id: formData.assignee_id ? parseInt(formData.assignee_id, 10) : null
    };

    try {
      const created = await api.createTicket(payload);
      navigate(`/tickets/${created.id}`);
    } catch (err) {
      setApiError(err.message || 'Failed to create ticket.');
      if (err.details) {
        setErrors((prev) => ({ ...prev, ...err.details }));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="new-ticket-container">
      <div className="form-card">
        <div className="form-header">
          <h1 className="form-title">Create new support ticket</h1>
          <p className="form-subtitle">Record a customer issue, assign an agent, and track resolution.</p>
        </div>

        {apiError && <ErrorBanner message={apiError} />}

        <form onSubmit={handleSubmit} noValidate>
          {/* Subject */}
          <div className="form-group">
            <label className="form-label" htmlFor="ticket-subject">
              Subject <span className="form-label-required">*</span>
            </label>
            <input
              id="ticket-subject"
              type="text"
              className={`form-input ${errors.subject ? 'has-error' : ''}`}
              placeholder="e.g. Critical billing failure on Stripe recurring payments"
              value={formData.subject}
              maxLength={200}
              onChange={(e) => handleChange('subject', e.target.value)}
              disabled={submitting}
            />
            {errors.subject && <span className="form-error">{errors.subject}</span>}
            <div className="form-hint">{formData.subject.length}/200 characters</div>
          </div>

          {/* Customer */}
          <div className="form-group">
            <label className="form-label" htmlFor="ticket-customer">
              Customer (Name or Email) <span className="form-label-required">*</span>
            </label>
            <input
              id="ticket-customer"
              type="text"
              className={`form-input ${errors.customer ? 'has-error' : ''}`}
              placeholder="e.g. Elena Rostova or elena@retailhub.io"
              value={formData.customer}
              maxLength={200}
              onChange={(e) => handleChange('customer', e.target.value)}
              disabled={submitting}
            />
            {errors.customer && <span className="form-error">{errors.customer}</span>}
          </div>

          {/* Priority & Status */}
          <div className="form-row-2">
            <div className="form-group">
              <label className="form-label" htmlFor="ticket-priority">
                Priority
              </label>
              <select
                id="ticket-priority"
                className="form-select"
                value={formData.priority}
                onChange={(e) => handleChange('priority', e.target.value)}
                disabled={submitting}
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="ticket-status">
                Status
              </label>
              <select
                id="ticket-status"
                className="form-select"
                value={formData.status}
                onChange={(e) => handleChange('status', e.target.value)}
                disabled={submitting}
              >
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Waiting on Customer">Waiting on Customer</option>
                <option value="Resolved">Resolved</option>
              </select>
            </div>
          </div>

          {/* Assignee */}
          <div className="form-group">
            <label className="form-label" htmlFor="ticket-assignee">
              Assignee (Optional)
            </label>
            <select
              id="ticket-assignee"
              className="form-select"
              value={formData.assignee_id}
              onChange={(e) => handleChange('assignee_id', e.target.value)}
              disabled={submitting || loadingAgents}
            >
              <option value="">Unassigned</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name} ({agent.email})
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div className="form-group">
            <label className="form-label" htmlFor="ticket-description">
              Description <span className="form-label-required">*</span>
            </label>
            <textarea
              id="ticket-description"
              className={`form-textarea ${errors.description ? 'has-error' : ''}`}
              placeholder="Provide full context, reproduction steps, or relevant error logs..."
              value={formData.description}
              maxLength={5000}
              onChange={(e) => handleChange('description', e.target.value)}
              disabled={submitting}
            />
            {errors.description && <span className="form-error">{errors.description}</span>}
            <div className="form-hint">{formData.description.length}/5000 characters</div>
          </div>

          {/* Actions */}
          <div className="form-actions">
            <Link to="/" className="btn btn-secondary" tabIndex={submitting ? -1 : 0}>
              Cancel
            </Link>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? (
                <>
                  <Spinner size="sm" />
                  Creating ticket...
                </>
              ) : (
                'Create ticket'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
