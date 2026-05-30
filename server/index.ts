import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth';
import documentsRoutes from './routes/documents';
import calculationsRoutes from './routes/calculations';
import { revenueRouter, expenseRouter } from './routes/financials';
import adminRoutes from './routes/admin';

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
app.use('/api/revenue', revenueRouter);
app.use('/api/expenses', expenseRouter);
app.use('/api/admin', adminRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'WittyTax API',
    version: '1.0.0',
    status: 'running',
    endpoints: ['/api/auth', '/api/documents', '/api/calculations', '/api/revenue', '/api/expenses', '/api/health']
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
