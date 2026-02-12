import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../db';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';

// Middleware to verify token
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

// Get all calculations for user
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    const calculations = await prisma.taxCalculation.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    // Parse result JSON strings back to objects
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

// Create calculation
router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { type, result } = req.body;

    const calculation = await prisma.taxCalculation.create({
      data: {
        type,
        result: typeof result === 'string' ? result : JSON.stringify(result),
        userId,
      },
    });

    // Return parsed result for frontend
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
