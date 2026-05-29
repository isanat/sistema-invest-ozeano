# ============================================================================
# ActionCash - Production Dockerfile for Coolify
# ============================================================================
# IMPORTANT: This project uses PostgreSQL ONLY. Never SQLite.
# The prisma schema is hardcoded to provider = "postgresql".
# Do NOT use prisma-provider.js — it causes issues during Docker builds
# when DATABASE_URL is not available as a build arg.
# ============================================================================

FROM node:20-alpine AS builder

WORKDIR /app

# Increase Node memory for large builds
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Override NODE_ENV to ensure devDependencies are installed
ARG NODE_ENV=development
ENV NODE_ENV=development

# Cache bust - increment this to force Docker cache invalidation
ARG CACHE_BUST=20260529v4

# Copy ALL source code FIRST
COPY . .

# Remove any stale .next cache
RUN rm -rf .next

# SAFETY CHECK: Verify schema.prisma has provider = "postgresql"
# This prevents accidental SQLite builds
RUN grep -q 'provider = "postgresql"' prisma/schema.prisma || \
    (echo "FATAL: prisma/schema.prisma must have provider=postgresql! Found:" && \
     grep 'provider =' prisma/schema.prisma && exit 1)

# Install ALL dependencies
RUN npm install

# Generate Prisma client (schema already has provider = "postgresql")
# Do NOT run prisma-provider.js — it can incorrectly switch to sqlite
RUN npx prisma generate

# Build the Next.js application
# IMPORTANT: Use --webpack to avoid Turbopack bugs
# IMPORTANT: Use --experimental-build-mode compile to skip prerendering
RUN npx next build --webpack --experimental-build-mode compile

# ============================================================================
# Production stage
# ============================================================================
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=2048"

# Install curl for health checks
RUN apk add --no-cache curl

# Copy files from builder
COPY --from=builder /app/package.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/public ./public
COPY --from=builder /app/start.sh ./start.sh
COPY --from=builder /app/cron-runner.sh ./cron-runner.sh
COPY --from=builder /app/next.config.ts ./next.config.ts

RUN chmod +x /app/start.sh /app/cron-runner.sh

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Health check - test a simple API endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3000/ || exit 1

CMD ["/app/start.sh"]
