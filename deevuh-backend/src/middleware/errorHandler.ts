import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';

// Custom error class
export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public isOperational: boolean;

  constructor(message: string, statusCode: number, code: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Common error factories
export const Errors = {
  badRequest: (message: string, code = 'BAD_REQUEST') => new AppError(message, 400, code),
  unauthorized: (message = 'Authentication required', code = 'UNAUTHORIZED') => new AppError(message, 401, code),
  forbidden: (message = 'Access denied', code = 'FORBIDDEN') => new AppError(message, 403, code),
  notFound: (resource = 'Resource', code = 'NOT_FOUND') => new AppError(`${resource} not found`, 404, code),
  conflict: (message: string, code = 'CONFLICT') => new AppError(message, 409, code),
  validation: (message: string, code = 'VALIDATION_ERROR') => new AppError(message, 422, code),
  tooMany: (message = 'Too many requests', code = 'RATE_LIMITED') => new AppError(message, 429, code),
  internal: (message = 'Internal server error', code = 'INTERNAL_ERROR') => new AppError(message, 500, code),
};

// Global error handler middleware
export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  // ─── Operational Errors (expected) ───
  if (err instanceof AppError) {
    // Only log server errors (5xx) at error level; 4xx at warn
    if (err.statusCode >= 500) {
      logger.error('Server error', {
        code: err.code,
        message: err.message,
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
      });
    }

    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
      },
    });
    return;
  }

  // ─── Prisma Errors ───
  if (err.constructor.name === 'PrismaClientKnownRequestError') {
    const prismaErr = err as any;
    if (prismaErr.code === 'P2002') {
      res.status(409).json({
        success: false,
        error: {
          code: 'DUPLICATE_ENTRY',
          message: `A record with this ${prismaErr.meta?.target?.join(', ')} already exists`,
        },
      });
      return;
    }
    if (prismaErr.code === 'P2025') {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Record not found' },
      });
      return;
    }
  }

  // ─── Zod Validation Errors ───
  if (err.constructor.name === 'ZodError') {
    const zodErr = err as any;
    res.status(422).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input',
        details: zodErr.errors,
      },
    });
    return;
  }

  // ─── Unknown Errors — log full details, redact from response ───
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
  });

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production'
        ? 'An unexpected error occurred'
        : err.message,
    },
  });
}
