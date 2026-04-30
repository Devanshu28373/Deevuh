import { Request, Response, NextFunction } from 'express';
import { Errors } from './errorHandler';

/**
 * Middleware to restrict access to admin users only.
 * Must be used AFTER the `authenticate` middleware.
 * Checks for roles: SUPER_ADMIN, ADMIN, MANAGER
 */
export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  const user = req.user;
  if (!user) {
    return next(Errors.unauthorized('Authentication required'));
  }

  const adminRoles = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'];
  if (!adminRoles.includes(user.role)) {
    return next(Errors.forbidden('Admin access required'));
  }

  next();
}

/**
 * Restrict to SUPER_ADMIN only (for dangerous operations like user deletion, role changes)
 */
export function requireSuperAdmin(req: Request, _res: Response, next: NextFunction) {
  const user = req.user;
  if (!user) {
    return next(Errors.unauthorized('Authentication required'));
  }

  if (user.role !== 'SUPER_ADMIN') {
    return next(Errors.forbidden('Super admin access required'));
  }

  next();
}
