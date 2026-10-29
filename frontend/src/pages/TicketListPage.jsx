import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client.js';
import { StatCard } from '../components/StatCard.jsx';
import { FilterBar } from '../components/FilterBar.jsx';
import { TicketTable } from '../components/TicketTable.jsx';
import { Spinner } from '../components/Spinner.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { ErrorBanner } from '../components/ErrorBanner.jsx';

export function TicketListPage() {
  const [dashboard, setDashboard] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    priority: 'all',
    assignee: 'all',
    sort: 'updated'
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashData, ticketsData, agentsData] = await Promise.all([
        api.getDashboard(),
        api.getTickets(filters),
        api.getAgents()
      ]);
      setDashboard(dashData);
      setTickets(ticketsData);
      setAgents(agentsData);
    } catch (err) {
      setError(err.message || 'Failed to load tickets. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleClearFilters = () => {
    setFilters({
      search: '',
      status: 'all',
      priority: 'all',
      assignee: 'all',
      sort: 'updated'
    });
  };

  const isFiltering = Boolean(
    filters.search ||
    filters.status !== 'all' ||
    filters.priority !== 'all' ||
    filters.assignee !== 'all' ||
    filters.sort !== 'updated'
  );

  return (
    <div className="ticket-list-page">
      {/* Error Banner with Retry */}
      {error && <ErrorBanner message={error} onRetry={fetchData} />}

      {/* Dashboard Stat Tiles */}
      {dashboard && (
        <div className="dashboard-grid">
          <StatCard label="Total" value={dashboard.total} />
          <StatCard label="Open" value={dashboard.open} />
          <StatCard label="In Progress" value={dashboard.in_progress} />
          <StatCard label="Resolved" value={dashboard.resolved} />
          <StatCard label="Urgent" value={dashboard.urgent} isUrgent />
          <StatCard label="Overdue" value={dashboard.overdue} isOverdue />
        </div>
      )}

      {/* Search & Filter Bar */}
      <FilterBar
        filters={filters}
        onChange={setFilters}
        onClear={handleClearFilters}
        agents={agents}
      />

      {/* Main Table / Loading / Empty State */}
      {loading ? (
        <Spinner label="Loading tickets..." />
      ) : tickets.length > 0 ? (
        <TicketTable tickets={tickets} />
      ) : isFiltering ? (
        <EmptyState
          title="No tickets match your filters"
          description="Try adjusting your search terms, status, priority, or assignee filters."
          actionLabel="Clear all filters"
          onAction={handleClearFilters}
        />
      ) : (
        <EmptyState
          title="No tickets yet"
          description="Create your first customer support ticket to get started."
        />
      )}
    </div>
  );
}
