import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../db';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';

const authenticate = (req: Request, res: Response, next: Function) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    (req as any).userId = decoded.userId;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// ─── Revenue ───────────────────────────────────────────────────────────────

export const revenueRouter = Router();

revenueRouter.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const revenues = await prisma.revenue.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
    });
    res.json({ revenues });
  } catch (error) {
    console.error('Get revenues error:', error);
    res.status(500).json({ error: 'Failed to fetch revenues' });
  }
});

revenueRouter.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { description, amount, category, date, reference, notes } = req.body;

    if (!description || amount === undefined || !category || !date) {
      return res.status(400).json({ error: 'description, amount, category, and date are required' });
    }

    const revenue = await prisma.revenue.create({
      data: {
        description,
        amount: parseFloat(amount),
        category,
        date: new Date(date),
        reference: reference || null,
        notes: notes || null,
        userId,
      },
    });

    res.status(201).json({ revenue });
  } catch (error) {
    console.error('Create revenue error:', error);
    res.status(500).json({ error: 'Failed to create revenue' });
  }
});

revenueRouter.delete('/', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.body;

    const revenue = await prisma.revenue.findFirst({ where: { id, userId } });
    if (!revenue) {
      return res.status(404).json({ error: 'Revenue entry not found' });
    }

    await prisma.revenue.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    console.error('Delete revenue error:', error);
    res.status(500).json({ error: 'Failed to delete revenue' });
  }
});

// ─── Expenses ──────────────────────────────────────────────────────────────

export const expenseRouter = Router();

expenseRouter.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const expenses = await prisma.expense.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
    });
    res.json({ expenses });
  } catch (error) {
    console.error('Get expenses error:', error);
    res.status(500).json({ error: 'Failed to fetch expenses' });
  }
});

expenseRouter.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { description, amount, category, date, reference, notes } = req.body;

    if (!description || amount === undefined || !category || !date) {
      return res.status(400).json({ error: 'description, amount, category, and date are required' });
    }

    const expense = await prisma.expense.create({
      data: {
        description,
        amount: parseFloat(amount),
        category,
        date: new Date(date),
        reference: reference || null,
        notes: notes || null,
        userId,
      },
    });

    res.status(201).json({ expense });
  } catch (error) {
    console.error('Create expense error:', error);
    res.status(500).json({ error: 'Failed to create expense' });
  }
});

expenseRouter.delete('/', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.body;

    const expense = await prisma.expense.findFirst({ where: { id, userId } });
    if (!expense) {
      return res.status(404).json({ error: 'Expense entry not found' });
    }

    await prisma.expense.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    console.error('Delete expense error:', error);
    res.status(500).json({ error: 'Failed to delete expense' });
  }
});
