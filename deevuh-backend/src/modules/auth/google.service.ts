import { OAuth2Client } from 'google-auth-library';
import env from '../../config/env';

const client = new OAuth2Client(env.GOOGLE_CLIENT_ID);

export async function verifyGoogleToken(token: string) {
  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: env.GOOGLE_CLIENT_ID,
    });
    
    const payload = ticket.getPayload();
    if (!payload) return null;

    return {
      googleId: payload.sub,
      email: payload.email,
      firstName: payload.given_name || 'User',
      lastName: payload.family_name || '',
      avatar: payload.picture,
    };
  } catch (error) {
    console.error('Google token verification failed:', error);
    return null;
  }
}
