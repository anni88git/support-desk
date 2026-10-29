import React, { useState, useEffect } from 'react';

export function FilterBar({ filters, onChange, onClear, agents = [] }) {
  const [searchInput, setSearchInput] = useState(filters.search || '');

  // 300ms debounce for search input
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== filters.search) {
        onChange({ ...filters, search: searchInput });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput]);

  // Sync external filter clears back to search input
  useEffect(() => {
    setSearchInput(filters.search || '');
  }, [filters.search]);

  const hasActiveFilters = Boolean(
    filters.search ||
    (filters.status && filters.status !== 'all') ||
    (filters.priority && filters.priority !== 'all') ||
    (filters.assignee && filters.assignee !== 'all') ||
    (filters.sort && filters.sort !== 'updated')
  );

  return (
    <div className="filter-bar">
      <div className="filter-group-left">
        {/* Debounced Search */}
        <div className="search-input-wrap">
          <svg
            className="search-icon"
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="search-input"
            placeholder="Search subject or customer..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>

        {/* Status Filter */}
        <select
          className="select-filter"
          value={filters.status || 'all'}
          onChange={(e) => onChange({ ...filters, status: e.target.value })}
        >
          <option value="all">All statuses</option>
          <option value="Open">Open</option>
          <option value="In Progress">In Progress</option>
          <option value="Waiting on Customer">Waiting on Customer</option>
          <option value="Resolved">Resolved</option>
        </select>

        {/* Priority Filter */}
        <select
          className="select-filter"
          value={filters.priority || 'all'}
          onChange={(e) => onChange({ ...filters, priority: e.target.value })}
        >
          <option value="all">All priorities</option>
          <option value="Urgent">Urgent</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>

        {/* Assignee Filter */}
        <select
          className="select-filter"
          value={filters.assignee || 'all'}
          onChange={(e) => onChange({ ...filters, assignee: e.target.value })}
        >
          <option value="all">All assignees</option>
          <option value="unassigned">Unassigned</option>
          {agents.map((agent) => (
            <option key={agent.id} value={agent.id}>
              {agent.name}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-group-right">
        {/* Sort Dropdown */}
        <select
          className="select-filter"
          value={filters.sort || 'updated'}
          onChange={(e) => onChange({ ...filters, sort: e.target.value })}
        >
          <option value="updated">Recently updated</option>
          <option value="priority">Priority</option>
        </select>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <button type="button" className="btn btn-ghost" onClick={onClear}>
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
