import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.config';
import { UserJWTPayload } from '../types';
import { prisma } from '../prisma/client';

export interface AuthenticatedRequest extends Request {
  user?: UserJWTPayload;
}

export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // In development, if no token provided, fallback to default demo user so testing APIs is seamless
      if (env.NODE_ENV === 'development') {
        let defaultUser = await prisma.user.findFirst();
        if (!defaultUser) {
          defaultUser = await prisma.user.create({
            data: {
              email: 'demo@reachinbox.ai',
              name: 'Demo User',
              avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
            },
          });
        }
        req.user = {
          id: defaultUser.id,
          email: defaultUser.email,
          name: defaultUser.name,
        };
        return next();
      }

      res.status(401).json({
        success: false,
        message: 'Authentication token is required',
      });
      return;
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, env.JWT_SECRET) as UserJWTPayload;

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
    });

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'User no longer exists',
      });
      return;
    }

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
    };

    next();
  } catch (error: any) {
    res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
      error: error.message,
    });
  }
}
