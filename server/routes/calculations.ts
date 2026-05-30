import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../db';
import { validateEnum, collectErrors } from '../utils/validate';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET!;

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

router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const calculations = await prisma.taxCalculation.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    const parsed = calculations.map((calc) => ({
      ...calc,
      result: typeof calc.result === 'string' ? JSON.parse(calc.result) : calc.result,
    }));
    res.json({ calculations: parsed });
  } catch (error) {
    console.error('Get calculations error:', error);
    res.status(500).json({ error: 'Failed to fetch calculations' });
  }
});

router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { type, result } = req.body;

    const errors = collectErrors(
      validateEnum(type, 'type', ['personal', 'company']),
    );
    if (errors.length) return res.status(400).json({ errors });

    if (result === undefined || result === null) {
      return res.status(400).json({ errors: [{ field: 'result', message: 'result is required' }] });
    }

    const calculation = await prisma.taxCalculation.create({
      data: {
        type,
        result: typeof result === 'string' ? result : JSON.stringify(result),
        userId,
      },
    });

    res.status(201).json({
      calculation: {
        ...calculation,
        result: typeof calculation.result === 'string' ? JSON.parse(calculation.result) : calculation.result,
      },
    });
  } catch (error) {
    console.error('Create calculation error:', error);
    res.status(500).json({ error: 'Failed to save calculation' });
  }
});

export default router;
