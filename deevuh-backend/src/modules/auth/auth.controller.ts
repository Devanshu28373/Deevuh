import { Request, Response, NextFunction } from 'express';
import * as authService from './auth.service';
import { sendSuccess, sendCreated, sendNoContent } from '../../shared/utils/apiResponse';

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await authService.register(req.body);
    sendCreated(res, result);
  } catch (err) { next(err); }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await authService.login(req.body);
    sendSuccess(res, result);
  } catch (err) { next(err); }
}

export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await authService.refreshTokens(req.body.refreshToken);
    sendSuccess(res, result);
  } catch (err) { next(err); }
}

export async function forgotPassword(req: Request, res: Response, next: NextFunction) {
  try {
    await authService.forgotPassword(req.body.email);
    sendSuccess(res, { message: 'If an account exists with this email, a reset link has been sent.' });
  } catch (err) { next(err); }
}

export async function resetPassword(req: Request, res: Response, next: NextFunction) {
  try {
    await authService.resetPassword(req.body.token, req.body.password);
    sendSuccess(res, { message: 'Password has been reset successfully.' });
  } catch (err) { next(err); }
}

export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    await authService.logout(req.user!.userId);
    sendNoContent(res);
  } catch (err) { next(err); }
}

export async function googleLogin(req: Request, res: Response, next: NextFunction) {
  try {
    const { idToken } = req.body;
    const googleUser = await require('./google.service').verifyGoogleToken(idToken);
    
    if (!googleUser) {
      throw require('../../middleware/errorHandler').Errors.unauthorized('Invalid Google token');
    }

    const result = await authService.googleLogin(googleUser);
    sendSuccess(res, result);
  } catch (err) { next(err); }
}
