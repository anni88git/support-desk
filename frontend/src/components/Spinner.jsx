import React from 'react';

export function Spinner({ size = 'md', label = null }) {
  const spinnerClass = size === 'sm' ? 'spinner spinner-sm' : 'spinner';

  if (!label && size === 'sm') {
    return <div className={spinnerClass} />;
  }

  return (
    <div className="spinner-container">
      <div className={spinnerClass} />
      {label && <span>{label}</span>}
    </div>
  );
}
