# 🛍️ DEEVUH — Premium Women's Fashion E-Commerce

> Full-stack e-commerce platform built with Next.js 16, Express.js 5, Prisma 7, and TypeScript.

![License](https://img.shields.io/badge/license-MIT-blue)
![Node](https://img.shields.io/badge/node-20%2B-green)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)

---

## ✨ Features

### 🛒 Shopping Experience
- **Product Catalog** — Browsable PLP with category/size filters, 5 sort options, and paginated grid
- **Product Detail** — Image gallery, size/color selectors with stock awareness, tabbed info
- **Shopping Cart** — Quantity stepper, promo code validation, free shipping progress bar (₹999)
- **3-Step Checkout** — Address → Shipping → Payment (Razorpay / COD)
- **Order Confirmation** — Success page with full order breakdown

### 👤 User Account
- **Auth** — JWT with auto-refresh, Google OAuth, forgot/reset password
- **Dashboard** — Stats, recent orders, loyalty tier
- **Order Tracking** — Status timeline (Confirmed → Delivered)
- **Address Management** — CRUD with default selection
- **Wishlist** — Save and manage favorite products

### 🔧 Admin Dashboard
- **Overview** — Revenue, order count, customer count, low stock alerts
- **Order Management** — Filter by status, inline status updates
- **Product Management** — Full catalog with variant details and stock levels
- **Customer Directory** — Search by name/email, view order history + loyalty
- **Promo Management** — View codes, usage stats, active/expired status

### 💳 Commerce Engine
- **Razorpay** — Order creation, payment verification (HMAC-SHA256), idempotent webhooks
- **Shiprocket** — Serviceability checks, shipment creation, tracking
- **Promo Engine** — 6 validation rules, percentage/fixed/free-shipping discount types
- **Loyalty Points** — Earn on purchase, redeem at checkout, tier system (Bronze → Diamond)

---

## 🏗️ Architecture

```
deevuh/
├── doc/                     # Project documentation (PRD, TRD, App Flow)
├── images/                  # Brand assets and prototype images
├── index.html               # Vanilla HTML UI prototype
├── styles.css               # Vanilla CSS for UI prototype
│
├── deevuh-backend/          # Express.js 5 + TypeScript API
│   ├── prisma/              # Schema (16 models) + seed data
│   ├── src/
│   │   ├── config/          # env, database, redis
│   │   ├── middleware/       # auth, adminGuard, errorHandler, validate, rateLimiter
│   │   ├── modules/
│   │   │   ├── auth/        # JWT register/login/refresh/reset
│   │   │   ├── products/    # CRUD + filters + caching
│   │   │   ├── admin/       # Dashboard stats + management APIs
│   │   │   ├── payments/    # Razorpay integration
│   │   │   ├── shipping/    # Shiprocket integration
│   │   │   ├── promotions/  # Promo code engine
│   │   │   ├── loyalty/     # Points + tiers
│   │   │   └── ...          # cart, wishlist, orders, reviews, users, categories
│   │   └── shared/          # API response utilities
│   └── Dockerfile
│
├── deevuh-frontend/         # Next.js 16 (App Router)
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/      # login, register
│   │   │   ├── shop/        # PLP + PDP
│   │   │   ├── cart/        # Shopping cart
│   │   │   ├── checkout/    # 3-step checkout
│   │   │   ├── account/     # Dashboard, orders, addresses, wishlist
│   │   │   ├── admin/       # Admin dashboard (5 pages)
│   │   │   └── ...          # forgot-password, reset-password, order-confirmation
│   │   ├── components/      # Navbar, Footer, ProductCard
│   │   └── lib/             # API client, auth context
│   └── public/images/       # Brand assets
│
├── docker-compose.yml       # PostgreSQL 15 + Redis 7
└── .github/workflows/ci.yml # CI/CD pipeline
```

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** 20+
- **Docker Desktop** (for PostgreSQL + Redis)

### 1. View UI Prototype (Optional)
The root directory contains a vanilla HTML/CSS implementation of the UI design.
- Simply open `index.html` in your browser. No build steps or server required.

### 2. Start Infrastructure
```bash
docker compose up -d
```

### 3. Backend Setup
```bash
cd deevuh-backend
cp .env.example .env
# Edit .env with your keys (Razorpay, Shiprocket, JWT secrets)

npm install
npx prisma migrate dev --name init
npm run db:seed
npm run dev
# → API running at http://localhost:5000
```

### 4. Frontend Setup
```bash
cd deevuh-frontend
cp .env.example .env.local
# Ensure NEXT_PUBLIC_API_URL=http://localhost:5000/api

npm install
npm run dev
# → App running at http://localhost:3000
```

### 5. Default Admin Account
```
Email:    admin@deevuh.com
Password: Admin@123
```

---

## 🔑 Environment Variables

### Backend (`.env`)
| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | ✅ |
| `REDIS_URL` | Redis connection string | ✅ |
| `JWT_ACCESS_SECRET` | JWT signing secret | ✅ |
| `JWT_REFRESH_SECRET` | Refresh token secret | ✅ |
| `RAZORPAY_KEY_ID` | Razorpay API key | ✅ |
| `RAZORPAY_KEY_SECRET` | Razorpay secret | ✅ |
| `RAZORPAY_WEBHOOK_SECRET` | Webhook verification | ✅ |
| `SHIPROCKET_EMAIL` | Shiprocket login | ✅ |
| `SHIPROCKET_PASSWORD` | Shiprocket password | ✅ |
| `CORS_ORIGINS` | Allowed frontend origins | ✅ |
| `PORT` | Server port (default: 5000) | ❌ |

### Frontend (`.env.local`)
| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | ✅ |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Razorpay publishable key | ✅ |

---

## 📡 API Endpoints (42 total)

<details>
<summary>Click to expand full API reference</summary>

### Auth
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | ❌ | Create account |
| POST | `/api/auth/login` | ❌ | Get tokens |
| POST | `/api/auth/refresh` | ❌ | Refresh access token |
| POST | `/api/auth/forgot-password` | ❌ | Send reset email |
| POST | `/api/auth/reset-password` | ❌ | Reset with token |
| POST | `/api/auth/logout` | ✅ | Invalidate tokens |

### Products & Categories
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/products` | ❌ | List with filters |
| GET | `/api/products/:slug` | ❌ | Product detail |
| GET | `/api/categories` | ❌ | All categories |

### Cart & Wishlist
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/cart` | ❌* | Get cart |
| POST | `/api/cart/items` | ❌* | Add item |
| PUT | `/api/cart/items/:id` | ❌* | Update qty |
| DELETE | `/api/cart/items/:id` | ❌* | Remove item |
| POST | `/api/cart/merge` | ✅ | Guest→auth merge |
| GET | `/api/wishlist` | ✅ | List wishlist |
| POST | `/api/wishlist` | ✅ | Add to wishlist |
| DELETE | `/api/wishlist/:id` | ✅ | Remove |

### Orders
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/orders` | ✅ | Create order |
| GET | `/api/orders` | ✅ | List my orders |
| GET | `/api/orders/:id` | ✅ | Order detail |

### Payments & Shipping
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/payments/verify` | ✅ | Verify Razorpay |
| POST | `/api/webhooks/razorpay` | ❌ | Webhook |
| GET | `/api/shipping/serviceability/:pin` | ❌ | Check delivery |

### Admin (requires ADMIN role)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/admin/stats` | 🔒 | Dashboard stats |
| GET | `/api/admin/orders` | 🔒 | All orders |
| PUT | `/api/admin/orders/:id/status` | 🔒 | Update status |
| GET | `/api/admin/products` | 🔒 | All products |
| GET | `/api/admin/customers` | 🔒 | Customer list |
| GET | `/api/admin/promos` | 🔒 | Promo codes |

*❌\* = Uses `x-session-id` header for guest identification*

</details>

---

## 🎨 Design System

| Token | Value |
|-------|-------|
| Primary (Ruby) | `#98111E` |
| Background (Cream) | `#F5F0EB` |
| Heading Font | Playfair Display (serif) |
| Body Font | Inter (sans-serif) |
| Border Radius | 8px (sm), 12px (md), 16px (lg) |

---

## 📦 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, CSS Modules |
| Backend | Node.js 20, Express 5, TypeScript 6 |
| Database | PostgreSQL 15 (Prisma 7) |
| Cache | Redis 7 (ioredis) |
| Payments | Razorpay (test keys) |
| Shipping | Shiprocket API |
| Auth | JWT (access + refresh rotation) |
| CI/CD | GitHub Actions |
| Containers | Docker Compose |

---

## 📄 License

MIT © Deevuh
