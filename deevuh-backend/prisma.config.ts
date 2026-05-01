import path from 'node:path';
import { defineConfig, env } from 'prisma/config';
import * as dotenv from 'dotenv';
dotenv.config();

export default defineConfig({
  earlyAccess: false,
  schema: path.join(__dirname, 'prisma', 'schema.prisma'),
  datasource: {
    url: env('DATABASE_URL'),
  },
});
