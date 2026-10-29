import express from 'express';
import cors from 'cors';
import agentsRouter from './routes/agents.js';
import dashboardRouter from './routes/dashboard.js';
import ticketsRouter from './routes/tickets.js';
import { errorHandler } from './middleware/errorHandler.js';

export function createApp(db) {
  const app = express();

  if (db) {
    app.locals.db = db;
  }

  const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:3000';
  const allowedOrigins = clientOrigin
    .split(',')
    .map((o) => o.trim().replace(/\/+$/, ''))
    .filter(Boolean);

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, server-to-server, or supertest)
        if (!origin) return callback(null, true);
        const cleanOrigin = origin.replace(/\/+$/, '');
        if (allowedOrigins.includes(cleanOrigin) || allowedOrigins.includes('*')) {
          return callback(null, true);
        }
        return callback(new Error(`CORS blocked for origin: ${origin}`));
      }
    })
  );
  app.use(express.json());

  // Friendly root route listing main API endpoints
  app.get('/', (req, res) => {
    res.json({
      name: 'Support Desk API',
      version: '1.0.0',
      description: 'Mini customer-support ticketing backend',
      endpoints: {
        health: 'GET /api/health',
        agents: 'GET /api/agents',
        dashboard: 'GET /api/dashboard',
        tickets: 'GET /api/tickets',
        ticketById: 'GET /api/tickets/:id',
        createTicket: 'POST /api/tickets',
        updateTicket: 'PATCH /api/tickets/:id',
        deleteTicket: 'DELETE /api/tickets/:id',
        ticketEntries: 'POST /api/tickets/:id/entries'
      }
    });
  });

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Mount routes
  app.use('/api/agents', agentsRouter);
  app.use('/api/dashboard', dashboardRouter);
  app.use('/api/tickets', ticketsRouter);

  // Fallback 404 handler for undefined API routes
  app.use('/api/*', (req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
  });

  // Centralized error handler
  app.use(errorHandler);

  return app;
}

const app = createApp();
export default app;
