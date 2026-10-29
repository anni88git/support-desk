import React, { useState, useEffect } from 'react';

export function TicketDetailsForm({
  ticket,
  agents = [],
  onSave,
  saving = false,
  serverErrors = null,
  onDelete = null,
  deleting = false
}) {
  const [formData, setFormData] = useState({
    subject: ticket.subject || '',
    customer: ticket.customer || '',
    description: ticket.description || '',
    status: ticket.status || 'Open',
    priority: ticket.priority || 'Medium',
    assignee_id: ticket.assignee_id !== null && ticket.assignee_id !== undefined ? String(ticket.assignee_id) : ''
  });

  const [errors, setErrors] = useState({});

  // Reset form state when ticket prop changes
  useEffect(() => {
    setFormData({
      subject: ticket.subject || '',
      customer: ticket.customer || '',
      description: ticket.description || '',
      status: ticket.status || 'Open',
      priority: ticket.priority || 'Medium',
      assignee_id: ticket.assignee_id !== null && ticket.assignee_id !== undefined ? String(ticket.assignee_id) : ''
    });
    setErrors({});
  }, [ticket]);

  // Merge server-side detail errors if provided
  useEffect(() => {
    if (serverErrors) {
      setErrors((prev) => ({ ...prev, ...serverErrors }));
    }
  }, [serverErrors]);

  // Compute what actually changed compared to the current ticket
  const getChangedPayload = () => {
    const changes = {};

    const trimmedSub = formData.subject.trim();
    if (trimmedSub !== ticket.subject) {
      changes.subject = trimmedSub;
    }

    const trimmedCust = formData.customer.trim();
    if (trimmedCust !== ticket.customer) {
      changes.customer = trimmedCust;
    }

    const trimmedDesc = formData.description.trim();
    if (trimmedDesc !== ticket.description) {
      changes.description = trimmedDesc;
    }

    if (formData.status !== ticket.status) {
      changes.status = formData.status;
    }

    if (formData.priority !== ticket.priority) {
      changes.priority = formData.priority;
    }

    const currentAssigneeStr =
      ticket.assignee_id !== null && ticket.assignee_id !== undefined ? String(ticket.assignee_id) : '';
    if (formData.assignee_id !== currentAssigneeStr) {
      changes.assignee_id = formData.assignee_id ? parseInt(formData.assignee_id, 10) : null;
    }

    return changes;
  };

  const changedPayload = getChangedPayload();
  const hasChanges = Object.keys(changedPayload).length > 0;

  const validate = () => {
    const errs = {};
    const trimmedSub = formData.subject.trim();
    const trimmedCust = formData.customer.trim();
    const trimmedDesc = formData.description.trim();

    if (!trimmedSub) {
      errs.subject = 'Subject is required';
    } else if (trimmedSub.length > 200) {
      errs.subject = 'Subject cannot exceed 200 characters';
    }

    if (!trimmedCust) {
      errs.customer = 'Customer is required';
    } else if (trimmedCust.length > 200) {
      errs.customer = 'Customer cannot exceed 200 characters';
    }

    if (!trimmedDesc) {
      errs.description = 'Description is required';
    } else if (trimmedDesc.length > 5000) {
      errs.description = 'Description cannot exceed 5000 characters';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!hasChanges || saving || !validate()) return;
    onSave(changedPayload);
  };

  return (
    <form className="detail-card" onSubmit={handleSubmit} noValidate>
      <div className="detail-card-title">
        <span>Ticket Details</span>
        {hasChanges && (
          <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--accent)' }}>
            Unsaved changes
          </span>
        )}
      </div>

      {/* Subject */}
      <div className="form-group">
        <label className="form-label" htmlFor="edit-subject">
          Subject <span className="form-label-required">*</span>
        </label>
        <input
          id="edit-subject"
          type="text"
          className={`form-input ${errors.subject ? 'has-error' : ''}`}
          value={formData.subject}
          maxLength={200}
          onChange={(e) => handleChange('subject', e.target.value)}
          disabled={saving}
        />
        {errors.subject && <span className="form-error">{errors.subject}</span>}
      </div>

      {/* Customer */}
      <div className="form-group">
        <label className="form-label" htmlFor="edit-customer">
          Customer <span className="form-label-required">*</span>
        </label>
        <input
          id="edit-customer"
          type="text"
          className={`form-input ${errors.customer ? 'has-error' : ''}`}
          value={formData.customer}
          maxLength={200}
          onChange={(e) => handleChange('customer', e.target.value)}
          disabled={saving}
        />
        {errors.customer && <span className="form-error">{errors.customer}</span>}
      </div>

      {/* Status & Priority */}
      <div className="form-row-2">
        <div className="form-group">
          <label className="form-label" htmlFor="edit-status">
            Status
          </label>
          <select
            id="edit-status"
            className="form-select"
            value={formData.status}
            onChange={(e) => handleChange('status', e.target.value)}
            disabled={saving}
          >
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="Waiting on Customer">Waiting on Customer</option>
            <option value="Resolved">Resolved</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="edit-priority">
            Priority
          </label>
          <select
            id="edit-priority"
            className="form-select"
            value={formData.priority}
            onChange={(e) => handleChange('priority', e.target.value)}
            disabled={saving}
          >
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Urgent">Urgent</option>
          </select>
        </div>
      </div>

      {/* Assignee */}
      <div className="form-group">
        <label className="form-label" htmlFor="edit-assignee">
          Assignee
        </label>
        <select
          id="edit-assignee"
          className="form-select"
          value={formData.assignee_id}
          onChange={(e) => handleChange('assignee_id', e.target.value)}
          disabled={saving}
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
        <label className="form-label" htmlFor="edit-description">
          Description <span className="form-label-required">*</span>
        </label>
        <textarea
          id="edit-description"
          className={`form-textarea ${errors.description ? 'has-error' : ''}`}
          value={formData.description}
          maxLength={5000}
          onChange={(e) => handleChange('description', e.target.value)}
          disabled={saving}
          style={{ minHeight: '140px' }}
        />
        {errors.description && <span className="form-error">{errors.description}</span>}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
        {onDelete ? (
          <button
            type="button"
            className="btn btn-danger-outline"
            onClick={onDelete}
            disabled={saving || deleting}
            id="btn-delete-ticket-form"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
            {deleting ? 'Deleting ticket...' : 'Delete ticket'}
          </button>
        ) : <div />}

        <button
          type="submit"
          className="btn btn-primary"
          disabled={!hasChanges || saving || deleting}
        >
          {saving ? 'Saving changes...' : 'Save changes'}
        </button>
      </div>
    </form>
  );
}
