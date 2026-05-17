# ─── Build Stage ───
FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies (cached layer)
COPY package*.json ./
RUN npm ci

# Copy source + generate Prisma client
COPY prisma ./prisma
RUN npx prisma generate

# Copy source and build
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ─── Production Stage ───
FROM node:20-alpine AS production
WORKDIR /app

# Security: run as non-root user
RUN addgroup -g 1001 -S deevuh && adduser -S deevuh -u 1001

# Install only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy built artifacts
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma

# Metadata
LABEL maintainer="team@deevuh.com"
LABEL org.opencontainers.image.source="https://github.com/deevuh/deevuh-backend"

# Environment defaults
ENV NODE_ENV=production
ENV PORT=5000

# Switch to non-root user
USER deevuh

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/health || exit 1

# Start server
CMD ["node", "dist/server.js"]
