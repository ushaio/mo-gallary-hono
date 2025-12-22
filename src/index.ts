import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import auth from './routes/auth.js';
import photos from './routes/photos.js';
import settings from './routes/settings.js';

const app = new Hono();

// Middleware
app.use('*', logger());
app.use(
  '*',
  cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  }),
);

// Serve static files
app.use('/uploads/*', serveStatic({ root: './public' }));

// Health check
app.get('/', (c) => {
  return c.json({
    message: 'MO Gallery API - Hono.js',
    version: '1.0.0',
    status: 'running',
  });
});

// API routes
app.route('/api/auth', auth);
app.route('/api', photos);
app.route('/api/admin/settings', settings);

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not found' }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('Server error:', err);
  return c.json({ error: 'Internal server error' }, 500);
});

const port = parseInt(process.env.PORT || '8787');

console.log(`🚀 Server is starting on port ${port}...`);

serve({
  fetch: app.fetch,
  port,
});

console.log(`✨ Server is running on http://localhost:${port}`);
