import React from 'react';

export function Badge({ type, value, isOverdue = false }) {
  if (type === 'status') {
    let className = 'badge-status-open';
    if (value === 'In Progress') className = 'badge-status-inprogress';
    else if (value === 'Waiting on Customer') className = 'badge-status-waiting';
    else if (value === 'Resolved') className = 'badge-status-resolved';

    return <span className={`badge ${className}`}>{value}</span>;
  }

  if (type === 'priority') {
    let className = 'badge-priority-medium';
    if (value === 'Low') className = 'badge-priority-low';
    else if (value === 'High') className = 'badge-priority-high';
    else if (value === 'Urgent') className = 'badge-priority-urgent';

    return <span className={`badge ${className}`}>{value}</span>;
  }

  if (type === 'overdue' || isOverdue) {
    return <span className="badge badge-overdue">Overdue</span>;
  }

  return <span className="badge">{value}</span>;
}
