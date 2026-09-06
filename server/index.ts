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
import entitlementsRoutes from './routes/entitlements';
import forecastRoutes from './routes/forecast';
import recommendationsRoutes from './routes/recommendations';
import { runExpiryJob } from './services/entitlements';
import { checkDeadlineReminders } from './services/deadlineReminders';

const app = express();
const PORT = process.env.SERVER_PORT || 5002;

// Trust the first hop only (nginx reverse proxy on the same host) so that
// express-rate-limit and req.ip see the real client IP from X-Forwarded-For
// instead of treating every request as coming from nginx's loopback address.
app.set('trust proxy', 1);

// Middleware
const allowedOrigins = (process.env.CORS_ORIGIN || '*').split(',').map((o) => o.trim());
const corsOptions = {
  origin: allowedOrigins.includes('*') ? '*' : allowedOrigins,
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
app.use('/api/admin/entitlements', entitlementsRoutes);
app.use('/api/forecast', forecastRoutes);
app.use('/api/recommendations', recommendationsRoutes);

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

// Sweep for expired partner entitlements every 6 hours. The process runs
// continuously under Docker's restart policy, so setInterval is sufficient
// here without pulling in a separate cron dependency.
const SIX_HOURS = 6 * 60 * 60 * 1000;
setInterval(() => {
  runExpiryJob()
    .then(({ expiredEntitlements, downgradedUsers }) => {
      if (expiredEntitlements > 0) {
        console.log(`Entitlement expiry sweep: ${expiredEntitlements} expired, ${downgradedUsers} users downgraded`);
      }
    })
    .catch((err) => console.error('Entitlement expiry sweep failed:', err));
}, SIX_HOURS);

// Sends the 3-week and 1-week filing deadline reminder emails to all
// registered users. Checking every 6 hours is far more often than needed for
// day-granularity reminders, but it's cheap and guarantees the campaign
// fires promptly once its window opens; deadlineReminders.ts guards against
// double-sending via a DB log keyed on (campaign, deadline).
checkDeadlineReminders().catch((err) => console.error('Deadline reminder check failed:', err));
setInterval(() => {
  checkDeadlineReminders().catch((err) => console.error('Deadline reminder check failed:', err));
}, SIX_HOURS);
