# ============================================================================
# ActionCash - PLATAFORMA ROI - Production Dockerfile for Coolify
# ============================================================================

# Force cache invalidation
ARG CACHEBUST=1

FROM node:20-alpine AS builder

WORKDIR /app

# Increase Node memory for large builds
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Override NODE_ENV to ensure devDependencies are installed
# Coolify sets NODE_ENV=production as build arg which skips devDeps
ARG NODE_ENV=development
ENV NODE_ENV=development

# Copy ALL source code FIRST (including prisma/schema.prisma with provider = "postgresql")
COPY . .

# Remove any stale .next cache
RUN rm -rf .next

# Install ALL dependencies (including devDependencies needed for build)
RUN npm install

# Generate Prisma client
# prisma-provider.js will NOT change provider if DATABASE_URL is empty (keeps "postgresql")
# The schema already has provider = "postgresql" hardcoded
RUN node scripts/prisma-provider.js && npx prisma generate

# Build the Next.js application
# The package.json build script uses --webpack --experimental-build-mode compile
# which avoids Turbopack prerendering bugs
RUN npm run build

# Verify build output exists
RUN ls -la .next/ && echo "Build output verified"

# ============================================================================
# Production stage
# ============================================================================
FROM node:20-alpine AS runner

WORKDIR /app

# Set NODE_ENV to production for runtime
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=2048"

# Install curl for health checks
RUN apk add --no-cache curl

# Copy only necessary files from builder
COPY --from=builder /app/package.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/public ./public
COPY --from=builder /app/start.sh ./start.sh
COPY --from=builder /app/next.config.ts ./next.config.ts

# Make start.sh executable
RUN chmod +x /app/start.sh

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Health check for Coolify
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3000/ || exit 1

CMD ["/app/start.sh"]
