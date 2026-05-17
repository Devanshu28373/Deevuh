import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import env from './config/env';
import { logger } from './config/logger';
import { errorHandler } from './middleware/errorHandler';
import { apiLimiter } from './middleware/rateLimiter';
import healthRoutes from './config/healthcheck';

// Route imports
import authRoutes from './modules/auth/auth.routes';
import productRoutes from './modules/products/products.routes';
import categoryRoutes from './modules/categories/categories.routes';
import cartRoutes from './modules/cart/cart.routes';
import wishlistRoutes from './modules/wishlist/wishlist.routes';
import orderRoutes from './modules/orders/orders.routes';
import reviewRoutes from './modules/reviews/reviews.routes';
import userRoutes from './modules/users/users.routes';
import paymentRoutes from './modules/payments/payments.routes';
import shippingRoutes from './modules/shipping/shipping.routes';
import promoRoutes from './modules/promotions/promotions.routes';
import loyaltyRoutes from './modules/loyalty/loyalty.routes';
import adminRoutes from './modules/admin/admin.routes';

const app = express();

// ─── Trust Proxy (required behind ALB/Nginx/Cloudflare) ───
if (env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// ─── Security Headers ───
app.use(helmet({
  contentSecurityPolicy: env.NODE_ENV === 'production' ? {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", 'https://checkout.razorpay.com'],
      frameSrc: ["'self'", 'https://api.razorpay.com'],
      connectSrc: ["'self'", env.FRONTEND_URL],
      imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
      styleSrc: ["'self'", "'unsafe-inline'"],
    },
  } : false,
  crossOriginEmbedderPolicy: false, // Required for external image loading
  hsts: env.NODE_ENV === 'production' ? {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  } : false,
}));

// ─── CORS (explicit origin whitelist) ───
const ALLOWED_ORIGINS = [
  env.FRONTEND_URL,
  // Add staging URL when needed
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (server-to-server, health checks)
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    logger.warn('CORS blocked request', { origin });
    return callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-session-id'],
  maxAge: 86400, // Cache preflight for 24h
}));

// ─── Compression & Parsing ───
app.use(compression());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(cookieParser());

// ─── Request Logging ───
if (env.NODE_ENV !== 'test') {
  if (env.NODE_ENV === 'production') {
    // JSON access log for production
    app.use(morgan(':method :url :status :response-time ms', {
      stream: { write: (msg: string) => logger.info(msg.trim(), { type: 'access' }) },
    }));
  } else {
    app.use(morgan('dev'));
  }
}

// ─── Rate Limiting ───
app.use('/api', apiLimiter);

// ─── Health Check Routes (no auth, no rate limit) ───
app.use('/', healthRoutes);

// ─── API Routes ───
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/users', userRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/shipping', shippingRoutes);
app.use('/api/promos', promoRoutes);
app.use('/api/loyalty', loyaltyRoutes);
app.use('/api/admin', adminRoutes);

// ─── 404 Handler ───
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: 'Route not found' },
  });
});

// ─── Global Error Handler ───
app.use(errorHandler);

export default app;
