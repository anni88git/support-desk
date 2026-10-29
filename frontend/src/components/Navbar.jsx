import React from 'react';
import { Link } from 'react-router-dom';

export function Navbar() {
  return (
    <header className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="nav-brand">
          <span className="nav-brand-dot" />
          <span>Support Desk</span>
        </Link>
        <div className="nav-actions">
          <Link to="/tickets/new" className="btn btn-primary">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New ticket
          </Link>
        </div>
      </div>
    </header>
  );
}
