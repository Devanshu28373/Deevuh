/**
 * Frontend Environment Variable Validation
 * Validates all required NEXT_PUBLIC_ env vars at import time.
 * Import this module early (e.g., in layout or api client) to catch
 * misconfiguration before the app renders.
 */

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `❌ Missing required environment variable: ${key}\n` +
      `   Check your .env.local file and ensure ${key} is set.`
    );
  }
  return value;
}

function optionalEnv(key: string, fallback: string): string {
  return process.env[key] || fallback;
}

/** Validated frontend environment */
export const env = {
  /** Backend API base URL (no trailing slash) */
  NEXT_PUBLIC_API_URL: requireEnv('NEXT_PUBLIC_API_URL'),

  /** Razorpay publishable key for checkout */
  NEXT_PUBLIC_RAZORPAY_KEY_ID: optionalEnv('NEXT_PUBLIC_RAZORPAY_KEY_ID', ''),

  /** Public site URL */
  NEXT_PUBLIC_SITE_URL: optionalEnv('NEXT_PUBLIC_SITE_URL', 'http://localhost:3000'),

  /** Google OAuth client ID */
  NEXT_PUBLIC_GOOGLE_CLIENT_ID: optionalEnv('NEXT_PUBLIC_GOOGLE_CLIENT_ID', ''),
} as const;
