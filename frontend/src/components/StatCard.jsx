import React from 'react';

export function StatCard({ label, value, isUrgent = false, isOverdue = false }) {
  const numberClass = isUrgent
    ? 'stat-number urgent-tint'
    : isOverdue
    ? 'stat-number overdue-tint'
    : 'stat-number';

  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className={numberClass}>{value ?? 0}</div>
    </div>
  );
}
