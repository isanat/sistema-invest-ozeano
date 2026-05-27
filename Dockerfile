# Build: FORCE_REBUILD_ACTIONCASH
# ============================================================================
# ActionCash - PLATAFORMA ROI - Production Dockerfile
# ============================================================================

FROM node:20-alpine AS builder

WORKDIR /app

# Increase Node memory for large builds
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy prisma schema and generate client
COPY prisma ./prisma/
COPY scripts/prisma-provider.js ./scripts/prisma-provider.js

# Set build-time DATABASE_URL for Prisma (external URL)
ENV DATABASE_URL="postgres://actioncash:Rlb8TaB3hI6yz4s7egXqgBg5ieDO4jkzHmy209wzMGBGlccD2B3kABy9jtaH4Uen@164.68.126.14:5436/actioncash"

# Switch provider to PostgreSQL and generate Prisma client
RUN node scripts/prisma-provider.js && npx prisma generate

# Copy source code
COPY . .

# Clean any stale .next cache
RUN rm -rf .next

# Build the Next.js application
RUN npm run build 2>&1 && echo "BUILD SUCCESS" || (echo "BUILD FAILED" && exit 1)

# Verify build output exists
RUN ls -la .next/ && echo "Build output verified"

# ============================================================================
# Production stage
# ============================================================================
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=2048"

# Install curl for health checks
RUN apk add --no-cache curl

# Copy entire app from builder
COPY --from=builder /app ./

# Make start.sh executable
RUN chmod +x /app/start.sh

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["/app/start.sh"]
