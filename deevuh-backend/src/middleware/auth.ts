import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import env from '../config/env';
import { Errors } from './errorHandler';
import { Role } from '@prisma/client';

export interface AuthPayload {
  userId: string;
  email: string;
  role: Role;
}

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

/**
 * Verifies JWT access token from Authorization header.
 */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next(Errors.unauthorized('Missing or invalid authorization header'));
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as AuthPayload;
    req.user = payload;
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      next(Errors.unauthorized('Token expired', 'TOKEN_EXPIRED'));
    } else {
      next(Errors.unauthorized('Invalid token', 'INVALID_TOKEN'));
    }
  }
}

/**
 * Optional auth — attaches user if token present, but doesn't require it.
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next();
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    req.user = jwt.verify(token, env.JWT_ACCESS_SECRET) as AuthPayload;
  } catch {
    // Silently ignore invalid tokens for optional auth
  }
  next();
}

/**
 * Role-based authorization — must be used AFTER authenticate.
 */
export function authorize(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(Errors.unauthorized());
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(Errors.forbidden('You do not have permission to access this resource'));
      return;
    }
    next();
  };
}
