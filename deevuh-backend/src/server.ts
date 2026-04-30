import env from './config/env';
import { connectDatabase } from './config/database';
import app from './app';

async function bootstrap(): Promise<void> {
  // 1. Connect database
  await connectDatabase();

  // 2. Redis connects automatically on import

  // 3. Start server
  app.listen(env.PORT, () => {
    console.log(`
╔══════════════════════════════════════╗
║        DEEVUH API SERVER             ║
║   Running on port ${env.PORT}              ║
║   Environment: ${env.NODE_ENV}        ║
╚══════════════════════════════════════╝
    `);
  });
}

bootstrap().catch((err) => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});
