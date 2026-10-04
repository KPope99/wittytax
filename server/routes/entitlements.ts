import { Router, Request, Response } from 'express';
import { prisma } from '../db';
import { requireAdmin, checkAdmin } from './admin';
import {
  ingestEntitlementBatch,
  reconcileEntitlements,
  runExpiryJob,
  revokeEntitlement,
} from '../services/entitlements';

const router = Router();

// POST /api/admin/entitlements/ingest — upload a partner's qualifying-member list
router.post('/ingest', requireAdmin, async (req: Request, res: Response) => {
  if (!(await checkAdmin(req, res))) return;

  const { partnerId, entries, validityYears } = req.body;

  if (!partnerId || typeof partnerId !== 'string') {
    return res.status(400).json({ error: 'partnerId is required' });
  }
  if (!Array.isArray(entries) || entries.length === 0) {
    return res.status(400).json({ error: 'entries must be a non-empty array of { matchType, matchValue }' });
  }

  try {
    const result = await ingestEntitlementBatch(
      partnerId,
      entries,
      Number(validityYears) || 3,
      (req as any).userId
    );
    res.status(201).json(result);
  } catch (error) {
    console.error('Entitlement ingest error:', error);
    res.status(500).json({ error: 'Failed to ingest entitlement batch' });
  }
});

// GET /api/admin/entitlements — list entitlements, optionally filtered by status/partner
router.get('/', requireAdmin, async (req: Request, res: Response) => {
  if (!(await checkAdmin(req, res))) return;

  const { status, partnerId } = req.query;
  const entitlements = await prisma.partnerEntitlement.findMany({
    where: {
      ...(status && { status: status as string }),
      ...(partnerId && { partnerId: partnerId as string }),
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  res.json({ entitlements });
});

// POST /api/admin/entitlements/reconcile — manually re-run matching against existing users
router.post('/reconcile', requireAdmin, async (req: Request, res: Response) => {
  if (!(await checkAdmin(req, res))) return;
  const result = await reconcileEntitlements();
  res.json(result);
});

// POST /api/admin/entitlements/expire-check — manually trigger the expiry sweep
router.post('/expire-check', requireAdmin, async (req: Request, res: Response) => {
  if (!(await checkAdmin(req, res))) return;
  const result = await runExpiryJob();
  res.json(result);
});

// POST /api/admin/entitlements/:id/revoke — immediate revocation (e.g. loan closed early)
router.post('/:id/revoke', requireAdmin, async (req: Request, res: Response) => {
  if (!(await checkAdmin(req, res))) return;
  const { id } = req.params;
  const { notes } = req.body;

  try {
    const result = await revokeEntitlement(id as string, (req as any).userId, notes);
    res.json(result);
  } catch (error) {
    console.error('Entitlement revoke error:', error);
    res.status(500).json({ error: 'Failed to revoke entitlement' });
  }
});

export default router;
