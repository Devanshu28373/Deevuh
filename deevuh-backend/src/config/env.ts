import { cleanEnv, str, port, url } from 'envalid';
import dotenv from 'dotenv';

dotenv.config();

const env = cleanEnv(process.env, {
  NODE_ENV: str({ choices: ['development', 'test', 'production'], default: 'development' }),
  PORT: port({ default: 5000 }),

  DATABASE_URL: url(),
  REDIS_URL: url({ default: 'redis://localhost:6379' }),

  JWT_ACCESS_SECRET: str(),
  JWT_REFRESH_SECRET: str(),

  RAZORPAY_KEY_ID: str({ default: '' }),
  RAZORPAY_KEY_SECRET: str({ default: '' }),
  RAZORPAY_WEBHOOK_SECRET: str({ default: '' }),

  SHIPROCKET_EMAIL: str({ default: '' }),
  SHIPROCKET_PASSWORD: str({ default: '' }),

  AWS_ACCESS_KEY_ID: str({ default: '' }),
  AWS_SECRET_ACCESS_KEY: str({ default: '' }),
  AWS_S3_BUCKET: str({ default: 'deevuh-media' }),
  AWS_REGION: str({ default: 'ap-south-1' }),

  MEILISEARCH_HOST: str({ default: 'http://localhost:7700' }),
  MEILISEARCH_API_KEY: str({ default: '' }),

  RESEND_API_KEY: str({ default: '' }),
  EMAIL_FROM: str({ default: 'hello@deevuh.com' }),

  FRONTEND_URL: url({ default: 'http://localhost:3000' }),

  GOOGLE_CLIENT_ID: str({ default: '' }),
  GOOGLE_CLIENT_SECRET: str({ default: '' }),
});

export default env;
