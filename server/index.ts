import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth';
import documentsRoutes from './routes/documents';
import calculationsRoutes from './routes/calculations';

const app = express();
const PORT = process.env.SERVER_PORT || 5002;

// Middleware
const corsOptions = {
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
};
app.use(cors(corsOptions));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/calculations', calculationsRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'WittyTax API',
    version: '1.0.0',
    status: 'running',
    endpoints: ['/api/auth', '/api/documents', '/api/calculations', '/api/health']
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Debug endpoint to check DB connection
app.get('/api/debug', async (req, res) => {
  try {
    const { prisma } = await import('./db');
    const count = await prisma.user.count();
    res.json({
      status: 'ok',
      database: 'connected',
      userCount: count,
      env: {
        tursoUrl: process.env.TURSO_DATABASE_URL?.substring(0, 50) + '...',
        tokenLength: process.env.TURSO_AUTH_TOKEN?.length,
        nodeEnv: process.env.NODE_ENV
      }
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: error?.message,
      env: {
        tursoUrl: process.env.TURSO_DATABASE_URL?.substring(0, 50) + '...',
        tokenLength: process.env.TURSO_AUTH_TOKEN?.length,
        nodeEnv: process.env.NODE_ENV
      }
    });
  }
});

app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
