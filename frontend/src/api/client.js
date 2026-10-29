// Centralized API client for Support Desk
// All fetch calls live here - no fetch calls inside components

const rawBase = import.meta.env.VITE_API_URL || '/api';
const API_BASE = rawBase.replace(/\/+$/, '');

function buildUrl(path) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  // If API_BASE is the default '/api', keep '/api' paths as-is
  if (API_BASE === '/api') {
    return normalizedPath.startsWith('/api') ? normalizedPath : `/api${normalizedPath}`;
  }

  // If API_BASE already ends with '/api' and path begins with '/api'
  if (API_BASE.endsWith('/api') && normalizedPath.startsWith('/api')) {
    return `${API_BASE}${normalizedPath.slice(4)}`;
  }

  // Otherwise append path directly
  return `${API_BASE}${normalizedPath}`;
}

class ApiError extends Error {
  constructor(message, status = 500, details = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

async function request(path, options = {}) {
  const url = buildUrl(path);
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  };

  let response;
  try {
    response = await fetch(url, config);
  } catch (err) {
    throw new ApiError('Unable to connect to server. Please check your network connection.', 0);
  }

  let data;
  try {
    data = await response.json();
  } catch (err) {
    data = null;
  }

  if (!response.ok) {
    const errorMsg = data?.error || `Request failed with status ${response.status}`;
    const details = data?.details || null;
    throw new ApiError(errorMsg, response.status, details);
  }

  return data;
}

export const api = {
  // Dashboard
  getDashboard() {
    return request('/api/dashboard');
  },

  // Agents
  getAgents() {
    return request('/api/agents');
  },

  // Tickets
  getTickets(filters = {}) {
    const params = new URLSearchParams();

    if (filters.search && filters.search.trim()) {
      params.set('search', filters.search.trim());
    }
    if (filters.status && filters.status !== 'all') {
      params.set('status', filters.status);
    }
    if (filters.priority && filters.priority !== 'all') {
      params.set('priority', filters.priority);
    }
    if (filters.assignee && filters.assignee !== 'all') {
      params.set('assignee', filters.assignee);
    }
    if (filters.sort) {
      params.set('sort', filters.sort);
    }

    const queryStr = params.toString();
    const path = queryStr ? `/api/tickets?${queryStr}` : '/api/tickets';
    return request(path);
  },

  getTicketById(id) {
    return request(`/api/tickets/${id}`);
  },

  createTicket(payload) {
    return request('/api/tickets', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  updateTicket(id, payload) {
    return request(`/api/tickets/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
  },

  createTicketEntry(id, payload) {
    return request(`/api/tickets/${id}/entries`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  deleteTicket(id) {
    return request(`/api/tickets/${id}`, {
      method: 'DELETE'
    });
  }
};
