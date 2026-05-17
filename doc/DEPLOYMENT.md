# Deevuh — Production Deployment Guide

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                     Cloudflare (DNS + CDN)                    │
│                   deevuh.com / api.deevuh.com                │
└──────────────┬────────────────────┬───────────────────────────┘
               │                    │
    ┌──────────▼──────────┐   ┌─────▼───────────────┐
    │   Vercel            │   │   Railway / Render   │
    │   Next.js Frontend  │   │   Express Backend    │
    │   (Static + SSR)    │   │   (Docker container) │
    └─────────────────────┘   └────┬──────────┬──────┘
                                   │          │
                          ┌────────▼──┐  ┌────▼─────────┐
                          │  Supabase │  │   Upstash    │
                          │  Postgres │  │   Redis      │
                          └───────────┘  └──────────────┘
```

---

## 1. Recommended Hosting

| Component | Service | Plan | Monthly Cost |
|-----------|---------|------|-------------|
| **Frontend** | Vercel | Pro ($20/mo) | ~$20 |
| **Backend** | Railway or Render | Starter ($5-7/mo) | ~$7 |
| **Database** | Supabase | Free → Pro ($25/mo) | $0-25 |
| **Redis** | Upstash | Free → Pay-per-use | $0-10 |
| **DNS/CDN** | Cloudflare | Free | $0 |
| **Images** | AWS S3 + CloudFront | Pay-per-use | ~$5 |
| **Email** | Resend | Free (3k/mo) | $0 |
| **Search** | Meilisearch Cloud | Free → $30/mo | $0-30 |
| **Monitoring** | Sentry (free tier) | Free (5k events) | $0 |
| **Total** | | | **~$32-97/mo** |

---

## 2. Pre-Deployment Checklist

### Environment Variables
- [ ] Copy `.env.production.template` → set all values in hosting dashboard
- [ ] Generate unique JWT secrets: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
- [ ] Set `NODE_ENV=production`
- [ ] Set `FRONTEND_URL=https://deevuh.com`
- [ ] Set `NEXT_PUBLIC_API_URL=https://api.deevuh.com/api`
- [ ] Set `NEXT_PUBLIC_SITE_URL=https://deevuh.com`
- [ ] Configure Razorpay **live** keys (not test)
- [ ] Configure Google OAuth redirect URI for production domain
- [ ] Verify `DATABASE_URL` uses `?sslmode=require`
- [ ] Verify `REDIS_URL` uses `rediss://` (TLS)

### Database
- [ ] Run `npx prisma migrate deploy` against production DB
- [ ] Verify seed data (categories, admin user) exists
- [ ] Enable Supabase connection pooling (PgBouncer)
- [ ] Set `statement_timeout` to 30s in Supabase dashboard

### Frontend
- [ ] Add `og-image.jpg` (1200×630) to `/public`
- [ ] Add `favicon.ico`, `apple-touch-icon.png` to `/public`
- [ ] Verify `NEXT_PUBLIC_API_URL` points to production backend
- [ ] Set `NEXT_PUBLIC_SITE_URL` to `https://deevuh.com`
- [ ] Deploy to Vercel: `vercel --prod`

### Backend
- [ ] Build Docker image: `docker build -t deevuh-api .`
- [ ] Deploy to Railway/Render with environment variables
- [ ] Verify `/health` returns `{ "status": "ok" }`
- [ ] Verify `/health/ready` returns all checks "ok"
- [ ] Verify CORS allows `https://deevuh.com`

### DNS
- [ ] Point `deevuh.com` → Vercel
- [ ] Point `api.deevuh.com` → Railway/Render
- [ ] Enable Cloudflare proxy (orange cloud)
- [ ] Enable "Always Use HTTPS" in Cloudflare

---

## 3. Deployment Steps

### Backend (Railway)

```bash
# 1. Install Railway CLI
npm install -g @railway/cli

# 2. Login and link project
railway login
railway init

# 3. Set environment variables
railway variables set NODE_ENV=production
railway variables set DATABASE_URL="postgresql://..."
# ... set all variables from .env.production.template

# 4. Deploy
railway up
```

### Backend (Render — alternative)

1. Connect GitHub repo → Render dashboard
2. Set root directory to `deevuh-backend`
3. Build command: `npm ci && npx prisma generate && npm run build`
4. Start command: `node dist/server.js`
5. Set all env vars in Render dashboard
6. Enable auto-deploy on push

### Frontend (Vercel)

```bash
# 1. Install Vercel CLI
npm install -g vercel

# 2. Deploy
cd deevuh-frontend
vercel --prod

# 3. Set env vars in Vercel dashboard
# NEXT_PUBLIC_API_URL=https://api.deevuh.com/api
# NEXT_PUBLIC_SITE_URL=https://deevuh.com
```

---

## 4. Database Migrations

```bash
# Preview migration changes
npx prisma migrate diff --from-schema-datamodel prisma/schema.prisma --to-schema-datasource prisma/schema.prisma

# Apply migrations to production
DATABASE_URL="postgresql://prod-url" npx prisma migrate deploy

# NEVER use `prisma migrate dev` on production
# NEVER use `prisma db push` on production
```

---

## 5. Backup & Recovery

### Database Backups
Supabase provides **automatic daily backups** on Pro plan. For additional safety:

```bash
# Manual backup (run from local machine)
pg_dump "postgresql://prod-url" --format=custom --file=backup_$(date +%Y%m%d).dump

# Restore from backup
pg_restore --clean --no-owner -d "postgresql://prod-url" backup_20260517.dump
```

### Backup Schedule
| What | Frequency | Retention | Method |
|------|-----------|-----------|--------|
| Database | Daily (auto) | 7 days | Supabase built-in |
| Database | Weekly (manual) | 30 days | pg_dump to S3 |
| Redis | N/A | N/A | Redis is cache-only, no backup needed |
| Product images | N/A | N/A | S3 has built-in durability (11 nines) |
| Environment vars | Per-change | Git history | Store in hosting dashboard |

### Disaster Recovery
1. **Database corruption**: Restore from latest Supabase backup → run `prisma migrate deploy`
2. **Backend down**: Railway auto-restarts. If persistent → redeploy from latest commit
3. **Frontend down**: Vercel auto-recovers. Redeploy: `vercel --prod`
4. **Redis down**: Application falls through to database (graceful degradation already implemented)
5. **DNS issues**: Cloudflare has 100% SLA on Enterprise. Free tier is 99.9%

---

## 6. Monitoring

### Health Checks
- **Load balancer**: `GET /health` — returns 200 if process alive
- **Readiness**: `GET /health/ready` — checks DB + Redis connectivity with latency
- Configure hosting health check URL to `/health`

### Uptime Monitoring (recommended)
- **Better Uptime** (free): Monitor `/health` every 60s, alert on Telegram/email
- **UptimeRobot** (free): Same functionality

### Error Tracking
- **Sentry** (free tier): Add `SENTRY_DSN` env var when ready
- Backend integration point: `src/middleware/errorHandler.ts` → add `Sentry.captureException(err)`
- Frontend integration point: `src/app/error.tsx` → add Sentry error boundary

### Logging
- Production logs output JSON for aggregation
- Railway/Render provide built-in log viewing
- For advanced: pipe to Datadog/CloudWatch via log drain

---

## 7. SSL & Security

| Header | Value | Purpose |
|--------|-------|---------|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` | Force HTTPS for 1 year |
| `X-Content-Type-Options` | `nosniff` | Prevent MIME sniffing |
| `X-DNS-Prefetch-Control` | `on` | Speed up external resource loading |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limit referrer leakage |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Disable unused APIs |
| `Content-Security-Policy` | Configured per-domain | Prevent XSS (Razorpay whitelisted) |

All headers are configured in:
- Backend: `src/app.ts` (Helmet)
- Frontend: `next.config.ts` (headers function)

---

## 8. Performance Optimization

### Backend
- Response compression (gzip/brotli via `compression` middleware)
- Redis caching for categories (1h) and products (15min)
- Database connection pooling (PgBouncer via Supabase)
- Rate limiting (100 req/min per IP)

### Frontend
- Next.js Image component with AVIF/WebP auto-conversion
- Static assets cached 1 year (immutable)
- Optimized images cached 30 days with stale-while-revalidate
- `compress: true` in Next.js config
- Static page prerendering where possible

### Images
- Store originals in S3 (`deevuh-media` bucket)
- Serve via CloudFront or Next.js Image optimization
- Responsive srcSet with breakpoints: 640, 750, 828, 1080, 1200, 1920

---

## 9. Scaling Strategy

### Phase 1: Launch (0-1000 orders/month)
- Single Railway instance ($7/mo)
- Supabase Free tier
- Upstash Free tier
- **Total: ~$27/mo**

### Phase 2: Growth (1000-10,000 orders/month)
- Railway with auto-scaling
- Supabase Pro ($25/mo)
- Upstash Pro ($10/mo)
- CloudFront CDN for images
- **Total: ~$62/mo**

### Phase 3: Scale (10,000+ orders/month)
- Multiple Railway instances behind load balancer
- Supabase Pro with read replicas
- Dedicated Redis
- Meilisearch Cloud
- **Total: ~$150-300/mo**
