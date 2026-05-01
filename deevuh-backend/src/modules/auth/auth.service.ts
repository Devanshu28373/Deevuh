import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../../config/database';
import redis, { RedisKeys, RedisTTL } from '../../config/redis';
import env from '../../config/env';
import { Errors } from '../../middleware/errorHandler';
import { AuthPayload } from '../../middleware/auth';
import type { RegisterInput, LoginInput } from './auth.schemas';

const BCRYPT_ROUNDS = 12;

function generateAccessToken(payload: AuthPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: '15m' });
}

function generateRefreshToken(payload: AuthPayload): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
}

export async function register(input: RegisterInput) {
  // Check if email exists
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw Errors.conflict('An account with this email already exists', 'EMAIL_EXISTS');
  }

  // Hash password
  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

  // Create user
  const user = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      createdAt: true,
    },
  });

  // Generate tokens
  const tokenPayload: AuthPayload = { userId: user.id, email: user.email, role: user.role };
  const accessToken = generateAccessToken(tokenPayload);
  const refreshToken = generateRefreshToken(tokenPayload);

  // Store refresh token in Redis
  await redis.set(RedisKeys.refreshToken(user.id), refreshToken, 'EX', RedisTTL.refreshToken);

  return { user, accessToken, refreshToken };
}

export async function login(input: LoginInput) {
  // Find user — same error message whether user exists or not (prevents enumeration)
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user || !user.passwordHash) {
    throw Errors.unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');
  }

  // Verify password
  const isValid = await bcrypt.compare(input.password, user.passwordHash);
  if (!isValid) {
    throw Errors.unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');
  }

  // Generate tokens
  const tokenPayload: AuthPayload = { userId: user.id, email: user.email, role: user.role };
  const accessToken = generateAccessToken(tokenPayload);
  const refreshToken = generateRefreshToken(tokenPayload);

  // Store refresh token
  await redis.set(RedisKeys.refreshToken(user.id), refreshToken, 'EX', RedisTTL.refreshToken);

  return {
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    },
    accessToken,
    refreshToken,
  };
}

export async function googleLogin(googleData: { googleId: string; email: string; firstName: string; lastName: string; avatar?: string }) {
  // Find user by googleId or email
  let user = await prisma.user.findFirst({
    where: {
      OR: [
        { googleId: googleData.googleId },
        { email: googleData.email }
      ]
    }
  });

  if (user) {
    // Update googleId if not set (first time logging in via Google for existing email user)
    if (!user.googleId) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { googleId: googleData.googleId }
      });
    }
  } else {
    // Create new user
    user = await prisma.user.create({
      data: {
        email: googleData.email,
        googleId: googleData.googleId,
        firstName: googleData.firstName,
        lastName: googleData.lastName,
        avatar: googleData.avatar,
        isEmailVerified: true // Google emails are verified
      }
    });
  }

  // Generate tokens
  const tokenPayload: AuthPayload = { userId: user.id, email: user.email, role: user.role };
  const accessToken = generateAccessToken(tokenPayload);
  const refreshToken = generateRefreshToken(tokenPayload);

  // Store refresh token
  await redis.set(RedisKeys.refreshToken(user.id), refreshToken, 'EX', RedisTTL.refreshToken);

  return {
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    },
    accessToken,
    refreshToken,
  };
}

export async function refreshTokens(currentRefreshToken: string) {
  // Verify refresh token
  let payload: AuthPayload;
  try {
    payload = jwt.verify(currentRefreshToken, env.JWT_REFRESH_SECRET) as AuthPayload;
  } catch {
    throw Errors.unauthorized('Invalid refresh token', 'INVALID_REFRESH_TOKEN');
  }

  // Check if refresh token matches what's in Redis (rotation check)
  const storedToken = await redis.get(RedisKeys.refreshToken(payload.userId));
  if (!storedToken || storedToken !== currentRefreshToken) {
    // Token reuse detected — invalidate all sessions
    await redis.del(RedisKeys.refreshToken(payload.userId));
    throw Errors.unauthorized('Refresh token has been revoked', 'TOKEN_REVOKED');
  }

  // Fetch fresh user data
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, email: true, role: true },
  });
  if (!user) {
    throw Errors.unauthorized('User not found', 'USER_NOT_FOUND');
  }

  // Rotate tokens
  const newPayload: AuthPayload = { userId: user.id, email: user.email, role: user.role };
  const newAccessToken = generateAccessToken(newPayload);
  const newRefreshToken = generateRefreshToken(newPayload);

  await redis.set(RedisKeys.refreshToken(user.id), newRefreshToken, 'EX', RedisTTL.refreshToken);

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
}

export async function forgotPassword(email: string) {
  // Always return success (prevents email enumeration)
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return;

  // Generate reset token
  const resetToken = uuidv4();
  await redis.set(RedisKeys.resetToken(resetToken), user.id, 'EX', RedisTTL.resetToken);

  // TODO: Send email via Resend with reset link
  console.log(`Password reset link: ${env.FRONTEND_URL}/reset-password?token=${resetToken}`);
}

export async function resetPassword(token: string, newPassword: string) {
  // Validate reset token
  const userId = await redis.get(RedisKeys.resetToken(token));
  if (!userId) {
    throw Errors.badRequest('Invalid or expired reset token', 'INVALID_RESET_TOKEN');
  }

  // Hash new password
  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

  // Update password
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });

  // Delete used token (single-use)
  await redis.del(RedisKeys.resetToken(token));

  // Invalidate existing sessions
  await redis.del(RedisKeys.refreshToken(userId));
}

export async function logout(userId: string) {
  await redis.del(RedisKeys.refreshToken(userId));
}
