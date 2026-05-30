import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../db';
import { sendPremiumUpgradeEmail } from '../services/email';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET!;

// Middleware: require authenticated admin
function requireAdmin(req: Request, res: Response, next: Function) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  try {
    const decoded = jwt.verify(authHeader.substring(7), JWT_SECRET) as { userId: string };
    (req as any).userId = decoded.userId;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

async function checkAdmin(req: Request, res: Response): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: (req as any).userId },
    select: { role: true },
  });
  if (!user || user.role !== 'admin') {
    res.status(403).json({ error: 'Admin access required' });
    return false;
  }
  return true;
}

// GET /api/admin/users — list users with pagination (admin only)
router.get('/users', requireAdmin, async (req: Request, res: Response) => {
  if (!(await checkAdmin(req, res))) return;

  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 10));
  const skip = (page - 1) * limit;

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      select: { id: true, email: true, companyName: true, role: true, group: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.user.count(),
  ]);

  res.json({ users, total, page, limit, totalPages: Math.ceil(total / limit) });
});

// PATCH /api/admin/users/:id — update role or group (admin only)
router.patch('/users/:id', requireAdmin, async (req: Request, res: Response) => {
  if (!(await checkAdmin(req, res))) return;

  const { id } = req.params;
  const { role, group } = req.body;

  const validRoles = ['user', 'admin'];
  const validGroups = ['standard', 'premium'];

  if (role && !validRoles.includes(role)) {
    return res.status(400).json({ error: 'Invalid role. Must be "user" or "admin"' });
  }
  if (group && !validGroups.includes(group)) {
    return res.status(400).json({ error: 'Invalid group. Must be "standard" or "premium"' });
  }

  const target = await prisma.user.findUnique({ where: { id: id as string } });
  if (!target) return res.status(404).json({ error: 'User not found' });

  const updated = await prisma.user.update({
    where: { id: id as string },
    data: { ...(role && { role: role as string }), ...(group && { group: group as string }) },
    select: { id: true, email: true, companyName: true, role: true, group: true, createdAt: true },
  });

  // Notify user when upgraded to Premium
  if (group === 'premium' && target.group !== 'premium') {
    sendPremiumUpgradeEmail({ to: updated.email, companyName: updated.companyName }).catch((err) => {
      console.error('Failed to send premium upgrade email:', err);
    });
  }

  res.json({ user: updated });
});

// POST /api/admin/promote-self — one-time: make yourself admin if no admin exists
router.post('/promote-self', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  let userId: string;
  try {
    const decoded = jwt.verify(authHeader.substring(7), JWT_SECRET) as { userId: string };
    userId = decoded.userId;
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }

  const adminCount = await prisma.user.count({ where: { role: 'admin' } });
  if (adminCount > 0) {
    return res.status(403).json({ error: 'An admin already exists. Contact your admin.' });
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { role: 'admin' },
    select: { id: true, email: true, companyName: true, role: true, group: true, createdAt: true },
  });

  res.json({ user, message: 'You are now an admin' });
});

export default router;
