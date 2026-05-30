import dotenv from 'dotenv';
dotenv.config();

// Fail fast if JWT_SECRET is missing or still set to the insecure default
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET === 'your-super-secret-jwt-key-change-in-production') {
  console.error('FATAL: JWT_SECRET is not set or is using the insecure default. Set a strong secret in .env');
  process.exit(1);
}

import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
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

// Rate limiting — auth endpoints: 10 attempts per 15 minutes per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please try again in 15 minutes.' },
});

// General API limiter — 200 requests per minute per IP
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.' },
});

app.use('/api/', apiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);

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
